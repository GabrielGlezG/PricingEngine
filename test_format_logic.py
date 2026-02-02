import sys
import os

# Helper to simulate the logic inside ppt_shared.py without running the full PPT generation
def check_format_logic(title, header, val):
    h_str = str(header).lower()
    t_str = str(title).lower()
    fmt = None
    
    if any(x in h_str for x in ['%', 'percent', 'variación', 'variation', 'coef', 'descuento', 'volatilidad']):
        fmt = 'percent'
    elif any(x in h_str for x in ['cantidad', 'cant.', 'volumen', 'versiones', 'total', 'numero', 'count']):
        fmt = 'integer'
    elif any(x in h_str for x in ['precio', 'price', 'monto', 'valor', 'bono', 'lista', 'costo', 'avg', 'min', 'max', 'promedio']):
        fmt = 'currency'
    elif any(x in t_str for x in ['volatilidad', 'volatility', 'tendencia', 'trend', 'variación', 'variation', 'share', 'participación', 'discount', 'descuento']):
            if isinstance(val, (int, float)) and not any(x in h_str for x in ['fecha', 'date', 'year', 'año', 'mes']): 
            # Note: The original code has this check.
                fmt = 'percent'
    elif "precio" in t_str or "price" in t_str:
            if isinstance(val, (int, float)): fmt = 'currency'
    
    print(f"Title: '{title}' | Header: '{header}' | Value: {val} -> Format: {fmt}")

check_format_logic("Tendencia de Precios", "BMW X5", 50000000)
check_format_logic("Analisis de Volatilidad", "BMW X5", 0.05)
check_format_logic("Variación Mensual", "Toyota", 0.02)
