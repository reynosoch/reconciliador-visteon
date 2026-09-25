import time
import os
import warnings
import pandas as pd
import requests
from playwright.sync_api import sync_playwright
# Only the bot host may hold write credentials. Never ship these in Vite.
def required_env(name):
    value = os.getenv(name)
    if not value:
        raise RuntimeError(f"Missing required environment variable: {name}")
    return value

USER = required_env("WALL_USER")
PASS = required_env("WALL_PASS")
LOGIN_URL = "http://cuupd003.chihuahua.visteon.com/4WallAdmin/Pages/Login.aspx"
OVERALL_URL = "http://cuupd003.chihuahua.visteon.com/4WallAdmin/Inventory/Overall.aspx"
SUPABASE_URL = required_env("SUPABASE_URL").rstrip("/")
SUPABASE_SERVICE_KEY = required_env("SUPABASE_SERVICE_KEY")
URL_RPC = f"{SUPABASE_URL}/rest/v1/rpc/reemplazar_escaneos"
HEADERS_SUPABASE = {
    "apikey": SUPABASE_SERVICE_KEY,
    "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
    "Content-Type": "application/json",
}

def procesar_y_subir(ruta_excel):
   print("[*] Leyendo archivo descargado de 4Wall...")
   try:
       with warnings.catch_warnings():
           warnings.simplefilter("ignore")
           df = pd.read_excel(ruta_excel)
       # Detectar columnas automáticamente
       col_parte = next((c for c in df.columns if any(k in str(c).lower() for k in ['part', 'qad', 'numero'])), df.columns[0])
       col_cant = next((c for c in df.columns if any(k in str(c).lower() for k in ['quant', 'qty', 'cant'])), df.columns[1])
       col_area = next((c for c in df.columns if any(k in str(c).lower() for k in ['area', 'ubic', 'loc'])), df.columns[2])
       # Sanitización de registros crudos
       payload = []
       for _, row in df.iterrows():
           parte = str(row[col_parte]).strip().upper()
           cantidad = pd.to_numeric(row[col_cant], errors='coerce')
           area = str(row[col_area]).strip().upper()
           if pd.isna(cantidad) or not parte or parte in ['NAN', 'NONE', '']:
               continue
           payload.append({
               "numero_parte": parte,
               "cantidad": int(cantidad),
               "area_escaneo": area
           })
       total_crudos = len(payload)
       print(f"[+] Preparando corte con {total_crudos} registros crudos...")
       # Enviamos todo al RPC (reemplazo atómico en PostgreSQL)
       res = requests.post(
           URL_RPC,
           json={"payload": payload},
           headers=HEADERS_SUPABASE,
           timeout=60
       )
       if res.status_code in [200, 204]:
           print(f"[OK] Sincronización exitosa. Tabla reemplazada con los {total_crudos} registros vigentes.")
       else:
           print(f"[!] Error en Supabase RPC: {res.status_code} - {res.text}")
   except Exception as e:
       print(f"[ERROR] Al procesar datos: {e}")
   finally:
       if os.path.exists(ruta_excel):
           os.remove(ruta_excel)
def run_bot():
   print("[*] Iniciando Bot Extractor Visteon (Playwright)...")
   with sync_playwright() as p:
       browser = p.chromium.launch(channel="msedge", headless=False)
       context = browser.new_context(accept_downloads=True)
       page = context.new_page()
       print("[*] Iniciando sesión en 4Wall...")
       page.goto(LOGIN_URL)
       page.locator('#txtUser').fill(USER)
       page.locator('#txtPassword').fill(PASS)
       page.locator('#btnLogin').click()
       page.wait_for_load_state('networkidle')
       page.wait_for_timeout(3000)
       print("[+] Sesión iniciada. Monitoreando cortes cada 3 minutos...")
       while True:
           try:
               page.goto(OVERALL_URL)
               page.wait_for_load_state('networkidle')
               page.wait_for_timeout(2000)
               print("[*] Solicitando exportación de inventario...")
               boton_exportar = page.get_by_text("Exportar a Excel", exact=False)
               if boton_exportar.count() > 0:
                   boton_exportar.first.click()
               else:
                   page.evaluate("__doPostBack('ctl00$cphMaster$ExportExcel', '')")
               enlace_descarga = page.locator('#ctl00_cphMaster_mdlExcelFile_C_lnkFile')
               enlace_descarga.wait_for(state="visible", timeout=35000)
               print("[+] Archivo listo en servidor. Descargando...")
               with page.expect_download(timeout=20000) as download_info:
                   enlace_descarga.click()
               download = download_info.value
               ruta_temporal = os.path.join(os.getcwd(), "descarga_4wall.xlsx")
               download.save_as(ruta_temporal)
               procesar_y_subir(ruta_temporal)
               print("[zZz] Corte finalizado. Esperando 3 minutos...")
               time.sleep(180)
           except KeyboardInterrupt:
               print("\n[!] Bot detenido manualmente.")
               break
           except Exception as e:
               print(f"[WARN] Error en ciclo: {e}. Reintentando en 60s...")
               time.sleep(60)
       browser.close()
if __name__ == "__main__":
   run_bot()
