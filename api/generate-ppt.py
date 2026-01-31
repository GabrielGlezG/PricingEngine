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
        val_float = float(val)
        if fmt == 'currency':
             # Use specific currency formatting
             if currency == 'UF':
                 return f"UF {val_float:,.2f}".replace(",", ".") # UF usually has decimals
             else:
                 return f"{currency} {val_float:,.0f}".replace(",", ".")
        elif fmt == 'percent':
            # Multiply by 100 if it's a decimal (0.1 -> 10%)
            # Logic check: is the value already 10 or 0.1? usually backend sends decimals for percents.
            return f"{val_float * 100:.1f}%"
        elif isinstance(val, (int, float)):
             # General number
            return f"{val_float:,.0f}" if val_float.is_integer() else f"{val_float:.2f}"
    except:
        pass
    return str(val)

def set_font(shape, font_name="Avenir Light", font_size=None, bold=False, color=None):
    """Helper to set font properties recursively for a shape or text frame"""
    if not shape.has_text_frame:
        return
    
    for paragraph in shape.text_frame.paragraphs:
        for run in paragraph.runs:
            run.font.name = font_name
            if font_size:
                run.font.size = font_size
            if bold is not None:
                run.font.bold = bold
            if color:
                run.font.color.rgb = color

def create_logo_slide(prs, logo_path):
    """Creates a slide with a large centered logo."""
    slide = prs.slides.add_slide(prs.slide_layouts[6]) # Blank layout
    try:
        slide_width = prs.slide_width
        slide_height = prs.slide_height
        logo_width = Inches(4)
        left = (slide_width - logo_width) / 2
        pic = slide.shapes.add_picture(logo_path, left, 0, width=logo_width)
        top = (slide_height - pic.height) / 2
        pic.top = int(top)
    except Exception as e:
        print(f"Error adding logo to slide: {e}")

def create_intro_slide(prs, title, date_str, bg_path):
    """Creates intro slide with background image, title and date."""
    slide = prs.slides.add_slide(prs.slide_layouts[6]) # Blank layout
    
    try:
        slide.shapes.add_picture(bg_path, 0, 0, width=prs.slide_width, height=prs.slide_height)
    except Exception as e:
        print(f"Error adding background: {e}")
        
    left = Inches(1)
    top = Inches(2)
    width = Inches(8)
    height = Inches(1.5)
    
    tb = slide.shapes.add_textbox(left, top, width, height)
    p_title = tb.text_frame.paragraphs[0]
    p_title.text = title.upper()
    p_title.font.name = "Avenir Light"
    p_title.font.size = Pt(44)
    p_title.font.bold = True
    p_title.font.color.rgb = DARK_BLUE 
    p_title.alignment = PP_ALIGN.CENTER
    
    p_date = tb.text_frame.add_paragraph()
    p_date.text = f"\nGenerado el: {date_str}"
    p_date.font.name = "Avenir Light"
    p_date.font.size = Pt(18)
    p_date.font.color.rgb = LIGHT_BLUE
    p_date.alignment = PP_ALIGN.CENTER

def create_summary_slide(prs, summary, currency_symbol):
    slide_layout = prs.slide_layouts[5] # Title Only
    slide = prs.slides.add_slide(slide_layout)
    slide.shapes.title.text = "Resumen Ejecutivo"
    set_font(slide.shapes.title, font_size=Pt(32), bold=True, color=DARK_BLUE)
    
    rows = 10
    cols = 2
    left = Inches(1.5)
    top = Inches(2)
    width = Inches(7)
    height = Inches(4)
    
    shape = slide.shapes.add_table(rows, cols, left, top, width, height)
    table = shape.table
    
    table.columns[0].width = Inches(3.5)
    table.columns[1].width = Inches(3.5)
    
    # Header format
    table.cell(0, 0).text = "Métrica"
    table.cell(0, 1).text = "Valor"
    for c in range(2):
        cell = table.cell(0, c)
        cell.fill.solid()
        cell.fill.fore_color.rgb = DARK_BLUE
        cell.text_frame.paragraphs[0].font.color.rgb = WHITE
        cell.text_frame.paragraphs[0].font.bold = True
        cell.text_frame.paragraphs[0].font.name = "Avenir Light"
    
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
        c1 = table.cell(row, 0)
        c1.text = label
        c1.text_frame.paragraphs[0].font.name = "Avenir Light"
        
        c2 = table.cell(row, 1)
        c2.text = format_value(val, fmt, currency_symbol)
        c2.text_frame.paragraphs[0].font.name = "Avenir Light"
        c2.text_frame.paragraphs[0].alignment = PP_ALIGN.RIGHT

def add_table_slide(prs, title, rows, currency_symbol='$'):
    if not rows: return
    MAX_ROWS = 12
    chunks = [rows[i:i + MAX_ROWS] for i in range(0, len(rows), MAX_ROWS)]
    
    for i, chunk in enumerate(chunks):
        slide = prs.slides.add_slide(prs.slide_layouts[5])
        slide_title = f"{title}" if i == 0 else f"{title} (Cont.)"
        slide.shapes.title.text = slide_title
        set_font(slide.shapes.title, font_size=Pt(24), bold=True, color=DARK_BLUE)
        
        headers = list(rows[0].keys())
        num_cols = len(headers)
        
        shape = slide.shapes.add_table(len(chunk)+1, num_cols, Inches(0.5), Inches(1.5), Inches(9), Inches(0.4*(len(chunk)+1)))
        table = shape.table
        
        # Style Headers
        for c, header in enumerate(headers):
            cell = table.cell(0, c)
            cell.text = str(header)
            cell.fill.solid()
            cell.fill.fore_color.rgb = DARK_BLUE
            tf = cell.text_frame.paragraphs[0]
            tf.font.color.rgb = WHITE
            tf.font.bold = True
            tf.font.name = "Avenir Light"
            tf.font.size = Pt(10)
            tf.alignment = PP_ALIGN.CENTER

        # Fill Data
        for r, row_data in enumerate(chunk):
            for c, header in enumerate(headers):
                val = row_data.get(header)
                cell = table.cell(r + 1, c)
                
                is_currency = False
                header_str = str(header).lower()
                title_str = str(title).lower()
                
                # Exclusion
                if any(x in header_str for x in ['cantidad', 'cant.', 'year', 'año', 'mes', 'segmento', 'marca', 'modelo', 'id', 'category']):
                    is_currency = False
                # Inclusion
                elif any(x in header_str for x in ['precio', 'price', 'monto', 'valor', 'bono', 'lista', 'avg', 'min', 'max']):
                    is_currency = True
                elif "precio" in title_str or "price" in title_str:
                     if isinstance(val, (int, float)): is_currency = True

                # Percentage detection
                is_percent = False
                if any(x in header_str for x in ['%', 'percent', 'variación', 'variation', 'coef', 'descuento']):
                    is_percent = True
                    is_currency = False

                fmt = 'currency' if is_currency else ('percent' if is_percent else None)
                cell.text = format_value(val, fmt, currency_symbol)
                
                tf = cell.text_frame.paragraphs[0]
                tf.font.name = "Avenir Light"
                tf.font.size = Pt(9)
                if is_currency or is_percent:
                    tf.alignment = PP_ALIGN.RIGHT
                else:
                    tf.alignment = PP_ALIGN.LEFT

def add_chart_slide(prs, chart_info, currency_symbol='$'):
    slide = prs.slides.add_slide(prs.slide_layouts[5])
    slide.shapes.title.text = chart_info.get('chart_title', 'Gráfico')
    set_font(slide.shapes.title, font_size=Pt(28), bold=True, color=DARK_BLUE)
    
    chart_type = chart_info.get('chart_type', 'bar')
    rows = chart_info.get('data', [])
    if not rows: return

    headers = list(rows[0].keys())
    categories = [str(r[headers[0]]) for r in rows]
    series_names = headers[1:] # Assuming rest are series
    
    if chart_type == 'line':
        ppt_chart_type = XL_CHART_TYPE.LINE
        chart_data = CategoryChartData()
    elif chart_type == 'stacked':
         ppt_chart_type = XL_CHART_TYPE.COLUMN_STACKED
         chart_data = CategoryChartData()
    elif chart_type == 'scatter':
         ppt_chart_type = XL_CHART_TYPE.XY_SCATTER
         chart_data = XyChartData()
    else:
        ppt_chart_type = XL_CHART_TYPE.COLUMN_CLUSTERED
        chart_data = CategoryChartData()
    
    if chart_type == 'scatter':
        # For Positioning Matrix: We need Brand/Model names on labels preferably
        # Current logic assumes rows have X, Y. 
        # Ideally frontend sends { 'Label': 'Toyota Yaris', 'Volumen': 50, 'Precio': 20000 }
        # Let's try to map the first string column as Label if possible?
        # But XYScatter in PPTX works with Series.
        # We will create ONE series per point to have legend labels? Or one series with data labels.
        # Creating one series per point allows legend to identify them.
        
        for r in rows:
            # Assume Col 0 is Label, Col 1 X, Col 2 Y (or via header names)
            label = str(r[headers[0]])
            try:
                # Heuristic: headers with 'Volumen' or 'Cant' is X usually? Or Y?
                # User asked for Price vs Volume.
                # Usually Price is Y, Volume is X.
                # Let's search keys.
                x_key = next((k for k in headers if 'volumen' in k.lower() or 'cant' in k.lower()), headers[1])
                y_key = next((k for k in headers if 'precio' in k.lower() or 'price' in k.lower()), headers[2])
                
                x_val = float(r.get(x_key, 0))
                y_val = float(r.get(y_key, 0))
                
                series = chart_data.add_series(label)
                series.add_data_point(x_val, y_val)
            except:
                continue
    else:
        chart_data.categories = categories
        for s_name in series_names:
            values = []
            for r in rows:
                val = r.get(s_name, 0)
                try:
                    values.append(float(val) if val is not None else 0.0)
                except:
                    values.append(0.0)
            chart_data.add_series(s_name, values)

    # Clean previous formatting logic to avoid clashes
    x, y, cx, cy = Inches(0.5), Inches(1.5), Inches(9), Inches(5.0)
    graphic_frame = slide.shapes.add_chart(ppt_chart_type, x, y, cx, cy, chart_data)
    chart = graphic_frame.chart
    
    # Global Chart Formatting
    try:
        if chart.has_legend:
            chart.legend.position = XL_LEGEND_POSITION.BOTTOM
            chart.legend.include_in_layout = False
            chart.legend.font.name = "Avenir Light"
            chart.legend.font.size = Pt(9)

        # Data Labels
        if chart_type != 'line': # Line charts get messy with labels usually
            plot = chart.plots[0]
            plot.has_data_labels = True
            data_labels = plot.data_labels
            data_labels.font.name = "Avenir Light"
            data_labels.font.size = Pt(8)
            data_labels.font.color.rgb = DARK_BLUE
            # if 'currency' in title... format labels? python-pptx support for label format is tricky.
            # We rely on defaults for now or set number_format if possible.
            # data_labels.number_format = '"$"#,##0' # Simple attempt
    except Exception as e:
        print(f"Chart formatting warning: {e}")

    # Add Text Table slide as well
    add_table_slide(prs, chart_info.get('chart_title', 'Datos'), rows, currency_symbol)

def generate_ppt(data):
    prs = Presentation()
    
    import os
    base_dir = os.getcwd()
    possible_logo_paths = [
        os.path.join(base_dir, 'public', 'pricing-engine-logo-new.png'),
        os.path.join(base_dir, 'pricing-engine-logo-new.png'),
    ]
    possible_bg_paths = [
        os.path.join(base_dir, 'public', 'ppt-background-data.png'),
        os.path.join(base_dir, 'ppt-background-data.png'),
    ]
    
    logo_path = next((p for p in possible_logo_paths if os.path.exists(p)), None)
    bg_path = next((p for p in possible_bg_paths if os.path.exists(p)), None)

    title = data.get('title', 'Reporte Dashboard')
    currency_symbol = data.get('currencySymbol', '$')
    date_str = datetime.now().strftime("%d/%m/%Y")
    
    # 1. Slide 1: Logo Cover
    if logo_path:
        create_logo_slide(prs, logo_path)
    else:
        create_title_slide(prs, "Pricing Engine", date_str)

    # 2. Slide 2: Data Intro
    create_intro_slide(prs, title, date_str, bg_path)
    
    # 3. Summary Slide
    summary = data.get('summary')
    if summary:
        create_summary_slide(prs, summary, currency_symbol)
        
    # 4. Data/Charts Slides
    sheets = data.get('sheets', [])
    for sheet in sheets:
        try:
            add_chart_slide(prs, sheet, currency_symbol)
        except Exception as e:
            print(f"Error creating chart/table slide {sheet.get('name')}: {e}")
            
    # 5. Last Slide: Logo Cover
    if logo_path:
        create_logo_slide(prs, logo_path)
        
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
