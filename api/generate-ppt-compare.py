from http.server import BaseHTTPRequestHandler
import json
import io
from datetime import datetime
from pptx import Presentation
from pptx.util import Inches, Pt
from pptx.enum.chart import XL_CHART_TYPE, XL_LEGEND_POSITION
from pptx.chart.data import CategoryChartData, XyChartData, BubbleChartData
from pptx.enum.text import PP_ALIGN
import sys
import os

# Import shared components
try:
    from api.ppt_shared import (
        DARK_BLUE, DEEP_NAVY, LIGHT_BLUE, WHITE,
        format_value, set_font, create_logo_slide, create_intro_slide
    )
except ImportError:
    # Handle running as script vs module
    sys.path.append(os.path.dirname(os.path.abspath(__file__)))
    from ppt_shared import (
        DARK_BLUE, DEEP_NAVY, LIGHT_BLUE, WHITE,
        format_value, set_font, create_logo_slide, create_intro_slide
    )

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
    
    name_lower = str(chart_info.get('name') or chart_info.get('chart_title') or '').lower()
    
    # Standard Chart Logic (Cloned from Dashboard to ensure consistency)
    if chart_type == 'scatter':
         ppt_chart_type = XL_CHART_TYPE.BUBBLE
         chart_data = BubbleChartData() 
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

    x, y, cx, cy = Inches(0.5), Inches(1.3), Inches(9), Inches(6.0)
    graphic_frame = slide.shapes.add_chart(ppt_chart_type, x, y, cx, cy, chart_data)
    chart = graphic_frame.chart
    
    try:
        from pptx.enum.chart import XL_LABEL_POSITION
        
        chart.has_legend = True
        chart.legend.position = XL_LEGEND_POSITION.BOTTOM
        chart.legend.include_in_layout = False
        chart.legend.font.name = "Avenir Medium"
        chart.legend.font.size = Pt(9)
        
        plot = chart.plots[0]
        
        # Apply specific formatting rules
        if 'composición' in name_lower or 'composition' in name_lower:
            plot.vary_by_categories = True
            if chart.value_axis:
                chart.value_axis.tick_labels.number_format = '0'
                
                # Dynamic scaling fix from Dashboard
                try:
                    max_val = 0
                    if chart_type == 'stacked':
                        relevant_headers = [h for h in rows[0].keys() if h != headers[0]]
                        for r in rows:
                            row_sum = sum(float(r.get(h, 0)) for h in relevant_headers)
                            if row_sum > max_val: max_val = row_sum
                    else:
                        relevant_headers = [h for h in rows[0].keys() if h != headers[0]]
                        for r in rows:
                            for h in relevant_headers:
                                val = float(r.get(h, 0))
                                if val > max_val: max_val = val
                    
                    if max_val <= 10:
                        chart.value_axis.major_unit = 1.0
                    else:
                        chart.value_axis.major_unit = None
                except:
                    chart.value_axis.major_unit = 1.0

        elif 'precio' in name_lower or 'price' in name_lower or 'estructura' in name_lower:
            if chart.value_axis:
                chart.value_axis.tick_labels.number_format = f'"{currency_symbol}" #,##0'
                if currency_symbol == '$':
                    chart.value_axis.major_unit = 5000000 
                else:
                     chart.value_axis.major_unit = None
            
            plot.has_data_labels = True
            data_labels = plot.data_labels
            data_labels.font.name = "Avenir Medium"
            data_labels.font.size = Pt(8)
            data_labels.position = XL_LABEL_POSITION.INSIDE_END
            data_labels.font.color.rgb = WHITE
            data_labels.number_format = f'"{currency_symbol}" #,##0'
            
            try:
                from pptx.oxml.ns import qn
                txPr = data_labels._element.get_or_add_txPr()
                bodyPr = txPr.find(qn('a:bodyPr'))
                if bodyPr is None:
                     bodyPr = txPr.get_or_add_bodyPr()
                bodyPr.set('rot', '-5400000')
                bodyPr.set('vert', 'horz')
            except Exception as e:
                print(f"Error rotating labels: {e}")

        elif 'tendencia' in name_lower or 'trend' in name_lower:
            plot.vary_by_categories = True
            if chart.value_axis:
                chart.value_axis.tick_labels.number_format = '0%'
            plot.has_data_labels = True
            data_labels = plot.data_labels
            data_labels.font.name = "Avenir Medium"
            data_labels.font.size = Pt(8)
            data_labels.position = XL_LABEL_POSITION.INSIDE_END
            data_labels.number_format = '0%'
            data_labels.font.color.rgb = WHITE
            for series in chart.series:
                series.invert_if_negative = False

        elif 'matriz' in name_lower or chart_type == 'scatter':
             if chart.value_axis:
                 chart.value_axis.tick_labels.number_format = f'"{currency_symbol}" #,##0'
                 chart.value_axis.minimum_scale = 0
                 if currency_symbol == '$':
                     chart.value_axis.major_unit = 5000000
             try:
                 x_axis = chart.category_axis
                 x_axis.tick_labels.number_format = '0'
                 x_axis.minimum_scale = 0
                 x_axis.major_unit = 1
             except:
                 pass
             try:
                 plot = chart.plots[0]
                 bubbleChart = plot._element
                 bubbleScale = bubbleChart.find(qn('c:bubbleScale')) # This selector might need verification
             except:
                 pass

    except Exception as e:
        print(f"Error formatting chart: {e}")

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
            cell.fill.fore_color.rgb = DARK_BLUE 
            tf = cell.text_frame.paragraphs[0]
            tf.font.color.rgb = WHITE
            tf.font.bold = True
            tf.font.name = "Avenir Medium"
            tf.font.size = Pt(10)
            tf.alignment = PP_ALIGN.CENTER

        for r, row_data in enumerate(chunk):
            for c, header in enumerate(headers):
                val = row_data.get(header)
                cell = table.cell(r + 1, c)
                
                h_str = str(header).lower()
                fmt = None
                
                if any(x in h_str for x in ['%', 'percent', 'variación', 'variation', 'coef', 'descuento']):
                    fmt = 'percent'
                elif any(x in h_str for x in ['cantidad', 'cant.', 'volumen', 'total', 'count']):
                    fmt = 'integer'
                elif any(x in h_str for x in ['precio', 'price', 'monto', 'valor', 'avg', 'min', 'max']):
                    fmt = 'currency'
                
                if 'año' in h_str or 'year' in h_str: fmt = None

                cell.text = format_value(val, fmt, currency_symbol)
                tf = cell.text_frame.paragraphs[0]
                tf.font.name = "Avenir Medium"
                tf.font.size = Pt(9)
                
                if fmt in ['currency', 'percent', 'integer']:
                     tf.alignment = PP_ALIGN.RIGHT
                else:
                     tf.alignment = PP_ALIGN.LEFT

class handler(BaseHTTPRequestHandler):
    def do_POST(self):
        content_len = int(self.headers.get('Content-Length', 0))
        post_body = self.rfile.read(content_len)
        data = json.loads(post_body)
        
        prs = Presentation()
        
        # 1. Cover
        create_logo_slide(prs)
        
        # 2. Intro
        today = datetime.now().strftime("%d/%m/%Y")
        title = data.get('reportTitle', 'Reporte Comparativo')
        create_intro_slide(prs, title, today)
        
        # 3. Currency Context
        currency_symbol = data.get('currency', '$')
        
        # 4. Content Slides (Charts & Tables)
        # Note: Compare page sends 'charts' and 'tables'
        slides_content = data.get('slides', [])
        
        # If slides are passed as a list
        for slide_data in slides_content:
            if slide_data.get('type') == 'chart':
                add_chart_slide(prs, slide_data, currency_symbol)
            elif slide_data.get('type') == 'table':
                add_table_slide(prs, slide_data.get('title', 'Tabla'), slide_data.get('data', []), currency_symbol)
                
        # 5. Closing Slide
        create_logo_slide(prs)
        
        ppt_stream = io.BytesIO()
        prs.save(ppt_stream)
        ppt_stream.seek(0)
        
        self.send_response(200)
        self.send_header('Content-type', 'application/vnd.openxmlformats-officedocument.presentationml.presentation')
        self.send_header('Content-Disposition', 'attachment; filename="reporte_comparar.pptx"')
        self.end_headers()
        self.wfile.write(ppt_stream.getvalue())
