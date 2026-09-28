"""Control local del extractor. No expone credenciales ni confunde PID con snapshot publicado."""
import hmac,json,os,subprocess,sys,threading
from datetime import datetime,timezone
from http.server import BaseHTTPRequestHandler,ThreadingHTTPServer
from pathlib import Path

HOST=os.getenv("BOT_CONTROL_HOST","127.0.0.1")
PORT=int(os.getenv("BOT_CONTROL_PORT","8765"))
PASSWORD=os.getenv("BOT_CONTROL_PASSWORD")
ALLOWED_ORIGIN=os.getenv("BOT_CONTROL_ORIGIN","https://reynosoch.github.io")
BOT_PATH=Path(os.getenv("BOT_EXTRACTOR_PATH",str(Path(__file__).with_name("bot_extractor.py"))))
STATUS_PATH=Path(os.getenv("BOT_SNAPSHOT_STATUS_PATH",str(Path(__file__).with_name("bot_snapshot_status.json"))))
if not PASSWORD: raise RuntimeError("Missing BOT_CONTROL_PASSWORD")
if HOST not in {"127.0.0.1","localhost","::1"} and os.getenv("BOT_CONTROL_ALLOW_INSECURE")!="1":
    raise RuntimeError("Refusing non-loopback HTTP control. Put this service behind an authenticated HTTPS reverse proxy or explicitly opt in for a trusted private network.")

def utcnow(): return datetime.now(timezone.utc).isoformat()
def read_snapshot():
    try:
        data=json.loads(STATUS_PATH.read_text(encoding="utf-8"))
        return {k:data.get(k) for k in ("snapshotId","extractedAt","publishedAt","result","rowCount")}
    except Exception:
        return None

class BotController:
    def __init__(self,bot_path=BOT_PATH):
        self.bot_path=Path(bot_path);self.lock=threading.Lock();self.process=None;self.last_request=None;self.last_launch_error=None
    def status(self):
        with self.lock:
            if self.process and self.process.poll() is None: state="running";pid=self.process.pid
            elif self.process: state="stopped";pid=None
            else: state="idle";pid=None
            return {"processState":state,"pid":pid,"lastRequest":self.last_request,"lastLaunchError":self.last_launch_error,"lastSnapshot":read_snapshot()}
    def start(self):
        with self.lock:
            self.last_request=utcnow()
            if self.process and self.process.poll() is None:return {"state":"already_running","processState":"running","pid":self.process.pid,"lastSnapshot":read_snapshot()}
            if not self.bot_path.is_file():
                self.last_launch_error="Extractor no encontrado.";return {"state":"launch_failed","processState":"idle","message":"Extractor no encontrado.","lastSnapshot":read_snapshot()}
            try:
                self.process=subprocess.Popen([sys.executable,str(self.bot_path)],cwd=str(self.bot_path.parent))
                self.last_launch_error=None
                return {"state":"accepted","processState":"running","pid":self.process.pid,"message":"Solicitud de arranque aceptada; publicación aún no confirmada.","lastSnapshot":read_snapshot()}
            except Exception as exc:
                self.last_launch_error=type(exc).__name__
                return {"state":"launch_failed","processState":"idle","message":"No se pudo lanzar el extractor.","lastSnapshot":read_snapshot()}

controller=BotController()
class Handler(BaseHTTPRequestHandler):
    def log_message(self,format,*args): return
    def _origin_ok(self):
        origin=self.headers.get("Origin")
        return not origin or hmac.compare_digest(origin,ALLOWED_ORIGIN)
    def send_json(self,status,payload):
        body=json.dumps(payload).encode("utf-8");self.send_response(status);self.send_header("Content-Type","application/json; charset=utf-8");self.send_header("Content-Length",str(len(body)));self.send_header("Access-Control-Allow-Origin",ALLOWED_ORIGIN);self.send_header("Vary","Origin");self.send_header("Access-Control-Allow-Headers","Content-Type");self.send_header("Access-Control-Allow-Methods","POST, OPTIONS");self.end_headers();self.wfile.write(body)
    def do_OPTIONS(self):
        if not self._origin_ok(): self.send_json(403,{"message":"Origen no autorizado."});return
        self.send_json(204,{})
    def _body(self):
        try:n=int(self.headers.get("Content-Length","0"));return json.loads(self.rfile.read(n) or b"{}")
        except Exception:return None
    def do_POST(self):
        if not self._origin_ok():self.send_json(403,{"message":"Origen no autorizado."});return
        if self.path not in {"/bot/start","/bot/status"}:self.send_json(404,{"message":"Ruta no encontrada."});return
        data=self._body()
        if data is None:self.send_json(400,{"message":"Solicitud inválida."});return
        if not hmac.compare_digest(str(data.get("password","")),PASSWORD):self.send_json(401,{"message":"Autorización rechazada."});return
        if self.path=="/bot/status":self.send_json(200,controller.status());return
        result=controller.start();self.send_json(202 if result["state"]=="accepted" else 200 if result["state"]=="already_running" else 500,result)

def serve():
    print(f"Bot control listening on http://{HOST}:{PORT}")
    ThreadingHTTPServer((HOST,PORT),Handler).serve_forever()
if __name__=="__main__": serve()
