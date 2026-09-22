import time
import random
import requests
import warnings
from urllib3.exceptions import InsecureRequestWarning
# Apagar el warning de SSL (solo porque tu proxy corporativo intercepta el certificado)
warnings.simplefilter('ignore', InsecureRequestWarning)
# Credenciales de Supabase
URL = "https://uukhwkywmnarcfruerpp.supabase.co/rest/v1/escaneos_4wall"
API_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV1a2h3a3l3bW5hcmNmcnVlcnBwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAwODI4OTgsImV4cCI6MjEwNTY1ODg5OH0.ezApb_e8_Q-_yvxmZL4b3skmmMXoJaya4oupSzPz3Vc"
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
           response = requests.post(URL, json=payload, headers=HEADERS, verify=False)
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