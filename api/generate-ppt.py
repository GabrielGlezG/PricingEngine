from http.server import BaseHTTPRequestHandler
import json
import io
from datetime import datetime
from pptx import Presentation
from pptx.util import Inches, Pt
from pptx.enum.chart import XL_CHART_TYPE, XL_LEGEND_POSITION
from pptx.chart.data import CategoryChartData, XyChartData
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN

# Brand Colors (Institutional)
DARK_BLUE = RGBColor(30, 41, 59)  # Slate 900
LIGHT_BLUE = RGBColor(71, 85, 105) # Slate 600
ACCENT_BLUE = RGBColor(59, 130, 246) # Blue 500
WHITE = RGBColor(255, 255, 255)

def format_value(val, fmt=None, currency='$'):
    if val is None: return "-"
    try:
        if fmt == 'currency':
            return f"{currency} {float(val):,.0f}".replace(",", ".")
        elif fmt == 'percent':
            return f"{float(val):.1%}"
        elif isinstance(val, (int, float)):
            return f"{val:,.0f}" if float(val).is_integer() else f"{val:.2f}"
    except:
        pass
    return str(val)

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
        table.cell(row, 1).text = format_value(val, fmt, currency_symbol)

def add_table_slide(prs, title, rows, currency_symbol='$'):
    """
    Adds slides with data table detailed view, paginating if necessary.
    """
    if not rows: return
    
    # Pagination constants
    MAX_ROWS_PER_SLIDE = 14
    
    # Split rows into chunks
    chunks = [rows[i:i + MAX_ROWS_PER_SLIDE] for i in range(0, len(rows), MAX_ROWS_PER_SLIDE)]
    
    for i, chunk in enumerate(chunks):
        slide_layout = prs.slide_layouts[5] # Title Only
        slide = prs.slides.add_slide(slide_layout)
        
        # Add (Cont.) to title for subsequent slides
        slide_title = f"{title} (Detalle)" if i == 0 else f"{title} (Detalle - Cont. {i+1})"
        slide.shapes.title.text = slide_title
        
        headers = list(rows[0].keys())
        num_rows = len(chunk) + 1
        num_cols = len(headers)
        
        left = Inches(0.5)
        top = Inches(1.5)
        width = Inches(9)
        height = Inches(0.4 * num_rows)
        
        shape = slide.shapes.add_table(num_rows, num_cols, left, top, width, height)
        table = shape.table
        
        # Style Headers
        for c, header in enumerate(headers):
            cell = table.cell(0, c)
            cell.text = str(header)
            cell.fill.solid()
            cell.fill.fore_color.rgb = DARK_BLUE
            cell.text_frame.paragraphs[0].font.color.rgb = WHITE
            cell.text_frame.paragraphs[0].font.bold = True
            cell.text_frame.paragraphs[0].alignment = PP_ALIGN.CENTER

        # Fill Data
        for r, row_data in enumerate(chunk):
            for c, header in enumerate(headers):
                val = row_data.get(header)
                cell = table.cell(r + 1, c)
                
                # Heuristic for determining if it is currency
                is_currency = False
                header_str = str(header).lower()
                title_str = str(title).lower()

                # 1. Exclusion keywords (counts, years, percentages) - Strongest rule
                if any(x in header_str for x in ['cantidad', 'cant.', 'volumen', 'versiones', 'total modelos', 'total marcas', 'fecha', 'date', 'año', 'year', 'mes', 'segmento', 'marca', 'modelo', 'id', 'category']):
                    is_currency = False
                # 2. Explicit currency keywords in Header
                elif any(x in header_str for x in ['precio', 'price', 'monto', 'valor', 'bono', 'lista', 'costo', 'avg', 'min', 'max', 'promedio', 'mínimo', 'máximo']):
                    is_currency = True
                # 3. Contextual Rule: If Slide Title implies Pricing (e.g. "Evolución de Precios"), treat valid numbers as currency (unless excluded)
                elif "precio" in title_str or "price" in title_str:
                     # If it looks like a number
                     if isinstance(val, (int, float)):
                         is_currency = True

                fmt = 'currency' if is_currency else None
                cell.text = format_value(val, fmt, currency_symbol)
                cell.text_frame.paragraphs[0].font.size = Pt(10)

def add_chart_slide(prs, chart_info, currency_symbol='$'):
    # 1. Add Chart Slide
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
        # CHANGED: Switched from BUBBLE to XY_SCATTER to avoid 'bubble_sizes_ref' crash
         ppt_chart_type = XL_CHART_TYPE.XY_SCATTER
         chart_data = XyChartData()
    else:
        ppt_chart_type = XL_CHART_TYPE.COLUMN_CLUSTERED
        chart_data = CategoryChartData()
    
    if chart_type == 'scatter':
        series = chart_data.add_series('Modelos')
        for r in rows:
            # Safe float conversion
            try:
                x = float(r.get(headers[1], 0))
                y = float(r.get(headers[2], 0))
                # size ignored in XY Scatter
            except:
                continue
            series.add_data_point(x, y)
    else:
        # Standard Category Charts
        chart_data.categories = categories
        for s_name in series_names:
            # Safe float conversion for series values
            values = []
            for r in rows:
                val = r.get(s_name, 0)
                try:
                    values.append(float(val) if val is not None else 0.0)
                except ValueError:
                    values.append(0.0)
            chart_data.add_series(s_name, values)

    # Add Chart to Slide
    x, y, cx, cy = Inches(0.5), Inches(1.5), Inches(9), Inches(5.0)
    graphic_frame = slide.shapes.add_chart(
        ppt_chart_type, x, y, cx, cy, chart_data
    )
    chart = graphic_frame.chart
    
    # Basic Styling
    chart.has_legend = True
    chart.legend.position = XL_LEGEND_POSITION.BOTTOM
    chart.has_title = False

    # 2. Add Detailed Data Table Slide (requested by user)
    # We pass the same data rows to generate a detailed table slide
    add_table_slide(prs, chart_info.get('chart_title', 'Datos'), rows, currency_symbol)

def generate_ppt(data):
    prs = Presentation()
    
    title = data.get('title', 'Reporte Dashboard')
    currency_symbol = data.get('currencySymbol', '$')
    date_str = datetime.now().strftime("%d/%m/%Y")
    
    try:
        create_title_slide(prs, title, f"Generado el: {date_str}")
    except Exception as e:
        print(f"Error creating title slide: {e}")
    
    summary = data.get('summary')
    if summary:
        try:
            create_summary_slide(prs, summary, currency_symbol)
        except Exception as e:
            print(f"Error creating summary slide: {e}")
            slide = prs.slides.add_slide(prs.slide_layouts[1])
            slide.shapes.title.text = "Resumen Ejecutivo (Error)"
            slide.placeholders[1].text = f"No se pudo generar el resumen: {str(e)}"
        
    sheets = data.get('sheets', [])
    for sheet in sheets:
        try:
            add_chart_slide(prs, sheet, currency_symbol)
        except Exception as e:
            print(f"Error creating chart/table slide {sheet.get('name')}: {e}")
            try:
                slide = prs.slides.add_slide(prs.slide_layouts[5])
                slide.shapes.title.text = f"{sheet.get('chart_title')} (Data Error)"
                slide.shapes.add_textbox(Inches(1), Inches(2), Inches(8), Inches(1)).text = str(e)
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
