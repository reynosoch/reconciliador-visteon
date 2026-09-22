from flask import Flask, jsonify
from flask_cors import CORS
import sqlite3
app = Flask(__name__)
# Esto permite que tu React (que corre en el puerto 5173) se comunique con Python sin que lo bloquee
CORS(app)
db_path = 'inventario.db'
@app.route('/api/corte', methods=['GET'])
def obtener_corte():
   try:
       conn = sqlite3.connect(db_path)
       cursor = conn.cursor()
       # Sumamos las cantidades escaneadas por número de parte y área
       cursor.execute('''
           SELECT numero_parte, area_escaneo, SUM(cantidad) as total_piezas
           FROM escaneos_4wall
           GROUP BY numero_parte, area_escaneo
       ''')
       filas = cursor.fetchall()
       conn.close()
       # Convertimos los datos crudos a un JSON ordenado
       datos_formateados = []
       for fila in filas:
           datos_formateados.append({
               "numero_parte": fila[0],
               "area": fila[1],
               "total_escaneado": fila[2]
           })
       return jsonify(datos_formateados)
   except Exception as e:
       return jsonify({"error": str(e)}), 500
if __name__ == '__main__':
   print("🟢 API del Reconciliador corriendo en http://localhost:5000")
   app.run(port=5000, debug=True)