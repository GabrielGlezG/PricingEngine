import sys
import os
sys.path.append(os.getcwd())
sys.path.append(os.path.join(os.getcwd(), 'api'))

# Mock the imports if necessary or just import the file
try:
    import api.generate_ppt as generator
except ImportError:
    # If standard import fails, try direct file execution approach or path manipulation
    import importlib.util
    spec = importlib.util.spec_from_file_location("generate_ppt", "api/generate-ppt.py")
    generator = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(generator)

data = {
    "title": "Test Report",
    "currencySymbol": "$",
    "summary": {
        "total_models": 100,
        "avg_price": 50000
    },
    "sheets": [
        {
            "name": "General",
            "chart_title": "Precio Promedio",
            "chart_type": "bar",
            "data": [
                {"Brand": "Toyota", "Price": 10000},
                {"Brand": "Kia", "Price": 12000}
            ]
        },
        {
            "name": "Scatter",
            "chart_title": "Matriz",
            "chart_type": "scatter",
            "data": [
                 {"Model": "A", "Volumen": 10, "Precio": 5000},
                 {"Model": "B", "Volumen": 20, "Precio": 6000}
            ]
        }
    ]
}

print("Running PPT Generation...")
try:
    ppt_bytes = generator.generate_ppt(data)
    print(f"Success! Generated {len(ppt_bytes)} bytes.")
except Exception as e:
    print("Caught Exception:")
    import traceback
    traceback.print_exc()
