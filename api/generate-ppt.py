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
import os

# Brand Colors (Institutional)
# Brand Colors (Institutional)
DARK_BLUE = RGBColor(30, 41, 59)  # Slate 900 #1E293B
DEEP_NAVY = RGBColor(13, 40, 65)  # #0D2841 (Cover BG)
LIGHT_BLUE = RGBColor(71, 85, 105) # Slate 600
WHITE = RGBColor(255, 255, 255)

def format_value(val, fmt=None, currency='$'):
    if val is None: return "-"
    try:
        val_float = float(val)
        if fmt == 'currency':
             if currency == 'UF':
                 return f"UF {val_float:,.2f}".replace(",", ".")
             else:
                 return f"{currency} {val_float:,.0f}".replace(",", ".")
        elif fmt == 'percent':
            return f"{val_float * 100:.1f}%"
        elif fmt == 'integer':
             return f"{val_float:,.0f}".replace(",", ".")
        elif isinstance(val, (int, float)):
            return f"{val_float:,.0f}" if val_float.is_integer() else f"{val_float:.2f}"
    except:
        pass
    return str(val)

def set_font(shape, font_name="Avenir Medium", font_size=None, bold=False, color=None):
    if not shape.has_text_frame:
        return
    for paragraph in shape.text_frame.paragraphs:
        for run in paragraph.runs:
            run.font.name = font_name
            if font_size: run.font.size = font_size
            if bold is not None: run.font.bold = bold
            if color: run.font.color.rgb = color

def create_logo_slide(prs, logo_path):
    """Creates a slide with a large centered logo on Deep Navy background."""
    slide = prs.slides.add_slide(prs.slide_layouts[6]) 
    background = slide.background
    fill = background.fill
    fill.solid()
    fill.fore_color.rgb = DEEP_NAVY # #0D2841
    
    try:
        slide_width = prs.slide_width
        slide_height = prs.slide_height
        logo_width = Inches(5)
        left = (slide_width - logo_width) / 2
        pic = slide.shapes.add_picture(logo_path, left, 0, width=logo_width)
        top = (slide_height - pic.height) / 2
        pic.top = int(top)
    except Exception as e:
        print(f"Error adding logo to slide: {e}")

def create_intro_slide(prs, title, date_str, bg_path):
    """Creates intro slide with split background."""
    slide = prs.slides.add_slide(prs.slide_layouts[6]) 
    
    try:
        # Fit background
        slide.shapes.add_picture(bg_path, 0, 0, width=prs.slide_width, height=prs.slide_height)
    except Exception as e:
        print(f"Error adding background: {e}")
        
    left = Inches(0.5)
    top = Inches(2.5)
    width = Inches(5.5) 
    height = Inches(2.5)
    
    tb = slide.shapes.add_textbox(left, top, width, height)
    tf = tb.text_frame
    tf.word_wrap = True
    
    p_title = tf.paragraphs[0]
    p_title.text = title.upper()
    p_title.font.name = "Avenir Black" # Template uses Black
    p_title.font.size = Pt(44)
    p_title.font.bold = True
    p_title.font.color.rgb = DARK_BLUE
    p_title.alignment = PP_ALIGN.LEFT
    
    p_date = tf.add_paragraph()
    p_date.text = f"\nGenerado el: {date_str}"
    p_date.font.name = "Avenir Medium"
    p_date.font.size = Pt(18)
    p_date.font.color.rgb = LIGHT_BLUE
    p_date.alignment = PP_ALIGN.LEFT

def create_summary_slide(prs, summary, currency_symbol):
    slide = prs.slides.add_slide(prs.slide_layouts[5])
    slide.shapes.title.text = "Resumen Ejecutivo"
    set_font(slide.shapes.title, font_name="Avenir Black", font_size=Pt(32), bold=True, color=DARK_BLUE)
    
    rows = 10
    cols = 2
    shape = slide.shapes.add_table(rows, cols, Inches(1.5), Inches(2), Inches(7), Inches(4))
    table = shape.table
    table.columns[0].width = Inches(3.5)
    table.columns[1].width = Inches(3.5)
    
    # Header
    table.cell(0, 0).text = "Métrica"
    table.cell(0, 1).text = "Valor"
    for c in range(2):
        cell = table.cell(0, c)
        cell.fill.solid()
        cell.fill.fore_color.rgb = DARK_BLUE # #1E293B
        cell.text_frame.paragraphs[0].font.color.rgb = WHITE
        cell.text_frame.paragraphs[0].font.bold = True
        cell.text_frame.paragraphs[0].font.name = "Avenir Medium" # Template Header Font
    
    metrics = [
        ("Total Modelos", summary.get('total_models', 0), 'integer'),
        ("Total Marcas", summary.get('total_brands', 0), 'integer'),
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
        c1.text_frame.paragraphs[0].font.name = "Avenir Medium"
        c2 = table.cell(row, 1)
        c2.text = format_value(val, fmt, currency_symbol)
        c2.text_frame.paragraphs[0].font.name = "Avenir Medium"
        c2.text_frame.paragraphs[0].alignment = PP_ALIGN.RIGHT

def add_table_slide(prs, title, rows, currency_symbol='$'):
    if not rows: return
    MAX_ROWS = 12
    chunks = [rows[i:i + MAX_ROWS] for i in range(0, len(rows), MAX_ROWS)]
    
    for i, chunk in enumerate(chunks):
        slide = prs.slides.add_slide(prs.slide_layouts[5])
        slide_title = f"{title}" if i == 0 else f"{title} (Cont.)"
        slide.shapes.title.text = slide_title
        set_font(slide.shapes.title, font_name="Avenir Black", font_size=Pt(28), bold=True, color=DARK_BLUE)
        
        headers = list(rows[0].keys())
        shape = slide.shapes.add_table(len(chunk)+1, len(headers), Inches(0.5), Inches(1.5), Inches(9), Inches(0.4*(len(chunk)+1)))
        table = shape.table
        
        for c, header in enumerate(headers):
            cell = table.cell(0, c)
            cell.text = str(header)
            cell.fill.solid()
            cell.fill.fore_color.rgb = DARK_BLUE # #1E293B
            tf = cell.text_frame.paragraphs[0]
            tf.font.color.rgb = WHITE
            tf.font.bold = True
            tf.font.name = "Avenir Medium" # Template Header Font https://github.com/scanny/python-pptx/issues/455
            tf.font.size = Pt(10)
            tf.alignment = PP_ALIGN.CENTER

        for r, row_data in enumerate(chunk):
            for c, header in enumerate(headers):
                val = row_data.get(header)
                cell = table.cell(r + 1, c)
                
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
                        fmt = 'percent'
                elif "precio" in t_str or "price" in t_str:
                     if isinstance(val, (int, float)): fmt = 'currency'
                
                if 'año' in h_str or 'year' in h_str: fmt = None

                cell.text = format_value(val, fmt, currency_symbol)
                tf = cell.text_frame.paragraphs[0]
                tf.font.name = "Avenir Medium" # Template Body Font
                tf.font.size = Pt(9)
                
                if fmt in ['currency', 'percent', 'integer']:
                     tf.alignment = PP_ALIGN.RIGHT
                else:
                     tf.alignment = PP_ALIGN.LEFT

def add_chart_slide(prs, chart_info, currency_symbol='$'):
    slide = prs.slides.add_slide(prs.slide_layouts[5])
    slide.shapes.title.text = chart_info.get('chart_title', 'Gráfico')
    set_font(slide.shapes.title, font_name="Avenir Black", font_size=Pt(28), bold=True, color=DARK_BLUE)
    
    chart_type = chart_info.get('chart_type', 'bar')
    rows = chart_info.get('data', [])
    if not rows: return

    headers = list(rows[0].keys())
    categories = [str(r[headers[0]]) for r in rows]
    series_names = headers[1:] # Assuming rest are series
    
    if chart_type == 'scatter':
         ppt_chart_type = XL_CHART_TYPE.XY_SCATTER
         chart_data = XyChartData()
         # Series per point logic
         for r in rows:
            label = str(r[headers[0]])
            try:
                x_key = next((k for k in headers if 'volumen' in k.lower() or 'cant' in k.lower()), headers[1])
                y_key = next((k for k in headers if 'precio' in k.lower() or 'price' in k.lower()), headers[2])
                x_val = float(r.get(x_key, 0))
                y_val = float(r.get(y_key, 0))
                series = chart_data.add_series(label)
                series.add_data_point(x_val, y_val)
            except:
                continue
    else:
        ppt_chart_type = XL_CHART_TYPE.COLUMN_CLUSTERED
        if chart_type == 'line': ppt_chart_type = XL_CHART_TYPE.LINE
        elif chart_type == 'stacked': ppt_chart_type = XL_CHART_TYPE.COLUMN_STACKED
        
        chart_data = CategoryChartData()
        chart_data.categories = categories
        for s_name in series_names:
            values = []
            for r in rows:
                val = r.get(s_name, 0)
                try: values.append(float(val) if val is not None else 0.0)
                except: values.append(0.0)
            chart_data.add_series(s_name, values)

    x, y, cx, cy = Inches(0.5), Inches(1.5), Inches(9), Inches(5.0)
    graphic_frame = slide.shapes.add_chart(ppt_chart_type, x, y, cx, cy, chart_data)
    chart = graphic_frame.chart
    
    # Chart Styling & Data Labels
    try:
        chart.has_legend = True
        chart.legend.position = XL_LEGEND_POSITION.BOTTOM
        chart.legend.include_in_layout = False
        chart.legend.font.name = "Avenir Medium"
        chart.legend.font.size = Pt(9)
        
        # Apply Brand Colors to Series
        # Palette: Dark Blue, Light Blue, maybe a Grey or distinct Accent
        from pptx.dml.color import RGBColor
        brand_palette = [
            RGBColor(30, 41, 59),   # Dark Blue
            RGBColor(71, 85, 105),  # Light Blue/Slate
            RGBColor(59, 130, 246), # Accent Blue (Bright)
            RGBColor(148, 163, 184) # Lighter Slate
        ]
        
        if chart_type != 'pie': # Pie charts have different accessors
             for i, series in enumerate(chart.series):
                color = brand_palette[i % len(brand_palette)]
                
                try:
                    # For Scatter (Markers)
                    if chart_type == 'scatter':
                         series.marker.format.fill.solid()
                         series.marker.format.fill.fore_color.rgb = color
                         series.marker.format.line.fill.solid()
                         series.marker.format.line.fill.fore_color.rgb = color
                    # For Line (Lines)
                    elif chart_type == 'line':
                         series.format.line.solid()
                         series.format.line.color.rgb = color
                    # For Bar/Column (Fill)
                    else:
                         series.format.fill.solid()
                         series.format.fill.fore_color.rgb = color
                except:
                    pass

        # Enable Data Labels (Exclude Scatter/Line to avoid clutter/errors)
        if chart_type not in ['line', 'scatter']:
            try:
                plot = chart.plots[0]
                plot.has_data_labels = True
                data_labels = plot.data_labels
                data_labels.font.name = "Avenir Medium"
                data_labels.font.size = Pt(8)
                data_labels.font.color.rgb = DARK_BLUE
                # data_labels.number_format = '0.0%' if 'share' in str(chart_info).lower() else '#,##0'
                
            except Exception as e:
                print(f"Data Labels warning: {e}")
    except Exception as e:
        print(f"Chart formatting warning: {e}")

    add_table_slide(prs, chart_info.get('chart_title', 'Datos'), rows, currency_symbol)

def generate_ppt(data):
    try:
        prs = Presentation()
        base_dir = os.getcwd()
        
        logo_path = os.path.join(base_dir, 'public', 'logo-white-full.png')
        if not os.path.exists(logo_path):
             logo_path = os.path.join(base_dir, 'public', 'pricing-engine-logo-new.png')
    
        bg_path = os.path.join(base_dir, 'public', 'ppt-background-split.png')
        
        title = data.get('title', 'Reporte Dashboard')
        currency_symbol = data.get('currencySymbol', '$')
        date_str = datetime.now().strftime("%d/%m/%Y")
        
        # 1. Slide 1: Logo Cover
        if os.path.exists(logo_path):
            create_logo_slide(prs, logo_path)
        else:
            create_title_slide(prs, "Pricing Engine", date_str)
    
        # 2. Slide 2: Data Intro
        if os.path.exists(bg_path):
            create_intro_slide(prs, title, date_str, bg_path)
        else:
            create_title_slide(prs, title, date_str)
        
        # 3. Summary Slide
        summary = data.get('summary')
        if summary:
            try:
                create_summary_slide(prs, summary, currency_symbol)
            except Exception as e:
                print(f"Summary slide error: {e}")
            
        # 4. Data/Charts Slides
        sheets = data.get('sheets', [])
        for sheet in sheets:
            try:
                add_chart_slide(prs, sheet, currency_symbol)
            except Exception as e:
                print(f"Error creating chart/table slide {sheet.get('name')}: {e}")
                try:
                     # Add error placeholder slide
                    slide = prs.slides.add_slide(prs.slide_layouts[5])
                    slide.shapes.title.text = f"Error in {sheet.get('name')}"
                    slide.shapes.add_textbox(Inches(1), Inches(2), Inches(8), Inches(1)).text = str(e)
                except: pass
                
        # 5. Last Slide: Logo Cover
        if os.path.exists(logo_path):
            create_logo_slide(prs, logo_path)
            
        output = io.BytesIO()
        prs.save(output)
        output.seek(0)
        return output.getvalue()

    except Exception as global_e:
        # Fallback: Create a simple error presentation
        print(f"CRITICAL ERROR GENERATING PPT: {global_e}")
        import traceback
        traceback.print_exc()
        
        err_prs = Presentation()
        slide = err_prs.slides.add_slide(err_prs.slide_layouts[0])
        slide.shapes.title.text = "Error Generando Reporte"
        slide.placeholders[1].text = f"Detalles: {str(global_e)}\n\nConsulte los logs del servidor."
        
        output = io.BytesIO()
        err_prs.save(output)
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
