# WindWise UK — Wind Generation Forecast Analysis

**Live dashboard:** https://windwise-uk.vercel.app  
**Backend API:** https://windwise-uk-1.onrender.com  
**GitHub repository:** https://github.com/sumsinh/windwise-uk

## Overview

WindWise UK is a full-stack dashboard for comparing UK wind generation forecasts with actual generation during January 2026. It presents forecast accuracy metrics, visual comparisons, delivery-period records, and data-coverage diagnostics.

## Features

- Interactive dashboard with KPI cards
- Daily forecast-versus-actual generation chart
- Mean Absolute Error (MAE), Root Mean Square Error (RMSE), and forecast bias
- Forecast coverage diagnostics
- Searchable and filterable delivery-period table
- CSV export of displayed records
- Django REST API backed by Elexon BMRS data

## Technology Stack

**Frontend**
- React and Vite
- Tailwind CSS
- Recharts
- Lucide React

**Backend**
- Python
- Django
- Django REST Framework
- Requests

**Data source**
- Elexon BMRS API
- `FUELHH` — actual wind generation
- `WINDFOR` — wind generation forecasts

## Live Services

| Service | URL |
|---|---|
| Frontend dashboard | https://windwise-uk.vercel.app |
| Backend health check | https://windwise-uk-1.onrender.com/api/health/ |
| Forecast accuracy API | https://windwise-uk-1.onrender.com/api/accuracy/ |

## Analysis Period and Methodology

The analysis covers January 1–31, 2026.

The backend retrieves actual wind generation and forecast records, applies a configured day-ahead publication cutoff, matches eligible forecasts to actual generation by delivery timestamp, and calculates accuracy metrics.

- **MAE:** Average absolute difference between forecast and actual generation.
- **RMSE:** Square root of the average squared forecast error.
- **Bias:** Average signed error, calculated as forecast minus actual. Positive bias indicates overforecasting.
- **Coverage:** Percentage of actual delivery timestamps with a matching eligible forecast.

### Data limitations

The retrieved `WINDFOR` records have hourly target timestamps, whereas the `FUELHH` actual-generation records are half-hourly. The implementation matches exact timestamps and does not interpolate or fabricate missing forecasts.

The current analysis therefore covers matched periods, with observed coverage of approximately 50%. Results should not be interpreted as full half-hourly coverage.

The day-ahead cutoff is configured as 10:00 UK time on the day before delivery. This is a modelling assumption that should be checked against the assignment's purchasing-decision requirements.

## Run Locally

### Prerequisites

- Python 3.12 or a compatible version
- Node.js and npm
- Git

### 1. Clone the repository

```bash
git clone https://github.com/sumsinh/windwise-uk.git
cd windwise-uk
```

### 2. Start the backend

In PowerShell:

```powershell
cd backend
py -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver
```

The backend runs at `http://127.0.0.1:8000`.

### 3. Start the frontend

Open a second terminal:

```powershell
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173`.

For local development, the frontend defaults to `http://127.0.0.1:8000` for the API. In production, configure `VITE_API_URL` to the deployed backend URL and allow the frontend origin in Django CORS settings.

## Deployment

- Frontend deployed on Vercel.
- Backend deployed on Render.
- Dockerfiles and Docker Compose configuration are included in the repository for container-based local development.

## AI Tool Disclosure

AI assistance was used during development for code drafting, debugging, dashboard implementation, and documentation. The implementation and analysis should be reviewed against the assignment requirements.

## Future Improvements

- Identify a suitable historical forecast source covering every required settlement period.
- Verify the required forecast publication cutoff against the assignment specification.
- Add automated tests for timestamp matching and metric calculations.
- Improve API caching and upstream error handling.

## Disclaimer

This project is an analytical demonstration. Accuracy metrics must be interpreted in light of the documented data-resolution and forecast-coverage limitations.
