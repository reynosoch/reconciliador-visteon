"""Puente local para iniciar bot_extractor.py sin exponer la contraseña al frontend."""
import hmac,json,os,subprocess,sys
from http.server import BaseHTTPRequestHandler,ThreadingHTTPServer
from pathlib import Path
HOST=os.getenv("BOT_CONTROL_HOST","127.0.0.1")
PORT=int(os.getenv("BOT_CONTROL_PORT","8765"))
PASSWORD=os.getenv("BOT_CONTROL_PASSWORD")
ALLOWED_ORIGIN=os.getenv("BOT_CONTROL_ORIGIN","https://reynosoch.github.io")
BOT_PATH=Path(__file__).with_name("bot_extractor.py")
process=None
if not PASSWORD: raise RuntimeError("Missing BOT_CONTROL_PASSWORD")
class Handler(BaseHTTPRequestHandler):
 def headers(self,status=200):
  self.send_response(status);self.send_header("Content-Type","application/json; charset=utf-8");self.send_header("Access-Control-Allow-Origin",ALLOWED_ORIGIN);self.send_header("Access-Control-Allow-Headers","Content-Type");self.send_header("Access-Control-Allow-Methods","POST, OPTIONS");self.end_headers()
 def do_OPTIONS(self): self.headers(204)
 def do_POST(self):
  global process
  if self.path!="/bot/start": self.headers(404);self.wfile.write(b'{"message":"Ruta no encontrada."}');return
  try:
   n=int(self.headers.get("Content-Length","0"));data=json.loads(self.rfile.read(n) or b"{}")
  except Exception: self.headers(400);self.wfile.write(b'{"message":"Solicitud invalida."}');return
  if not hmac.compare_digest(str(data.get("password","")),PASSWORD): self.headers(401);self.wfile.write(b'{"message":"Autorizacion rechazada."}');return
  if process and process.poll() is None: self.headers(200);self.wfile.write(b'{"message":"El bot ya esta en ejecucion."}');return
  process=subprocess.Popen([sys.executable,str(BOT_PATH)],cwd=str(BOT_PATH.parent))
  self.headers(200);self.wfile.write(json.dumps({"message":"Bot 4Wall iniciado.","pid":process.pid}).encode())
if __name__=="__main__":
 print(f"Bot control listening on http://{HOST}:{PORT}");ThreadingHTTPServer((HOST,PORT),Handler).serve_forever()
