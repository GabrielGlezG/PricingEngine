from http.server import BaseHTTPRequestHandler
import json
import io
from datetime import datetime
from pptx import Presentation
from pptx.util import Inches, Pt
from pptx.enum.chart import XL_CHART_TYPE, XL_LEGEND_POSITION
from pptx.chart.data import CategoryChartData, XyChartData
from pptx.dml.color import RGBColor

# Brand Colors (Institutional)
DARK_BLUE = RGBColor(30, 41, 59)  # Slate 900
LIGHT_BLUE = RGBColor(71, 85, 105) # Slate 600
ACCENT_BLUE = RGBColor(59, 130, 246) # Blue 500

def create_title_slide(prs, title, subtitle):
    slide_layout = prs.slide_layouts[0] # Title Slide
    slide = prs.slides.add_slide(slide_layout)
    slide.shapes.title.text = title
    if slide.placeholders[1]:
        slide.placeholders[1].text = subtitle

def create_summary_slide(prs, summary, currency_symbol):
    slide_layout = prs.slide_layouts[1] # Title and Content
    slide = prs.slides.add_slide(slide_layout)
    slide.shapes.title.text = "Resumen Ejecutivo"
    
    # Create a table for metrics
    rows = 10
    cols = 2
    left = Inches(1)
    top = Inches(2)
    width = Inches(8)
    height = Inches(4)
    
    shape = slide.shapes.add_table(rows, cols, left, top, width, height)
    table = shape.table
    
    # Set column widths
    table.columns[0].width = Inches(4)
    table.columns[1].width = Inches(4)
    
    # Headers
    table.cell(0, 0).text = "Métrica"
    table.cell(0, 1).text = "Valor"
    
    metrics = [
        ("Total Modelos", summary.get('total_models', 0), None),
        ("Total Marcas", summary.get('total_brands', 0), None),
        ("Precio Promedio", summary.get('avg_price', 0), 'currency'),
        ("Precio Mediano", summary.get('median_price', 0), 'currency'),
        ("Precio Mínimo", summary.get('min_price', 0), 'currency'),
        ("Precio Máximo", summary.get('max_price', 0), 'currency'),
        ("Desviación Estándar", summary.get('price_std_dev', 0), 'currency'),
        ("Coef. Variación", summary.get('variation_coefficient', 0), 'percent'),
        ("Descuento Promedio", summary.get('avg_discount_pct', 0), 'percent')
    ]
    
    for i, (label, val, fmt) in enumerate(metrics):
        row = i + 1
        table.cell(row, 0).text = label
        
        try:
            if fmt == 'currency':
                # Ensure val is a number
                num_val = float(val) if val is not None else 0
                table.cell(row, 1).text = f"{currency_symbol} {num_val:,.0f}".replace(",", ".")
            elif fmt == 'percent':
                num_val = float(val) if val is not None else 0
                table.cell(row, 1).text = f"{num_val:.1%}"
            else:
                table.cell(row, 1).text = str(val if val is not None else "-")
        except:
            table.cell(row, 1).text = str(val)

def add_chart_slide(prs, chart_info):
    slide_layout = prs.slide_layouts[5] # Title Only
    slide = prs.slides.add_slide(slide_layout)
    slide.shapes.title.text = chart_info.get('chart_title', 'Gráfico')
    
    chart_type = chart_info.get('chart_type', 'bar')
    rows = chart_info.get('data', [])
    
    if not rows:
        return

    # Prepare Data
    headers = list(rows[0].keys()) # First key is Category, rest are Series
    categories = [str(r[headers[0]]) for r in rows]
    series_names = headers[1:]
    
    # Define Chart
    if chart_type == 'line':
        ppt_chart_type = XL_CHART_TYPE.LINE
        chart_data = CategoryChartData()
    elif chart_type == 'stacked':
         ppt_chart_type = XL_CHART_TYPE.COLUMN_STACKED
         chart_data = CategoryChartData()
    elif chart_type == 'scatter':
         ppt_chart_type = XL_CHART_TYPE.BUBBLE # Using Bubble for positioning matrix
         chart_data = XyChartData()
    else:
        ppt_chart_type = XL_CHART_TYPE.COLUMN_CLUSTERED
        chart_data = CategoryChartData()
    
    if chart_type == 'scatter':
        # Special handling for Bubble Chart (Posicionamiento)
        # Expected Headers: "Marca - Modelo", "Volumen" (X), "Precio Promedio" (Y)
        # We need to group by Brand? No, just series named "Modelos"
        series = chart_data.add_series('Modelos')
        for r in rows:
            # Assuming headers[1] is X (Volumen), headers[2] is Y (Precio)
            x = r.get(headers[1], 0)
            y = r.get(headers[2], 0)
            size = r.get(headers[1], 1) / 5 # Arbitrary scaling for bubble size
            series.add_data_point(x, y, size)
    else:
        # Standard Category Charts
        chart_data.categories = categories
        for s_name in series_names:
            values = [r.get(s_name, 0) for r in rows]
            chart_data.add_series(s_name, values)

    # Add Chart to Slide
    x, y, cx, cy = Inches(0.5), Inches(1.5), Inches(9), Inches(5.5)
    graphic_frame = slide.shapes.add_chart(
        ppt_chart_type, x, y, cx, cy, chart_data
    )
    chart = graphic_frame.chart
    
    # Basic Styling
    chart.has_legend = True
    chart.legend.position = XL_LEGEND_POSITION.BOTTOM
    chart.has_title = False # Title is on the slide

def generate_ppt(data):
    prs = Presentation()
    
    title = data.get('title', 'Reporte Dashboard')
    date_str = datetime.now().strftime("%d/%m/%Y")
    
    try:
        create_title_slide(prs, title, f"Generado el: {date_str}")
    except Exception as e:
        print(f"Error creating title slide: {e}")
    
    summary = data.get('summary')
    if summary:
        try:
            create_summary_slide(prs, summary, data.get('currencySymbol', '$'))
        except Exception as e:
            print(f"Error creating summary slide: {e}")
            # Create a simple error slide instead
            slide = prs.slides.add_slide(prs.slide_layouts[1])
            slide.shapes.title.text = "Resumen Ejecutivo (Error)"
            slide.placeholders[1].text = f"No se pudo generar el resumen: {str(e)}"
        
    sheets = data.get('sheets', [])
    for sheet in sheets:
        try:
            add_chart_slide(prs, sheet)
        except Exception as e:
            print(f"Error creating chart slide {sheet.get('name')}: {e}")
            # Optional: Add error slide for this chart
            try:
                slide = prs.slides.add_slide(prs.slide_layouts[5])
                slide.shapes.title.text = f"{sheet.get('chart_title')} (Data Error)"
            except:
                pass
        
    output = io.BytesIO()
    prs.save(output)
    output.seek(0)
    return output.getvalue()

class handler(BaseHTTPRequestHandler):
    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()
    
    def do_POST(self):
        try:
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            data = json.loads(post_data.decode('utf-8'))
            
            filename = data.get('filename', 'Presentation.pptx').replace('.xlsx', '.pptx')
            
            ppt_bytes = generate_ppt(data)
            
            self.send_response(200)
            self.send_header('Access-Control-Allow-Origin', '*')
            self.send_header('Content-Type', 'application/vnd.openxmlformats-officedocument.presentationml.presentation')
            self.send_header('Content-Disposition', f'attachment; filename="{filename}"')
            self.send_header('Content-Length', len(ppt_bytes))
            self.end_headers()
            self.wfile.write(ppt_bytes)
            
        except Exception as e:
            self.send_response(500)
            self.send_header('Access-Control-Allow-Origin', '*')
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({"error": str(e)}).encode())
