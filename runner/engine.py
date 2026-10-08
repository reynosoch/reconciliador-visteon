"""Single-run scheduler, server leases, finite retries and atomic batch publication."""
import threading
import time
import uuid
from datetime import datetime, timezone
from .client import RemoteError
from .source import SourceError
from .sync import ValidationError, prepare_snapshot, build_batches
from .realtime import RealtimeWakeup
from .version import VERSION


def utc_now():
    return datetime.now(timezone.utc).isoformat()


class RunnerEngine:
    def __init__(self, client, source, on_status=None, *, wakeup=None, clock=time.time):
        self.client, self.source, self.clock = client, source, clock
        self.on_status = on_status or (lambda value: None)
        self.session_id = str(uuid.uuid4())
        self.stopped, self.wake = threading.Event(), threading.Event()
        self.close_requested = False
        self.active = False
        self.state = 'STARTING'
        self.status_lock = threading.Lock()
        self.details = {'version': VERSION, 'state': 'STARTING', 'last_run': None}
        self.generation, self.manifest = None, []
        self.realtime = wakeup or RealtimeWakeup(client, self.wake, self.stopped)

    def status(self):
        with self.status_lock:
            return dict(self.details)

    def _status(self, **values):
        with self.status_lock:
            self.details.update(values)
            current = dict(self.details)
        self.on_status(current)

    def request_close(self):
        self.close_requested = True
        self.wake.set()

    def _heartbeat_loop(self):
        while not self.stopped.is_set():
            try:
                self.client.api('heartbeat', session_id=self.session_id, state=self.state)
                self._status(heartbeat_at=utc_now(), connection='ONLINE')
            except RemoteError as exc:
                self._status(connection='OFFLINE', error=exc.code)
                if exc.code in ('RUNNER_SESSION_EXPIRED', 'RUNNER_IDENTITY_REQUIRED'):
                    self.stopped.set()
            self.stopped.wait(15)

    def _current(self, generation):
        if self.generation != generation:
            self.generation, self.manifest = self.client.read_manifest()

    def execute(self, trigger, control, command_id=None):
        if self.active:
            raise RuntimeError('PARALLEL_RUN_REFUSED')
        run_id = str(uuid.uuid4())
        run = self.client.api('begin', session_id=self.session_id, run_id=run_id, trigger=trigger, **({'command_id': command_id} if command_id else {}))
        if not run.get('lease_token'):
            return run
        base = {'run_id': run_id, 'lease_token': run['lease_token']}
        self.active, self.state = True, 'RUNNING'
        self._status(state=self.state, active_run_id=run_id, attempt=1, error=None)
        try:
            for attempt in range(1, 5):
                if self.stopped.is_set():
                    self.state = 'ERROR'
                    return {'status': 'UNCONFIRMED', 'id': run_id}
                try:
                    export = self.source.extract()
                    refreshed = self.client.api('control', session_id=self.session_id)
                    config = refreshed['source']
                    self._current(config['generation'])
                    snapshot = prepare_snapshot(export['rows'], previous_count=config['row_count'], min_row_ratio=float(config['min_row_ratio']), max_rows=config['max_rows'], max_quantity=float(config['max_quantity']), date_order=config.get('date_order'), export_complete=export.get('export_complete', False))
                    # Generation changes between diff and commit are recoverable without reinterpreting rows.
                    for revision_attempt in range(2):
                        self.client.api('reset_stage', **base)
                        for batch in build_batches(snapshot, self.manifest):
                            self.client.api('stage', **base, rows=batch)
                        result = self.client.api('publish', **base, expected_generation=self.generation, rows_seen=snapshot['rows_seen'], snapshot_hash=snapshot['snapshot_hash'], export_complete=export['export_complete'], extracted_at=export['extracted_at'])
                        if result.get('status') != 'STALE_GENERATION':
                            break
                        self.generation, self.manifest = self.client.read_manifest()
                    if result.get('status') == 'STALE_GENERATION':
                        raise RemoteError('PUBLICATION_ERROR')
                    if result.get('status') not in ('SUCCESS', 'REJECTED'):
                        raise RemoteError('PUBLICATION_ERROR')
                    if result['status'] == 'SUCCESS':
                        # Refresh narrow fingerprints at most once after publication, never on 5s polls.
                        self.generation, self.manifest = self.client.read_manifest()
                    self._status(last_run={key: result.get(key) for key in ('id', 'status', 'finished_at', 'rows_seen', 'rows_inserted', 'rows_updated', 'rows_unchanged', 'rows_removed', 'error_summary')})
                    self.state = 'IDLE' if result['status'] == 'SUCCESS' else 'ERROR'
                    return result
                except (SourceError, ValidationError, RemoteError) as exc:
                    try:
                        receipt = self.client.api('receipt', **base)
                        if receipt.get('status') in ('SUCCESS', 'REJECTED', 'FAILED'):
                            self.state = 'IDLE' if receipt['status'] == 'SUCCESS' else 'ERROR'
                            self._status(last_run={key: receipt.get(key) for key in ('id', 'status', 'finished_at', 'rows_seen', 'rows_inserted', 'rows_updated', 'rows_unchanged', 'rows_removed')})
                            self.generation = None
                            return receipt
                    except RemoteError:
                        pass
                    code = exc.code if isinstance(exc, SourceError) else 'AMBIGUOUS_IDENTITY' if isinstance(exc, ValidationError) and 'AMBIGUOUS' in exc.code else 'QUALITY_GATE' if isinstance(exc, ValidationError) else 'NETWORK_ERROR'
                    step = getattr(exc, 'step', 'validate' if isinstance(exc, ValidationError) else 'publish')
                    terminal = attempt == 4 or isinstance(exc, ValidationError) or code == 'PARSER_ERROR'
                    try:
                        failed = self.client.api('fail' if terminal else 'retry', **base, error_type=code, step=step)
                    except RemoteError:
                        # Lost publication acknowledgement must never mark a committed SUCCESS as FAILED.
                        # The backend receipt/lease is authoritative; stale cleanup closes an unacknowledged run.
                        self.state = 'ERROR'
                        self._status(state='ERROR', error='NETWORK_ERROR')
                        return {'status': 'UNCONFIRMED', 'id': run_id}
                    self._status(attempt=attempt, error=code, next_attempt_at=failed.get('next_attempt_at'), last_run={'id': run_id, 'status': failed['status']})
                    if terminal or failed['status'] not in ('RUNNING', 'RETRYING'):
                        self.state = 'ERROR'
                        return failed
                    self.state = 'RETRYING'
                    self._status(state=self.state)
                    deadline = datetime.fromisoformat(failed['next_attempt_at'].replace('Z', '+00:00')).timestamp()
                    # Graceful close finishes the active run, including its bounded retry policy.
                    while self.clock() < deadline and not self.stopped.is_set():
                        self.stopped.wait(min(5, max(0, deadline - self.clock())))
                    self.state = 'RUNNING'
                    self._status(state=self.state, attempt=attempt + 1)
        finally:
            self.active = False
            self._status(state=self.state, active_run_id=None)

    def run(self, login_event=None):
        heartbeat = None
        try:
            control = self.client.api('start', session_id=self.session_id, version=VERSION)
            # Claim the machine before launching Edge, so a second executable cannot open parallel Playwright.
            heartbeat = threading.Thread(target=self._heartbeat_loop, daemon=True, name='4wall-heartbeat')
            heartbeat.start()
            self.source.login()  # Invalid 4Wall credentials never begin extraction or publication.
            self._current(control['source']['generation'])
            self.state = 'PAUSED' if control['runner']['paused'] else 'IDLE'
            self._status(state=self.state, login='VALID')
            if login_event:
                login_event.set()
            self.realtime.start()
            if control['runner']['enabled'] and not control['runner']['paused'] and not self.close_requested:
                self.execute('AUTO_START', control)
            while not self.stopped.is_set() and not self.close_requested:
                try:
                    control = self.client.api('control', session_id=self.session_id)
                    runner = control['runner']
                    self._status(next_run_at=runner['next_run_at'], paused=runner['paused'])
                    if control['pending']:
                        self.execute('COMMAND', control, control['pending'][0]['id'])
                    elif runner['enabled'] and not runner['paused'] and runner['next_run_at'] and self.clock() >= datetime.fromisoformat(runner['next_run_at'].replace('Z', '+00:00')).timestamp():
                        self.execute('SCHEDULE', control)
                    else:
                        self.state = 'PAUSED' if runner['paused'] else 'ERROR' if self.state == 'ERROR' else 'IDLE'
                        self._status(state=self.state)
                except RemoteError as exc:
                    self._status(connection='OFFLINE', error=exc.code)
                    if exc.code in ('RUNNER_SESSION_EXPIRED', 'RUNNER_IDENTITY_REQUIRED', 'RUNNER_ALREADY_ONLINE'):
                        break
                self.wake.wait(5)
                self.wake.clear()
        except (SourceError, RemoteError) as exc:
            self.state = 'ERROR'
            self._status(state=self.state, login='FAILED', error=exc.code)
            if login_event:
                login_event.set()
        except Exception:
            self.state = 'ERROR'
            self._status(state=self.state, login='FAILED', error='RUNNER_ERROR')
            if login_event:
                login_event.set()
        finally:
            self.stopped.set()
            try:
                self.source.close()
            except Exception:
                pass
            try:
                self.realtime.close()
                if heartbeat:
                    heartbeat.join(timeout=5)
                    self.client.api('heartbeat', session_id=self.session_id, state='OFFLINE')
            except Exception:
                pass
            self._status(state='OFFLINE')
