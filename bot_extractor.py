import time,os,warnings,json,uuid
from datetime import datetime,timezone
from pathlib import Path
import pandas as pd
import requests
from playwright.sync_api import sync_playwright

def required_env(name):
    value=os.getenv(name)
    if not value: raise RuntimeError(f"Missing required environment variable: {name}")
    return value
def utcnow(): return datetime.now(timezone.utc).isoformat()
USER=required_env("WALL_USER");PASS=required_env("WALL_PASS")
LOGIN_URL="http://cuupd003.chihuahua.visteon.com/4WallAdmin/Pages/Login.aspx"
OVERALL_URL="http://cuupd003.chihuahua.visteon.com/4WallAdmin/Inventory/Overall.aspx"
SUPABASE_URL=required_env("SUPABASE_URL").rstrip("/");SUPABASE_SERVICE_KEY=required_env("SUPABASE_SERVICE_KEY")
URL_RPC=f"{SUPABASE_URL}/rest/v1/rpc/reemplazar_escaneos"
HEADERS_SUPABASE={"apikey":SUPABASE_SERVICE_KEY,"Authorization":f"Bearer {SUPABASE_SERVICE_KEY}","Content-Type":"application/json"}
STATUS_PATH=Path(os.getenv("BOT_SNAPSHOT_STATUS_PATH",str(Path(__file__).with_name("bot_snapshot_status.json"))))

def write_status(payload):
    tmp=STATUS_PATH.with_suffix(".tmp");tmp.write_text(json.dumps(payload,ensure_ascii=False),encoding="utf-8");tmp.replace(STATUS_PATH)

def procesar_y_subir(ruta_excel,snapshot_id,extracted_at):
    print("[*] Leyendo archivo descargado de 4Wall...")
    try:
        with warnings.catch_warnings():
            warnings.simplefilter("ignore");df=pd.read_excel(ruta_excel)
        col_parte=next((c for c in df.columns if any(k in str(c).lower() for k in ["part","qad","numero"])),df.columns[0])
        col_cant=next((c for c in df.columns if any(k in str(c).lower() for k in ["quant","qty","cant"])),df.columns[1])
        col_area=next((c for c in df.columns if any(k in str(c).lower() for k in ["area","ubic","loc"])),df.columns[2])
        payload=[];invalid_qty=0
        for _,row in df.iterrows():
            parte=str(row[col_parte]).strip().upper();cantidad=pd.to_numeric(row[col_cant],errors="coerce");area=str(row[col_area]).strip().upper()
            if pd.isna(cantidad): invalid_qty+=1;continue
            if not parte or parte in ["NAN","NONE",""]: continue
            payload.append({"numero_parte":parte,"cantidad":int(cantidad),"area_escaneo":area})
        print(f"[+] Preparando corte con {len(payload)} registros vigentes...")
        res=requests.post(URL_RPC,json={"payload":payload},headers=HEADERS_SUPABASE,timeout=60)
        if res.status_code not in [200,204]: raise RuntimeError(f"Supabase RPC HTTP {res.status_code}")
        published_at=utcnow();write_status({"snapshotId":snapshot_id,"extractedAt":extracted_at,"publishedAt":published_at,"result":"PUBLISHED","rowCount":len(payload),"invalidQuantityRows":invalid_qty})
        print(f"[OK] Snapshot {snapshot_id} publicado con {len(payload)} registros.")
        return True
    except Exception as exc:
        write_status({"snapshotId":snapshot_id,"extractedAt":extracted_at,"publishedAt":None,"result":"FAILED","rowCount":None,"errorType":type(exc).__name__})
        print(f"[ERROR] El snapshot no se publicó: {type(exc).__name__}")
        return False
    finally:
        if os.path.exists(ruta_excel): os.remove(ruta_excel)

def run_bot():
    print("[*] Iniciando Bot Extractor Visteon (Playwright)...")
    with sync_playwright() as p:
        browser=p.chromium.launch(channel="msedge",headless=False);context=browser.new_context(accept_downloads=True);page=context.new_page()
        print("[*] Iniciando sesión en 4Wall...");page.goto(LOGIN_URL);page.locator("#txtUser").fill(USER);page.locator("#txtPassword").fill(PASS);page.locator("#btnLogin").click();page.wait_for_load_state("networkidle");page.wait_for_timeout(3000)
        print("[+] Sesión iniciada. Monitoreando cortes cada 3 minutos...")
        while True:
            snapshot_id=str(uuid.uuid4());extracted_at=None
            try:
                page.goto(OVERALL_URL);page.wait_for_load_state("networkidle");page.wait_for_timeout(2000);print("[*] Solicitando exportación de inventario...")
                boton=page.get_by_text("Exportar a Excel",exact=False)
                if boton.count()>0: boton.first.click()
                else: page.evaluate("__doPostBack('ctl00$cphMaster$ExportExcel', '')")
                enlace=page.locator("#ctl00_cphMaster_mdlExcelFile_C_lnkFile");enlace.wait_for(state="visible",timeout=35000)
                with page.expect_download(timeout=20000) as info: enlace.click()
                download=info.value;ruta=os.path.join(os.getcwd(),"descarga_4wall.xlsx");download.save_as(ruta);extracted_at=utcnow()
                procesar_y_subir(ruta,snapshot_id,extracted_at);print("[zZz] Ciclo finalizado. Esperando 3 minutos...");time.sleep(180)
            except KeyboardInterrupt:
                print("\n[!] Bot detenido manualmente.");break
            except Exception as exc:
                write_status({"snapshotId":snapshot_id,"extractedAt":extracted_at,"publishedAt":None,"result":"FAILED","rowCount":None,"errorType":type(exc).__name__})
                print(f"[WARN] Ciclo falló: {type(exc).__name__}. Reintentando en 60s...");time.sleep(60)
        browser.close()
if __name__=="__main__": run_bot()
