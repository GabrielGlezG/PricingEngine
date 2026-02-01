import sys
import os
import json

# Add api folder to path
sys.path.append(os.path.join(os.getcwd(), 'api'))

from importlib.machinery import SourceFileLoader

# Load the module specifically
generate_excel_module = SourceFileLoader("generate_excel", "api/generate-excel.py").load_module()
generate_excel = generate_excel_module.generate_excel

payload = {
    "title": "Test Report",
    "filename": "test.xlsx",
    "currencySymbol": "$",
    "summary": {
        "total_models": 100
    },
    "sheets": [
        {
            "name": "Composicion Mercado",
            "chart_type": "stacked",
            "chart_title": "Test Chart",
            "data": [
                {"Segmento": "SUV", "Toyota": 10, "Kia": 5},
                {"Segmento": "Sedan", "Toyota": 8, "Kia": 12}
            ]
        },
        {
            "name": "Precios Segmento",
            "chart_type": "bar",
            "chart_title": "Prices",
            "data": [
                 {"Segmento": "SUV", "Mínimo": 100, "Promedio": 200, "Máximo": 300, "Count": 10}
            ]
        }
    ]
}

try:
    print("Generating Excel...")
    excel_bytes = generate_excel(payload)
    print(f"Success! Generated {len(excel_bytes)} bytes.")
    with open("test_output.xlsx", "wb") as f:
        f.write(excel_bytes)
except Exception as e:
    print(f"FAILED: {e}")
    import traceback
    traceback.print_exc()
