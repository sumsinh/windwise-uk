# WindWise UK — Wind Generation Forecast Analysis

WindWise UK is a full-stack dashboard for analyzing UK wind generation forecasts against actual generation data. It helps users understand forecast error, forecast bias, and data coverage for January 2026.

## Features

- Interactive dashboard built with React and Tailwind CSS
- Daily forecast-versus-actual generation chart
- Mean Absolute Error (MAE), Root Mean Square Error (RMSE), and forecast bias metrics
- Forecast coverage diagnostics
- Searchable and filterable delivery-period table
- CSV export of displayed records
- Django REST API integration with Elexon BMRS data

## Technology Stack

**Frontend**
- React
- Vite
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
- `FUELHH` for actual wind generation
- `WINDFOR` for wind generation forecasts

## Analysis Period

January 1–31, 2026.

The backend retrieves actual wind generation and forecast records, selects eligible forecasts using a configured day-ahead publication cutoff, matches forecasts to actuals by delivery timestamp, and calculates accuracy metrics.

### Metrics

- **MAE:** Average absolute difference between forecast and actual generation.
- **RMSE:** Square root of the average squared forecast error.
- **Bias:** Average signed error, calculated as forecast minus actual. Positive bias indicates overforecasting.
- **Coverage:** Percentage of actual delivery timestamps with a matching eligible forecast.

### Data limitation

The current retrieved WINDFOR records have hourly target timestamps, whereas the FUELHH actual-generation records are half-hourly. The current implementation matches exact timestamps and does not interpolate or fabricate missing forecast values.

As a result, the current analysis covers only the matched periods. The observed 50% coverage is a limitation of the retrieved forecast timestamps and should not be presented as full half-hourly coverage.

The day-ahead cutoff is currently configured as 10:00 UK time on the day before delivery. This is an explicit modelling assumption and should be checked against the assignment's purchasing-decision requirement.

## Local Setup

### Prerequisites

- Python 3.12 or another compatible Python version
- Node.js and npm
- Git

### 1. Clone the repository

```bash
git clone YOUR_PUBLIC_GITHUB_REPOSITORY_URL
cd windwise-uk
```

### 2. Start the backend

```powershell
cd backend
py -m venv venv
.\venv\Scripts\Activate.ps1
pip install django djangorestframework django-cors-headers requests pandas numpy gunicorn
python manage.py migrate
python manage.py runserver
```

The backend runs at `http://127.0.0.1:8000`.

API endpoints:

- `GET /api/health/`
- `GET /api/accuracy/`

### 3. Start the frontend

Open a second terminal:

```powershell
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173`.

### Environment configuration

The frontend supports an optional `VITE_API_URL` variable. For local development, the default API URL is `http://127.0.0.1:8000`.

For production, configure `VITE_API_URL` to the deployed backend URL and configure Django CORS to allow the deployed frontend origin.

## AI Tool Disclosure

AI assistance was used during development to help with code drafting, debugging, dashboard implementation, and documentation. All generated code and analysis should be reviewed and tested before submission.

## Future Improvements

- Verify whether an appropriate historical forecast source provides all required half-hourly target periods.
- Confirm the purchasing-decision cutoff against the assignment specification.
- Add automated tests for timestamp matching and metric calculations.
- Add Docker configuration and deploy the frontend and backend.
- Improve API caching and handling of upstream data-source errors.

## Disclaimer

This project is an analytical demonstration. Forecast coverage and metrics should be interpreted in light of the documented data-resolution limitations.
