"""Minimal HTTPS transport. Access/refresh tokens are never logged or sent to 4Wall."""
import base64
import json
import threading
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

PROJECT_HOST = 'uukhwkywmnarcfruerpp.supabase.co'
SAFE_CODES = {'LOGIN_REQUIRED', 'OPERATOR_REQUIRED', 'ADMIN_REQUIRED', 'RUNNER_IDENTITY_REQUIRED', 'RUNNER_NOT_REGISTERED', 'RUNNER_SESSION_EXPIRED', 'RUNNER_ALREADY_ONLINE', 'ACTIVE_RUN', 'RUN_LEASE_EXPIRED', 'RUN_OWNER_REQUIRED', 'INVALID_BATCH', 'HASH_MISMATCH', 'IDENTITY_MISMATCH', 'UNSAFE_RAW_ROW', 'IDEMPOTENCY_CONFLICT'}


class RemoteError(RuntimeError):
    def __init__(self, code='NETWORK_ERROR', status=None):
        super().__init__(code)
        self.code, self.status = code, status


class TokenStore:
    """Only the renewable MACHINE refresh token is persisted, protected by Windows DPAPI."""
    def __init__(self, path):
        self.path = Path(path)

    @staticmethod
    def protect(data, decrypt=False):
        import ctypes
        from ctypes import wintypes
        if not hasattr(ctypes, 'windll'):
            raise RuntimeError('Windows DPAPI is required for persistent machine enrollment')

        class Blob(ctypes.Structure):
            _fields_ = [('size', wintypes.DWORD), ('data', ctypes.POINTER(ctypes.c_byte))]

        buffer = ctypes.create_string_buffer(data)
        source = Blob(len(data), ctypes.cast(buffer, ctypes.POINTER(ctypes.c_byte)))
        output = Blob()
        crypt = ctypes.windll.crypt32.CryptUnprotectData if decrypt else ctypes.windll.crypt32.CryptProtectData
        if not crypt(ctypes.byref(source), None, None, None, None, 1, ctypes.byref(output)):
            raise RuntimeError('DPAPI_ERROR')
        try:
            return ctypes.string_at(output.data, output.size)
        finally:
            ctypes.windll.kernel32.LocalFree(output.data)

    def load(self):
        return self.protect(self.path.read_bytes(), decrypt=True).decode('utf-8') if self.path.exists() else None

    def save(self, refresh_token):
        encrypted = self.protect(refresh_token.encode('utf-8'))
        self.path.parent.mkdir(parents=True, exist_ok=True)
        temporary = self.path.with_suffix('.tmp')
        temporary.write_bytes(encrypted)
        temporary.replace(self.path)

    def clear(self):
        self.path.unlink(missing_ok=True)


class SupabaseRunnerClient:
    def __init__(self, url, public_key, runner_id, token_store=None, opener=None, clock=time.time):
        parsed = urllib.parse.urlparse(url)
        if parsed.scheme != 'https' or parsed.hostname != PROJECT_HOST or parsed.path not in ('', '/') or parsed.username or parsed.query or parsed.fragment:
            raise ValueError('WRONG_SUPABASE_PROJECT')
        if not public_key or not public_key.startswith(('sb_publishable_', 'eyJ')):
            raise ValueError('PUBLIC_KEY_REQUIRED')
        if public_key.startswith('eyJ'):
            try:
                part = public_key.split('.')[1]
                claims = json.loads(base64.urlsafe_b64decode(part + '=' * (-len(part) % 4)))
                if claims.get('role') != 'anon':
                    raise ValueError('PUBLIC_KEY_REQUIRED')
            except (IndexError, ValueError, json.JSONDecodeError) as exc:
                raise ValueError('PUBLIC_KEY_REQUIRED') from exc
        self.url, self.public_key, self.runner_id = url.rstrip('/'), public_key, runner_id
        self.token_store, self.opener, self.clock = token_store, opener or urllib.request.urlopen, clock
        self.access_token = self.refresh_token = None
        self.expires_at = 0
        self.auth_lock = threading.RLock()

    def _request(self, path, data, token=None):
        headers = {'apikey': self.public_key, 'Content-Type': 'application/json'}
        if token:
            headers['Authorization'] = 'Bearer ' + token
        request = urllib.request.Request(self.url + path, data=json.dumps(data, ensure_ascii=False, separators=(',', ':')).encode('utf-8'), headers=headers, method='POST')
        try:
            with self.opener(request, timeout=45) as response:
                raw = response.read(8_000_001)
                if len(raw) > 8_000_000:
                    raise RemoteError('RESPONSE_LIMIT')
                return json.loads(raw)
        except urllib.error.HTTPError as exc:
            try:
                message = json.loads(exc.read(4096)).get('message', '')
            except (ValueError, AttributeError):
                message = ''
            raise RemoteError(message if message in SAFE_CODES else 'REMOTE_ERROR', exc.code) from None
        except (urllib.error.URLError, TimeoutError, ValueError) as exc:
            raise RemoteError('NETWORK_ERROR') from None

    def _accept_session(self, session):
        self.access_token, self.refresh_token = session['access_token'], session['refresh_token']
        self.expires_at = session.get('expires_at', self.clock() + session.get('expires_in', 3600))
        if self.token_store:
            self.token_store.save(self.refresh_token)

    def sign_in(self, email, password):
        with self.auth_lock:
            self._accept_session(self._request('/auth/v1/token?grant_type=password', {'email': email, 'password': password}))

    def restore(self):
        if not self.token_store:
            return False
        saved = self.token_store.load()
        if not saved:
            return False
        try:
            with self.auth_lock:
                self._accept_session(self._request('/auth/v1/token?grant_type=refresh_token', {'refresh_token': saved}))
            return True
        except RemoteError as exc:
            if exc.status in (400, 401, 403):
                self.token_store.clear()
            raise

    def token(self):
        with self.auth_lock:
            if not self.access_token:
                raise RemoteError('RUNNER_LOGIN_REQUIRED')
            if self.clock() >= self.expires_at - 90:
                self._accept_session(self._request('/auth/v1/token?grant_type=refresh_token', {'refresh_token': self.refresh_token}))
            return self.access_token

    def api(self, operation, **payload):
        payload.setdefault('runner_id', self.runner_id)
        return self._request('/rest/v1/rpc/bot_api', {'op': operation, 'p': payload}, self.token())

    def read_manifest(self):
        # Read only identity/hash state, and retry if a concurrent manual publication changes it.
        for _ in range(2):
            rows, offset, generation = [], 0, None
            while True:
                page = self.api('manifest', offset=offset)
                if generation is None:
                    generation = page['generation']
                if generation != page['generation']:
                    break
                chunk = page['records']
                rows.extend(chunk)
                if len(chunk) < 2000:
                    return generation, rows
                offset += 2000
            # A generation mismatch discards every page, never mixes revisions.
        raise RemoteError('UNSTABLE_GENERATION')
