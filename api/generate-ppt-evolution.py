from http.server import BaseHTTPRequestHandler
import json
import io
from datetime import datetime
from pptx import Presentation
from pptx.util import Inches, Pt
from pptx.enum.chart import XL_CHART_TYPE, XL_LEGEND_POSITION
from pptx.chart.data import CategoryChartData, XyChartData
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
    sys.path.append(os.path.dirname(os.path.abspath(__file__)))
    from ppt_shared import (
        DARK_BLUE, DEEP_NAVY, LIGHT_BLUE, WHITE,
        format_value, set_font, create_logo_slide, create_intro_slide
    )

def add_chart_slide(prs, chart_info, currency_symbol='$'):
    slide = prs.slides.add_slide(prs.slide_layouts[5])
    slide.shapes.title.text = chart_info.get('chart_title', 'Gráfico de Evolución')
    set_font(slide.shapes.title, font_name="Avenir Black", font_size=Pt(28), bold=True, color=DARK_BLUE)
    
    chart_type = chart_info.get('chart_type', 'line')
    rows = chart_info.get('data', [])
    if not rows: return

    headers = list(rows[0].keys())
    categories = [str(r[headers[0]]) for r in rows]
    series_names = headers[1:] 
    
    # Evolution is almost always Line Chart
    ppt_chart_type = XL_CHART_TYPE.LINE
    
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
        from pptx.enum.chart import XL_TICK_LABEL_POSITION
        
        chart.has_legend = True
        chart.legend.position = XL_LEGEND_POSITION.BOTTOM
        chart.legend.include_in_layout = False
        chart.legend.font.name = "Avenir Medium"
        chart.legend.font.size = Pt(9)
        
        # Y-Axis Currency
        if chart.value_axis:
            chart.value_axis.tick_labels.number_format = f'"{currency_symbol}" #,##0'
            # Evolution usually ranges large numbers, auto scale is best, but if we want consistency:
            # chart.value_axis.major_unit = 5000000 
        
        # X-Axis Dates
        if chart.category_axis:
             chart.category_axis.tick_labels.font.size = Pt(9)
             chart.category_axis.tick_label_position = XL_TICK_LABEL_POSITION.LOW
             
             # Rotate Date Labels
             from pptx.oxml.ns import qn
             txPr = chart.category_axis._element.get_or_add_txPr()
             bodyPr = txPr.get_or_add_bodyPr()
             bodyPr.set('rot', '-5400000') # -90 deg
             bodyPr.set('vert', 'horz')

        # Smooth Lines for Evolution
        for series in chart.series:
            series.smooth = True

    except Exception as e:
        print(f"Error formatting evolution chart: {e}")

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
        title = data.get('reportTitle', 'Evolución de Precios')
        create_intro_slide(prs, title, today)
        
        # 3. Currency
        currency_symbol = data.get('currency', '$')
        
        # 4. Content
        slides_content = data.get('slides', [])
        
        for slide_data in slides_content:
            if slide_data.get('type') == 'chart':
                add_chart_slide(prs, slide_data, currency_symbol)
            # Evolution page usually only has charts, but we can support tables if needed
                
        # 5. Closing
        create_logo_slide(prs)
        
        ppt_stream = io.BytesIO()
        prs.save(ppt_stream)
        ppt_stream.seek(0)
        
        self.send_response(200)
        self.send_header('Content-type', 'application/vnd.openxmlformats-officedocument.presentationml.presentation')
        self.send_header('Content-Disposition', 'attachment; filename="reporte_evolucion.pptx"')
        self.end_headers()
        self.wfile.write(ppt_stream.getvalue())
