# TRACE/LAB — Image Forgery Detection Frontend

Static HTML/CSS/JavaScript interface that uploads an image to the existing FastAPI API.

## API
- Base URL: `https://forgery-detection-1o7g.onrender.com`
- Health check: `GET /health`
- Prediction: `POST /predict` with multipart form field named `file`
- Expected prediction response: `{ "label": "authentic|tampered", "confidence": 0.0 }`

## Run locally
Open `index.html` using a local static server (recommended):

```bash
python -m http.server 5500
```
Then visit `http://localhost:5500`.

## CORS note
The backend's `app/main.py` currently does not include CORS middleware. A browser hosted on a different origin will block calls to the API unless CORS is enabled in the backend. Add the FastAPI CORSMiddleware configuration before deployment (example below), then redeploy backend:

```python
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5500", "https://YOUR-FRONTEND-DOMAIN"],
    allow_credentials=False,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)
```
For quick testing, `allow_origins=["*"]` can be used if the API does not use credentials; for production, restrict origins to the actual frontend domain.
