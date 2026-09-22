import time
import os
import pandas as pd
import requests
import warnings
from urllib3.exceptions import InsecureRequestWarning
from playwright.sync_api import sync_playwright
warnings.simplefilter('ignore', InsecureRequestWarning)
# ==========================================
# 1. CONFIGURACIÓN
# ==========================================
USER = "jreynos1"
PASS = "V1st3on2026"
LOGIN_URL = "http://cuupd003.chihuahua.visteon.com/4WallAdmin/Pages/Login.aspx"
OVERALL_URL = "http://cuupd003.chihuahua.visteon.com/4WallAdmin/Inventory/Overall.aspx"
# Credenciales de tu Nube (Supabase)
URL_SUPABASE = "https://uukhwkywmnarcfruerpp.supabase.co/rest/v1/escaneos_4wall"
API_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV1a2h3a3l3bW5hcmNmcnVlcnBwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAwODI4OTgsImV4cCI6MjEwNTY1ODg5OH0.ezApb_e8_Q-_yvxmZL4b3skmmMXoJaya4oupSzPz3Vc"
HEADERS_SUPABASE = {
   "apikey": API_KEY,
   "Authorization": f"Bearer {API_KEY}",
   "Content-Type": "application/json",
   "Prefer": "return=minimal"
}
def procesar_y_subir(ruta_excel):
   print("📊 Procesando el archivo descargado...")
   try:
       try:
           df = pd.read_excel(ruta_excel)
       except:
           df = pd.read_html(ruta_excel)[0]
       cols = [str(c).lower() for c in df.columns]
       col_parte = next((c for c in df.columns if 'part' in str(c).lower() or 'qad' in str(c).lower()), df.columns[0])
       col_cant = next((c for c in df.columns if 'quant' in str(c).lower() or 'qty' in str(c).lower() or 'cant' in str(c).lower()), df.columns[1])
       col_area = next((c for c in df.columns if 'area' in str(c).lower() or 'ubic' in str(c).lower()), df.columns[2])
       print("🧹 Limpiando base de datos en la nube...")
       requests.delete(URL_SUPABASE, headers=HEADERS_SUPABASE, params={"id": "gt.0"}, verify=False)
       print(f"🚀 Subiendo {len(df)} registros a Supabase...")
       nuevos_registros = 0
       for _, row in df.iterrows():
           parte = str(row[col_parte]).strip()
           cantidad = pd.to_numeric(row[col_cant], errors='coerce')
           area = str(row[col_area]).strip().upper()
           if pd.isna(cantidad) or not parte or parte == 'nan':
               continue
           payload = {
               "numero_parte": parte,
               "cantidad": int(cantidad),
               "area_escaneo": area
           }
           res = requests.post(URL_SUPABASE, json=payload, headers=HEADERS_SUPABASE, verify=False)
           if res.status_code == 201:
               nuevos_registros += 1
       print(f"✅ ¡Éxito! {nuevos_registros} escaneos reales sincronizados en tu Dashboard.")
   except Exception as e:
       print(f"❌ Error al procesar los datos: {e}")
   finally:
       if os.path.exists(ruta_excel):
           os.remove(ruta_excel)
def run_bot():
   print("🤖 Iniciando Bot Extractor Visteon...")
   with sync_playwright() as p:
       # Con channel="msedge" forzamos a usar tu Microsoft Edge normal
       browser = p.chromium.launch(channel="msedge", headless=False)
       # Agregamos ignore_https_errors para que ignore los bloqueos de certificados del proxy
       context = browser.new_context(accept_downloads=True, ignore_https_errors=True)
       page = context.new_page()
       print("🌐 Iniciando sesión en 4Wall...")
       page.goto(LOGIN_URL)
       # Llenamos el formulario
       page.locator('input[type="text"]').first.fill(USER)
       page.locator('input[type="password"]').first.fill(PASS)
       page.locator('input[type="submit"], button').first.click()
       page.wait_for_load_state('networkidle')
       print("🔓 Sesión iniciada con éxito.")
       while True:
           try:
               print("\n🔄 Navegando a la tabla de reportes...")
               page.goto(OVERALL_URL)
               page.wait_for_load_state('networkidle')
               print("⬇️ Interceptando exportación a Excel...")
               with page.expect_download() as download_info:
                   page.locator('[name="ctl00$cphMaster$ExportExcel"]').click()
               download = download_info.value
               ruta_temporal = os.path.join(os.getcwd(), "descarga_4wall.xls")
               download.save_as(ruta_temporal)
               procesar_y_subir(ruta_temporal)
               print("⏳ Esperando 3 minutos para el siguiente corte...")
               time.sleep(180)
           except KeyboardInterrupt:
               print("\n🛑 Bot detenido manualmente.")
               break
           except Exception as e:
               print(f"⚠️ Error en el ciclo: {e}. Reintentando en 1 minuto...")
               time.sleep(60)
       browser.close()
if __name__ == "__main__":
   run_bot()