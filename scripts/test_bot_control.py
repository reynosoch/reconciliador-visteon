import importlib.util,json,os,tempfile,threading,time,urllib.request
from pathlib import Path
with tempfile.TemporaryDirectory() as tmp:
    fake=Path(tmp)/"fake_extractor.py";fake.write_text("import time\ntime.sleep(2)\n",encoding="utf-8")
    os.environ["BOT_CONTROL_PASSWORD"]="test-secret";os.environ["BOT_CONTROL_ORIGIN"]="http://test.local";os.environ["BOT_EXTRACTOR_PATH"]=str(fake);os.environ["BOT_SNAPSHOT_STATUS_PATH"]=str(Path(tmp)/"status.json")
    spec=importlib.util.spec_from_file_location("bot_control_server",Path(__file__).parents[1]/"bot_control_server.py");mod=importlib.util.module_from_spec(spec);spec.loader.exec_module(mod)
    server=mod.ThreadingHTTPServer(("127.0.0.1",0),mod.Handler);threading.Thread(target=server.serve_forever,daemon=True).start();port=server.server_address[1]
    def post(path):
        req=urllib.request.Request(f"http://127.0.0.1:{port}{path}",data=json.dumps({"password":"test-secret"}).encode(),headers={"Content-Type":"application/json","Origin":"http://test.local"},method="POST")
        with urllib.request.urlopen(req,timeout=3) as res:return res.status,json.loads(res.read())
    results=[]
    threads=[threading.Thread(target=lambda:results.append(post("/bot/start"))) for _ in range(2)]
    [t.start() for t in threads];[t.join() for t in threads]
    states=sorted(x[1]["state"] for x in results)
    assert states==["accepted","already_running"],states
    status,data=post("/bot/status");assert status==200 and data["processState"]=="running"
    assert data.get("lastSnapshot") is None
    mod.controller.process.terminate();mod.controller.process.wait(timeout=3);server.shutdown()
print("Bot controller verification OK")
