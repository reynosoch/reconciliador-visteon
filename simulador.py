import time
import os
import random
import requests
# Credenciales de Supabase
URL = os.environ["SUPABASE_URL"].rstrip("/") + "/rest/v1/escaneos_4wall"
API_KEY = os.environ["SUPABASE_SERVICE_KEY"]
HEADERS = {
   "apikey": API_KEY,
   "Authorization": f"Bearer {API_KEY}",
   "Content-Type": "application/json",
   "Prefer": "return=minimal"
}
numeros_parte = ['VPRLXF-1', 'P7-CHIP', 'PN-10003', 'PN-10004', 'PN-10005']
areas = ['ALMACEN', 'PISO', 'CUARENTENA']
print(" Conectando auditores a SUPABASE en vivo...")
while True:
   try:
       scans_a_insertar = random.randint(1, 3)
       for _ in range(scans_a_insertar):
           parte = random.choice(numeros_parte)
           cantidad = random.randint(1, 15)
           area = random.choice(areas)
           payload = {
               "numero_parte": parte,
               "cantidad": cantidad,
               "area_escaneo": area
           }
           response = requests.post(URL, json=payload, headers=HEADERS)
           icono = "👻" if parte.startswith("P7") else ("⚠️" if "VPRLXF" in parte else "📦")
           if response.status_code == 201:
               print(f"{icono} NUBE: {cantidad} pz de {parte} en {area}")
           else:
               print(f"❌ Error al subir: {response.text}")
       time.sleep(3)
   except KeyboardInterrupt:
       print("\n🛑 Simulador detenido.")
       break
   except Exception as e:
       print(f"\n❌ Error de conexión: {e}")
       break