# Excel Chart Generator Service

Microservicio Python que genera archivos Excel con gráficos nativos usando openpyxl.

## Deployment a Render

1. Ir a [render.com](https://render.com) y crear cuenta
2. Click en "New +" → "Web Service"
3. Conectar repositorio GitHub
4. Configurar:
   - **Name**: excel-chart-generator
   - **Environment**: Python 3
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `gunicorn main:app --bind 0.0.0.0:$PORT`
5. Click "Create Web Service"

## Endpoint

**POST** `/generate-excel`

```json
{
  "filename": "Report.xlsx",
  "currencySymbol": "$",
  "summary": {
    "total_models": 150,
    "total_brands": 25,
    "avg_price": 25000000,
    "filters": {
      "tipoVehiculo": ["SUV"],
      "brand": ["Toyota"]
    }
  },
  "sheets": [
    {
      "name": "Precios",
      "chart_type": "bar",
      "chart_title": "Precios por Segmento",
      "data": [
        {"Segmento": "SUV", "Promedio": 25000, "Mínimo": 15000}
      ]
    }
  ],
  "models": [
    {
      "brand": "Toyota",
      "model": "RAV4",
      "submodel": "2.0 XLE",
      "precio_con_bono": 24990000,
      "precio_lista": 25990000,
      "bono": 1000000
    }
  ]
}
```

## Local Development

```bash
cd excel-service
pip install -r requirements.txt
python main.py
```

Server will run at http://localhost:5000
