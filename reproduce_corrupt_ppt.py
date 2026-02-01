import json
import os
import sys
from datetime import datetime

# Fake the request body that would come from the frontend for "Price Evolution" and "Comparison"
# "Price Evolution" usually implies a Line Chart with dates on X.
# "Comparison" likely implies a Table or Clustered Column chart comparing versions.

mock_data_evolution = {
    "title": "Evolución de Precios",
    "date": datetime.now().strftime("%d/%m/%Y"),
    "summary": {
        "total_models": 1,
        "avg_price": 15000000
    },
    "slides": [
        {
            "type": "chart",
            "chart_title": "Evolución de Precios Promedio",
            "chart_type": "line",
            "name": "Evolución de Precios", # Trigger specific logic
            "data": [
                {"Fecha": "2023-01", "Precio": 14000000},
                {"Fecha": "2023-02", "Precio": 14200000},
                {"Fecha": "2023-03", "Precio": 14100000},
                {"Fecha": "2023-04", "Precio": 14500000},
                {"Fecha": "2023-05", "Precio": 14800000}
            ]
        },
        {
            "type": "chart",
            "chart_title": "Tendencia de Precios",
            "chart_type": "line",
            "name": "Tendencia", # Trigger trend logic
            "data": [
                {"Fecha": "2023-01", "Variación": 0.0},
                {"Fecha": "2023-02", "Variación": 0.02},
                {"Fecha": "2023-03", "Variación": -0.01}
            ]
        }
    ],
    "currency": "$"
}

mock_data_comparison = {
    "title": "Comparación de Vehículos",
    "date": datetime.now().strftime("%d/%m/%Y"),
    "summary": {
        "total_models": 3,
        "avg_price": 20000000
    },
    "slides": [
        {
            "type": "table",
            "title": "Comparativa de Versiones",
            "data": [
                {"Modelo": "Versión Entry", "Precio": 18000000, "Equipamiento": "Básico"},
                {"Modelo": "Versión Mid", "Precio": 22000000, "Equipamiento": "Medio"},
                {"Modelo": "Versión Top", "Precio": 25000000, "Equipamiento": "Full"}
            ]
        },
        {
            "type": "chart",
            "chart_title": "Comparación de Precios",
            # Assuming comparison might be bar or column
            "chart_type": "bar", 
            "name": "Comparación Precios",
            "data": [
                {"Modelo": "V1", "Precio": 18000000},
                {"Modelo": "V2", "Precio": 22000000},
                {"Modelo": "V3", "Precio": 25000000}
            ]
        }
    ],
    "currency": "$"
}

# Import the generation logic
sys.path.append(os.path.join(os.getcwd(), 'api'))
if 'api.generate-ppt' in sys.modules:
    del sys.modules['api.generate-ppt']
import importlib.util
spec = importlib.util.spec_from_file_location("generate_ppt", os.path.join(os.getcwd(), 'api', 'generate-ppt.py'))
gen_mod = importlib.util.module_from_spec(spec)
spec.loader.exec_module(gen_mod)

print("Generating Evolution PPT...")
ppt_bytes_evo = gen_mod.generate_ppt(mock_data_evolution)
with open("debug_evolution.pptx", "wb") as f:
    f.write(ppt_bytes_evo)
print(f"Saved debug_evolution.pptx ({len(ppt_bytes_evo)} bytes)")

print("\nGenerating Comparison PPT...")
ppt_bytes_comp = gen_mod.generate_ppt(mock_data_comparison)
with open("debug_comparison.pptx", "wb") as f:
    f.write(ppt_bytes_comp)
print(f"Saved debug_comparison.pptx ({os.path.getsize('debug_comparison.pptx')} bytes)")
