"""Realtime is only a wake-up hint. HTTPS control polling remains authoritative every 5 s."""
import json
import threading
import time
from urllib.parse import quote


class RealtimeWakeup:
    def __init__(self, client, event, stopped):
        self.client, self.event, self.stopped = client, event, stopped
        self.socket = None

    def start(self):
        threading.Thread(target=self._loop, daemon=True, name='4wall-realtime').start()

    def _loop(self):
        try:
            import websocket
        except ImportError:
            return  # Polling is fully functional without the optional fast path.
        while not self.stopped.is_set():
            try:
                url = self.client.url.replace('https://', 'wss://') + '/realtime/v1/websocket?apikey=' + quote(self.client.public_key) + '&vsn=1.0.0'
                socket = self.socket = websocket.create_connection(url, timeout=5, enable_multithread=True)
                topic = 'realtime:runner-' + self.client.runner_id
                token = self.client.token()
                socket.send(json.dumps({'topic': topic, 'event': 'phx_join', 'ref': '1', 'payload': {'config': {'broadcast': {'self': False}, 'presence': {'enabled': False}, 'postgres_changes': [{'event': '*', 'schema': 'public', 'table': 'bot_commands', 'filter': 'runner_id=eq.' + self.client.runner_id}]}, 'access_token': token}}))
                last_ping = time.monotonic()
                while not self.stopped.is_set():
                    try:
                        message = json.loads(socket.recv())
                        if message.get('event') == 'postgres_changes':
                            self.event.set()
                    except websocket.WebSocketTimeoutException:
                        pass
                    if time.monotonic() - last_ping >= 25:
                        socket.send(json.dumps({'topic': 'phoenix', 'event': 'heartbeat', 'ref': str(time.monotonic()), 'payload': {}}))
                        renewed = self.client.token()
                        if renewed != token:
                            token = renewed
                            socket.send(json.dumps({'topic': topic, 'event': 'access_token', 'ref': 'token', 'payload': {'access_token': token}}))
                        last_ping = time.monotonic()
            except Exception:
                # No socket URL/JWT/body/exception logging.
                self.stopped.wait(30)
            finally:
                if self.socket:
                    try:
                        self.socket.close()
                    except Exception:
                        pass
                    self.socket = None

    def close(self):
        if self.socket:
            self.socket.close()
