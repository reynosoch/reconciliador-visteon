import sqlite3
import time
import random
db_path = 'inventario.db'
# La lista sincronizada con React
numeros_parte = [
   'VPRLXF-1',  
   'P7-CHIP',    
   'PN-10003',    
   'PN-10004',    
   'PN-10005'  
]
areas = ['ALMACEN', 'PISO', 'CUARENTENA']
print("🚀 Iniciando simulador de escáneres 4Wall...")
print("Presiona Ctrl+C en la terminal para detenerlo.\n")
while True:
   try:
       conn = sqlite3.connect(db_path)
       cursor = conn.cursor()
       cursor.execute('''
       CREATE TABLE IF NOT EXISTS escaneos_4wall (
           id INTEGER PRIMARY KEY AUTOINCREMENT,
           numero_parte TEXT NOT NULL,
           cantidad INTEGER NOT NULL,
           area_escaneo TEXT,
           fecha_hora TIMESTAMP DEFAULT CURRENT_TIMESTAMP
       )
       ''')
       scans_a_insertar = random.randint(1, 3)
       for _ in range(scans_a_insertar):
           parte = random.choice(numeros_parte)
           cantidad = random.randint(1, 15)
           area = random.choice(areas)
           cursor.execute('''
               INSERT INTO escaneos_4wall (numero_parte, cantidad, area_escaneo)
               VALUES (?, ?, ?)
           ''', (parte, cantidad, area))
           icono = "👻" if parte.startswith("P7") else ("⚠️" if "VPRLXF" in parte else "📦")
           print(f"{icono} Escaneado: {cantidad} pz de {parte} en {area}")
       conn.commit()
       conn.close()
       time.sleep(3)
   except KeyboardInterrupt:
       print("\n🛑 Simulador detenido por el usuario.")
       break
   except Exception as e:
       print(f"\n❌ Error: {e}")
       break