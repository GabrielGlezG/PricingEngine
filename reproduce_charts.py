
import sys
import os
import io

# Setup imports
sys.path.append(os.getcwd())
sys.path.append(os.path.join(os.getcwd(), 'api'))

try:
    import api.generate_ppt as generator
except ImportError:
    import importlib.util
    spec = importlib.util.spec_from_file_location("generate_ppt", "api/generate-ppt.py")
    generator = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(generator)

# Mock Data simulating the user's report structure
data = {
    "title": "Reporte Completo Test",
    "currencySymbol": "$",
    "summary": {
        "total_models": 12,
        "avg_price": 25000000
    },
    "sheets": [
        # Image 1: Composición
        {
            "name": "Composición de Versiones",
            "chart_title": "Composición de Versiones",
            "chart_type": "bar",
            "data": [
                {"Segment": "SUV", "Count": 5},
                {"Segment": "Sedan", "Count": 3},
                {"Segment": "Hatchback", "Count": 4}
            ]
        },
        # Image 2/3: Estructura de Precios
        {
            "name": "Estructura de Precios",
            "chart_title": "Estructura de Precios por Segmento",
            "chart_type": "bar",
            "data": [
                {"Segment": "SUV", "Min": 15000000, "Avg": 20000000, "Max": 25000000},
                {"Segment": "Sedan", "Min": 10000000, "Avg": 12000000, "Max": 15000000}
            ]
        },
        # Image 4: Tendencia
        {
            "name": "Tendencia de Precios",
            "chart_title": "Tendencia de Precios Global (% Acumulado)",
            "chart_type": "bar",
            "data": [
                {"Brand": "Toyota", "Variation": 0.05}
            ]
        },
        # Image 5: Volatilidad
        {
            "name": "Volatilidad",
            "chart_title": "Evolución de Volatilidad",
            "chart_type": "line",
            "data": [
                {"Date": "2023-01", "Volvo": 0.1, "BMW": 0.12},
                {"Date": "2023-02", "Volvo": 0.11, "BMW": 0.10},
                {"Date": "2023-03", "Volvo": 0.13, "BMW": 0.09}
            ]
        }
        },
        # Image New: Benchmarking
        {
            "name": "Benchmarks",
            "chart_title": "Benchmarking de Precios por Marca",
            "chart_type": "line",
            "data": [
                {"Brand": "Toyota", "Min": 10000000, "Max": 20000000},
                {"Brand": "Kia", "Min": 9000000, "Max": 18000000}
            ]
        }
    ]
}

print("Running Comprehensive PPT Generation Test...")
try:
    ppt_bytes = generator.generate_ppt(data)
    with open("test_output_charts.pptx", "wb") as f:
        f.write(ppt_bytes)
    print(f"Success! Generated {len(ppt_bytes)} bytes. Saved to test_output_charts.pptx")
except Exception as e:
    print("Caught Exception:")
    import traceback
    traceback.print_exc()
