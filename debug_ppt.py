import sys
import os
import io
import json

# Mocking the request data
mock_data = {
    "title": "Test Report",
    "currencySymbol": "$",
    "summary": {
        "total_models": 10,
        "avg_price": 5000000
    },
    "sheets": [
        {
            "name": "Test Sheet",
            "chart_title": "Test Chart",
            "data": [
                 {"Marca": "Toyota", "Precio": 100000},
                 {"Marca": "Ford", "Precio": 120000}
            ]
        }
    ]
}

try:
    print("Importing generate_ppt...")
    # Add current dir to path to import api
    sys.path.append(os.getcwd())
    
    # Try importing directly from file path logic since it is in api/
    import importlib.util
    spec = importlib.util.spec_from_file_location("generate_ppt", "api/generate-ppt.py")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    generate_ppt = module.generate_ppt
    print("Import successful.")

    print("Running generate_ppt...")
    output = generate_ppt(mock_data)
    print(f"Success! Output size: {len(output)} bytes")

except Exception as e:
    print(f"ERROR: {e}")
    import traceback
    traceback.print_exc()
