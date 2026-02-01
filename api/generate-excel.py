# Vercel Python Serverless Function for Excel Chart Generation
# Path: api/generate-excel.py

from http.server import BaseHTTPRequestHandler
import json
import io
from datetime import datetime, timedelta

# openpyxl imports
from openpyxl import Workbook
from openpyxl.chart import BarChart, LineChart, Reference
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter
import base64


# Styling constants
HEADER_FILL = PatternFill(start_color="1E293B", end_color="1E293B", fill_type="solid")
HEADER_FONT = Font(color="FFFFFF", bold=True, size=11)
ALT_ROW_FILL = PatternFill(start_color="F1F5F9", end_color="F1F5F9", fill_type="solid")
THIN_BORDER = Border(
    left=Side(style='thin', color='E2E8F0'),
    right=Side(style='thin', color='E2E8F0'),
    top=Side(style='thin', color='E2E8F0'),
    bottom=Side(style='thin', color='E2E8F0')
)


def style_header_row(ws, row, num_cols):
    for col in range(1, num_cols + 1):
        cell = ws.cell(row=row, column=col)
        cell.fill = HEADER_FILL
        cell.font = HEADER_FONT
        cell.alignment = Alignment(horizontal='center', vertical='center')
        cell.border = THIN_BORDER


def style_data_rows(ws, start_row, end_row, num_cols):
    for row in range(start_row, end_row + 1):
        for col in range(1, num_cols + 1):
            cell = ws.cell(row=row, column=col)
            if (row - start_row) % 2 == 1:
                cell.fill = ALT_ROW_FILL
            cell.border = THIN_BORDER


def create_bar_chart(ws, title, data_range, start_row, num_series):
    chart = BarChart()
    chart.type = "col"
    chart.grouping = "clustered"
    chart.title = title
    chart.style = 10
    chart.y_axis.title = "Valor"
    
    data = Reference(ws, min_col=2, min_row=start_row, max_col=1 + num_series, max_row=data_range)
    cats = Reference(ws, min_col=1, min_row=start_row + 1, max_row=data_range)
    
    chart.add_data(data, titles_from_data=True)
    chart.set_categories(cats)
    chart.width = 15
    chart.height = 10
    
    return chart


def create_stacked_chart(ws, title, data_range, start_row, num_series):
    """Stacked bar chart for composition/breakdown data"""
    chart = BarChart()
    chart.type = "col"
    chart.grouping = "stacked"  # STACKED instead of clustered
    chart.title = title
    chart.style = 10
    chart.y_axis.title = "Total"
    
    data = Reference(ws, min_col=2, min_row=start_row, max_col=1 + num_series, max_row=data_range)
    cats = Reference(ws, min_col=1, min_row=start_row + 1, max_row=data_range)
    
    chart.add_data(data, titles_from_data=True)
    chart.set_categories(cats)
    chart.width = 15
    chart.height = 10
    
    return chart


def create_line_chart(ws, title, data_range, start_row, num_series):
    chart = LineChart()
    chart.title = title
    chart.style = 10
    chart.y_axis.title = "Valor"
    
    data = Reference(ws, min_col=2, min_row=start_row, max_col=1 + num_series, max_row=data_range)
    cats = Reference(ws, min_col=1, min_row=start_row + 1, max_row=data_range)
    
    chart.add_data(data, titles_from_data=True)
    chart.set_categories(cats)
    chart.width = 15
    chart.height = 10
    
    return chart


def create_scatter_chart(ws, title, data_range, start_row, num_series):
    """Create a bubble chart for Matriz Posicionamiento where size = volume"""
    from openpyxl.chart import BubbleChart, Series, Reference
    
    chart = BubbleChart()
    chart.title = title
    chart.style = 10
    chart.x_axis.title = "Volumen"
    chart.y_axis.title = "Precio"
    chart.bubbleScale = 30  # Scale bubbles to 30% (smaller)
    
    # For Matriz Posicionamiento: Columns are [Marca-Modelo, Volumen, Precio Promedio]
    # We need: X = Volumen (col 2), Y = Precio (col 3), Size = Volumen (col 2)
    # BubbleChart uses: xvalues, yvalues, zvalues (size)
    
    x_values = Reference(ws, min_col=2, min_row=start_row + 1, max_row=data_range)  # Volumen as X
    y_values = Reference(ws, min_col=3, min_row=start_row + 1, max_row=data_range)  # Precio as Y  
    z_values = Reference(ws, min_col=2, min_row=start_row + 1, max_row=data_range)  # Volumen as size
    
    series = Series(values=y_values, xvalues=x_values, zvalues=z_values, title="Modelos")
    chart.series.append(series)
    
    chart.width = 15
    chart.height = 10
    
    return chart


def generate_excel(data):
    sheets = data.get('sheets', [])
    summary = data.get('summary', None)
    models = data.get('models', None)
    currency_symbol = data.get('currencySymbol', '$')
    timezone_offset = data.get('timezoneOffset', -3)
    title = data.get('title', 'REPORTE DE DASHBOARD')
    filters_data = data.get('filters', {})
    
    local_time = datetime.utcnow() + timedelta(hours=timezone_offset)
    
    wb = Workbook()
    default_sheet = wb.active
    
    # Summary Sheet (Dashboard style)
    if summary:
        ws = wb.create_sheet("Resumen Ejecutivo", 0)
        ws.sheet_view.showGridLines = False # White background
        ws['A1'] = title
        ws['A1'].font = Font(name="Avenir Black", bold=True, size=16)
        ws['A2'] = f"Generado: {local_time.strftime('%d/%m/%Y %H:%M')}"
        ws['A2'].font = Font(name="Avenir Medium", italic=True, color="666666")
        
        ws['A4'] = "Métrica"
        ws['B4'] = "Valor"
        style_header_row(ws, 4, 2)
        
        metrics = [
            ("Total Modelos", summary.get('total_models', 0)),
            ("Total Marcas", summary.get('total_brands', 0)),
            ("Precio Promedio", summary.get('avg_price', 0)),
            ("Precio Mediano", summary.get('median_price', 0)),
            ("Precio Mínimo", summary.get('min_price', 0)),
            ("Precio Máximo", summary.get('max_price', 0)),
            ("Desviación Estándar", summary.get('price_std_dev', 0)),
            ("Coef. Variación", summary.get('variation_coefficient', 0)),
            ("Descuento Promedio", summary.get('avg_discount_pct', 0)), 
        ]
        
        for i, (label, value) in enumerate(metrics):
            row = 5 + i
            # Apply Avenir Font
            c1 = ws.cell(row=row, column=1, value=label)
            c1.font = Font(name="Avenir Medium", size=10)
            c2 = ws.cell(row=row, column=2, value=value)
            c2.font = Font(name="Avenir Medium", size=10)
            
            if 2 <= i <= 6:
                c2.number_format = f'"{currency_symbol}" #,##0'
            elif i >= 7: 
                c2.number_format = '0.00%'
        
        style_data_rows(ws, 5, 13, 2)
        
        ws['A14'] = "Filtros Aplicados"
        ws['A14'].font = Font(name="Avenir Black", bold=True)
        
        filters = summary.get('filters', {})
        ws['A15'] = "Segmento:"
        ws['B15'] = ', '.join(filters.get('tipoVehiculo', [])) or "Todos"
        ws['A16'] = "Marca:"
        ws['B16'] = ', '.join(filters.get('brand', [])) or "Todas"
        ws['A17'] = "Modelo:"
        ws['B17'] = ', '.join(filters.get('model', [])) or "Todos"
        
        # Apply font to filters
        for r in range(15, 18):
            ws[f'A{r}'].font = Font(name="Avenir Medium", bold=True)
            ws[f'B{r}'].font = Font(name="Avenir Medium")

        ws.column_dimensions['A'].width = 25
        ws.column_dimensions['B'].width = 30
    
    # Info sheet for generic exports
    elif title and not summary:
        ws = wb.create_sheet("Información", 0)
        ws.sheet_view.showGridLines = False # White background
        ws['A1'] = title
        ws['A1'].font = Font(name="Avenir Black", bold=True, size=16)
        ws['A2'] = f"Generado: {local_time.strftime('%d/%m/%Y %H:%M')}"
        ws['A2'].font = Font(name="Avenir Medium", italic=True, color="666666")
        
        if filters_data:
            current_row = 4
            ws.cell(row=current_row, column=1, value="Filtros Aplicados").font = Font(name="Avenir Black", bold=True)
            current_row += 1
            
            for filter_name, filter_values in filters_data.items():
                if isinstance(filter_values, list) and len(filter_values) > 0:
                    ws.cell(row=current_row, column=1, value=f"{filter_name}:").font = Font(name="Avenir Medium", bold=True)
                    ws.cell(row=current_row, column=2, value=', '.join(filter_values)).font = Font(name="Avenir Medium")
                    current_row += 1
        
        ws.column_dimensions['A'].width = 20
        ws.column_dimensions['B'].width = 40
    
    # Chart sheets created below...

    # Models sheet
    if models and len(models) > 0:
        ws = wb.create_sheet("Modelos")
        ws.sheet_view.showGridLines = False # White background
        headers = ["Marca", "Modelo", "Versión", "Estado", "Tipo Vehículo", 
                  "Precio c/Bono", "Precio Lista", "Bono", "% Descuento"]
        
        for col, header in enumerate(headers, 1):
            cell = ws.cell(row=1, column=col, value=header)
            cell.font = Font(name="Avenir Medium", bold=True, color="FFFFFF")
        
        style_header_row(ws, 1, len(headers))
        
        for row_idx, model in enumerate(models, 2):
            ws.cell(row=row_idx, column=1, value=model.get('brand', ''))
            ws.cell(row=row_idx, column=2, value=model.get('model', ''))
            ws.cell(row=row_idx, column=3, value=model.get('submodel', '-'))
            ws.cell(row=row_idx, column=4, value=model.get('estado', 'N/A'))
            ws.cell(row=row_idx, column=5, value=model.get('tipo_vehiculo', 'N/A'))
            
            precio_bono = model.get('precio_con_bono', 0)
            precio_lista = model.get('precio_lista', 0)
            bono = model.get('bono', 0)
            
            # Calculate Discount % (Bono / Lista)
            if precio_lista and precio_lista > 0:
                diff = (bono / precio_lista)
            else:
                diff = 0
            
            ws.cell(row=row_idx, column=6, value=precio_bono).number_format = f'"{currency_symbol}" #,##0'
            ws.cell(row=row_idx, column=7, value=precio_lista).number_format = f'"{currency_symbol}" #,##0'
            ws.cell(row=row_idx, column=8, value=bono).number_format = f'"{currency_symbol}" #,##0'
            ws.cell(row=row_idx, column=9, value=diff).number_format = '0.0%'
        
        end_row = len(models) + 1
        style_data_rows(ws, 2, end_row, len(headers))
        
        widths = [15, 20, 25, 12, 15, 18, 18, 15, 15]
        for col, width in enumerate(widths, 1):
            ws.column_dimensions[get_column_letter(col)].width = width
    
    # Remove empty default sheet
    if 'Sheet' in wb.sheetnames:
        del wb['Sheet']
    
    # Save to BytesIO
    output = io.BytesIO()
    wb.save(output)
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
            
            filename = data.get('filename', f'Report_{datetime.now().strftime("%Y-%m-%d")}.xlsx')
            
            excel_bytes = generate_excel(data)
            
            self.send_response(200)
            self.send_header('Access-Control-Allow-Origin', '*')
            self.send_header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
            self.send_header('Content-Disposition', f'attachment; filename="{filename}"')
            self.send_header('Content-Length', len(excel_bytes))
            self.end_headers()
            self.wfile.write(excel_bytes)
            
        except Exception as e:
            self.send_response(500)
            self.send_header('Access-Control-Allow-Origin', '*')
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({"error": str(e)}).encode())
    
    def do_GET(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Content-Type', 'application/json')
        self.end_headers()
        self.wfile.write(json.dumps({"status": "ok", "service": "excel-chart-generator"}).encode())
