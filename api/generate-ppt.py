from http.server import BaseHTTPRequestHandler
import json
import io
from datetime import datetime
from pptx import Presentation
from pptx.util import Inches, Pt
from pptx.enum.chart import XL_CHART_TYPE, XL_LEGEND_POSITION
from pptx.chart.data import CategoryChartData, XyChartData, BubbleChartData
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN
import os
import base64
import io

try:
    from api.ppt_assets import LOGO_B64, BG_B64
except ImportError:
    try:
        from ppt_assets import LOGO_B64, BG_B64
    except:
        LOGO_B64 = None
        BG_B64 = None

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

def get_image_stream(b64_string):
    if not b64_string:
        return None
    return io.BytesIO(base64.b64decode(b64_string))

def create_logo_slide(prs):
    """Creates a slide with a large centered logo on Deep Navy background using embedded asset."""
    slide = prs.slides.add_slide(prs.slide_layouts[6]) 
    background = slide.background
    fill = background.fill
    fill.solid()
    fill.fore_color.rgb = DEEP_NAVY # #0D2841
    
    try:
        img_stream = get_image_stream(LOGO_B64)
        if img_stream:
            slide_width = prs.slide_width
            slide_height = prs.slide_height
            logo_width = Inches(5.5) 
            left = (slide_width - logo_width) / 2
            
            pic = slide.shapes.add_picture(img_stream, left, 0, width=logo_width)
            
            top = (slide_height - pic.height) / 2
            pic.top = int(top)
        else:
            print("Warning: LOGO_B64 not available")
    except Exception as e:
        print(f"Error adding logo to slide: {e}")

def create_title_slide(prs, title, date_str):
    """Fallback title slide if no images available"""
    slide = prs.slides.add_slide(prs.slide_layouts[0])
    slide.shapes.title.text = title
    if slide.placeholders[1]:
        slide.placeholders[1].text = date_str

def create_intro_slide(prs, title, date_str):
    """Creates intro slide with split background using embedded asset."""
    slide = prs.slides.add_slide(prs.slide_layouts[6]) 
    
    try:
        img_stream = get_image_stream(BG_B64)
        if img_stream:
            slide.shapes.add_picture(img_stream, 0, 0, width=prs.slide_width, height=prs.slide_height)
    except Exception as e:
        print(f"Error adding background to intro: {e}")
        
    # Text Layout for Split Background (Left side white space)
    left = Inches(0.8) # Left padding
    top = Inches(2.8)  # Vertical center alignment roughly
    width = Inches(4.5) 
    height = Inches(2.5)
    
    tb = slide.shapes.add_textbox(left, top, width, height)
    tf = tb.text_frame
    tf.word_wrap = True
    
    p_title = tf.paragraphs[0]
    p_title.text = title # Keep original casing or .title()
    p_title.font.name = "Avenir Black"
    p_title.font.size = Pt(40) # Large Title
    p_title.font.bold = True
    p_title.font.color.rgb = RGBColor(0, 0, 0) # Black text on White part
    p_title.alignment = PP_ALIGN.LEFT
    
    p_date = tf.add_paragraph()
    p_date.text = f"\nGenerado: {date_str}"
    p_date.font.name = "Avenir Medium"
    p_date.font.size = Pt(16)
    p_date.font.color.rgb = LIGHT_BLUE # Slate color for date
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
    
    
    # Heuristics based on chart name/title to apply specific formatting
    name_lower = str(chart_info.get('name') or chart_info.get('chart_title') or '').lower()
    
    # 1. Chart Types & Data Preparation
    if chart_type == 'scatter':
         ppt_chart_type = XL_CHART_TYPE.BUBBLE
         chart_data = BubbleChartData() 
         # ... existing scatter logic ...
         for r in rows:
            label = str(r[headers[0]])
            try:
                x_key = next((k for k in headers if 'volumen' in k.lower() or 'cant' in k.lower()), headers[1])
                y_key = next((k for k in headers if 'precio' in k.lower() or 'price' in k.lower()), headers[2])
                x_val = float(r.get(x_key, 0))
                y_val = float(r.get(y_key, 0))
                size_raw = float(r.get(x_key, 0))
                size_val = abs(size_raw) if abs(size_raw) > 0.0 else 1.0
                series = chart_data.add_series(label)
                series.add_data_point(x_val, y_val, size_val)
            except:
                continue
         
         # Force Bubble Chart Formatting specific to this chart type
         # We'll handle axis formatting in the generic block, but we ensure 'Matriz' is caught.
         pass
    else:
        ppt_chart_type = XL_CHART_TYPE.COLUMN_CLUSTERED
        if chart_type == 'line': ppt_chart_type = XL_CHART_TYPE.LINE
        elif chart_type == 'stacked': ppt_chart_type = XL_CHART_TYPE.COLUMN_STACKED
        
        # Override for Composition (Bar Chart requested implicitly by "Barras")? 
        # User said "Bars" for segmentation. If it's composition, use Column clustered usually, or Bar Clustered.
        # "Composición de Versiones" -> Image 1 looks like Column Chart actually (Vertical Bars).
        
        chart_data = CategoryChartData()
        chart_data.categories = categories
        for s_name in series_names:
            values = []
            for r in rows:
                val = r.get(s_name, 0)
                try: values.append(float(val) if val is not None else 0.0)
                except: values.append(0.0)
            chart_data.add_series(s_name, values)

    x, y, cx, cy = Inches(0.5), Inches(1.3), Inches(9), Inches(6.0)
    graphic_frame = slide.shapes.add_chart(ppt_chart_type, x, y, cx, cy, chart_data)
    chart = graphic_frame.chart
    
    # --- CHART FORMATTING APPLIED ---
    try:
        from pptx.enum.chart import XL_LABEL_POSITION, XL_TICK_MARK
        from pptx.dml.color import RGBColor
        
        chart.has_legend = True
        chart.legend.position = XL_LEGEND_POSITION.BOTTOM
        chart.legend.include_in_layout = False
        chart.legend.font.name = "Avenir Medium"
        chart.legend.font.size = Pt(9)
        
        plot = chart.plots[0]
        
        # 1. "Composición" -> Integers, Vary Colors
        if 'composición' in name_lower or 'composition' in name_lower:
            plot.vary_by_categories = True
            
            # Y-Axis Integer
            if chart.value_axis:
                chart.value_axis.tick_labels.number_format = '0'
                
        # 2. "Precios" or "Estructura" -> Currency, Data Labels Vertical Inside
        elif 'precio' in name_lower or 'price' in name_lower or 'estructura' in name_lower:
            # Y-Axis Currency
            if chart.value_axis:
                chart.value_axis.tick_labels.number_format = f'{currency_symbol} #,##0'
                # Only apply 5M steps if currency is CLP ($)
                if currency_symbol == '$':
                    chart.value_axis.major_unit = 5000000 
                else:
                     chart.value_axis.major_unit = None # Auto scale for UF/USD
            
            # Data Labels
            plot.has_data_labels = True
            data_labels = plot.data_labels
            data_labels.font.name = "Avenir Medium"
            data_labels.font.size = Pt(8)
            data_labels.position = XL_LABEL_POSITION.INSIDE_END
            data_labels.font.color.rgb = WHITE
            
            # --- XML HACK FOR VERTICAL TEXT (-270 deg) ---
            try:
                # We need to iterate over all points to set the rotation?
                # Actually, setting it on the DataLabels object might propagate or we need to access the element.
                # data_labels.element is the c:dLbls element.
                # We need to ensure that dLbls has a txPr (Text Properties) -> bodyPr -> rot="-5400000"
                
                from pptx.oxml.ns import qn
                
                # Check if txPr exists, create if not
                txPr = data_labels._element.get_or_add_txPr()
                # Check if bodyPr exists
                bodyPr = txPr.find(qn('a:bodyPr'))
                if bodyPr is None:
                     bodyPr = txPr.get_or_add_bodyPr()
                
                # Set rotation to -270 degrees (-5400000 EMUs). 
                # Positive 270 degrees is 16200000, but PowerPoint treats 270 as "Stacked" sometimes or -90.
                # "Rotate all text 270" corresponds to 'vert270' in standard presets, but custom rot is better.
                # Let's try rot="-5400000" (which is -90 deg, reading bottom to top)
                bodyPr.set('rot', '-5400000')
                bodyPr.set('vert', 'horz') # Ensure it's not trying to be "vertical stacked"
                
            except Exception as e:
                print(f"Error rotating labels: {e}")
            # ---------------------------------------------
            
        # 3. "Tendencia" (Trend) -> Percent Axis, Colored Bars
        elif 'tendencia' in name_lower or 'trend' in name_lower:
            plot.vary_by_categories = True
            if chart.value_axis:
                chart.value_axis.tick_labels.number_format = '0%'
            
            # Data Labels
            plot.has_data_labels = True
            data_labels = plot.data_labels
            data_labels.font.name = "Avenir Medium"
            data_labels.font.size = Pt(8)
            data_labels.position = XL_LABEL_POSITION.INSIDE_END
            data_labels.number_format = '0%'
            data_labels.font.color.rgb = WHITE # Contrast for colored bars
                
        # 4. "Volatilidad" (Volatility) -> Percent Axis, Smoothed Lines, Vertical Dates
        elif 'volatilidad' in name_lower or 'volatility' in name_lower:
            if chart.value_axis:
                chart.value_axis.tick_labels.number_format = '0.0%'
            
            # Smooth Lines
            for series in chart.series:
                series.smooth = True
                
            # Vertical X-Axis Labels (Dates)
            try:
                from pptx.enum.chart import XL_TICK_LABEL_POSITION
                category_axis = chart.category_axis
                category_axis.tick_labels.font.size = Pt(9)
                category_axis.tick_label_position = XL_TICK_LABEL_POSITION.LOW
                
                # XML Hack for Rotation (-90 degrees)
                from pptx.oxml.ns import qn
                txPr = category_axis._element.get_or_add_txPr()
                bodyPr = txPr.get_or_add_bodyPr()
                bodyPr.set('rot', '-5400000')
                bodyPr.set('vert', 'horz')
            except Exception as e:
                print(f"Error formatting volatility axis: {e}")

        # 5. "Matriz" (Scatter/Bubble) -> Fix Axes
        elif 'matriz' in name_lower or chart_type == 'scatter':
             # Y-Axis (Price) -> Currency
             if chart.value_axis:
                 chart.value_axis.tick_labels.number_format = f'{currency_symbol} #,##0'
                 chart.value_axis.minimum_scale = 0 # Force 0 start to avoid negative values
                 if currency_symbol == '$':
                     chart.value_axis.major_unit = 5000000
             
             # X-Axis (Volume) -> Integer, Min 0
             try:
                 x_axis = chart.category_axis
                 x_axis.tick_labels.number_format = '0'
                 x_axis.minimum_scale = 0
             except:
                 pass
                 
             # Reduce Bubble Size (XML Hack)
             try:
                 # chart.plots[0] is the BubblePlot
                 plot = chart.plots[0]
                 # Access the c:bubbleChart element
                 bubbleChart = plot._element
                 # Set scale to 60% (default is 100)
                 bubbleScale = bubbleChart.get_or_add_bubbleScale()
                 bubbleScale.val = 60
             except Exception as e:
                 print(f"Error scaling bubbles: {e}")

        # 6. "Benchmarking" -> Line Chart with Currency, Smoothing, Markers
        elif 'benchmarking' in name_lower:
             # Y-Axis (Price) -> Currency
             if chart.value_axis:
                 chart.value_axis.tick_labels.number_format = f'{currency_symbol} #,##0'
                 if currency_symbol == '$':
                     chart.value_axis.major_unit = 5000000
             
             # Lines: Smooth + Markers (for single point visibility)
             try:
                 from pptx.enum.chart import XL_MARKER_STYLE
                 for series in chart.series:
                     series.smooth = True
                     series.marker.style = XL_MARKER_STYLE.CIRCLE
                     series.marker.size = 7 # Visible but not huge
             except Exception as e:
                 print(f"Error setting markers: {e}")

        # Apply Brand Colors (if not varying by category)
        # Apply Brand Colors (if not varying by category)
        val_axis = chart.value_axis
        val_axis.has_major_gridlines = False # Clean Layout (No Grid)
        
        # Standard Color Cycle if not vary_by_categories
        if not plot.vary_by_categories and chart_type not in ['scatter']:
             brand_palette = [
                RGBColor(30, 41, 59),   # Dark Blue
                RGBColor(71, 85, 105),  # Light Blue
                RGBColor(59, 130, 246), # Accent Blue
                RGBColor(148, 163, 184) # Lighter Slate
            ]
             for i, series in enumerate(chart.series):
                color = brand_palette[i % len(brand_palette)]
                try:
                    if chart_type == 'line':
                         series.format.line.solid()
                         series.format.line.color.rgb = color
                    else:
                         series.format.fill.solid()
                         series.format.fill.fore_color.rgb = color
                except:
                    pass

    except Exception as e:
        print(f"Chart formatting warning: {e}")

    add_table_slide(prs, chart_info.get('chart_title', 'Datos'), rows, currency_symbol)

def generate_ppt(data):
    try:
        prs = Presentation()
        
        title = data.get('title', 'Reporte Dashboard')
        currency_symbol = data.get('currencySymbol', '$')
        date_str = datetime.now().strftime("%d/%m/%Y")
        
        # 1. Slide 1: Logo Cover
        create_logo_slide(prs)
    
        # 2. Slide 2: Intro
        create_intro_slide(prs, title, date_str)
        
        # 3. Summary Slide (Same as Excel Summary Sheet)
        summary = data.get('summary')
        if summary:
            try:
                create_summary_slide(prs, summary, currency_symbol)
            except Exception as e:
                print(f"Summary slide error: {e}")
            
        # 4. Sheets (Charts + Data Tables)
        sheets = data.get('sheets', [])
        for sheet in sheets:
            try:
                add_chart_slide(prs, sheet, currency_symbol)
            except Exception as e:
                print(f"Error creating chart/table slide {sheet.get('name')}: {e}")
                
        # 5. Models Data (Raw Table)
        models = data.get('models', [])
        if models:
            model_rows = []
            for m in models:
                 p_lista = float(m.get('precio_lista', 0) or 0)
                 bono = float(m.get('bono', 0) or 0)
                 dsc = (bono / p_lista) if p_lista > 0 else 0
                 
                 model_rows.append({
                     "Marca": m.get('brand'),
                     "Modelo": m.get('model'),
                     "Versión": m.get('submodel', '-'),
                     "Estado": m.get('estado', 'N/A'),
                     "Precio Lista": m.get('precio_lista', 0),
                     "Bono": m.get('bono', 0),
                     "Precio Final": m.get('precio_con_bono', 0),
                     "% Desc.": dsc
                 })
            
            try:
                add_table_slide(prs, "Detalle de Modelos", model_rows, currency_symbol)
            except Exception as e:
                print(f"Error adding models table: {e}")

        # 6. Last Slide: Logo Cover
        create_logo_slide(prs)
            
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
