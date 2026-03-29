# FloodGuard Myanmar 🌊
### Flood Prediction & Vaccine Priority System — v2.5 (2026 Edition)

---

## What's in this zip

```
FloodGuard_Myanmar/
├── index.html           ← Full frontend dashboard (open in any browser)
├── backend_scorer.py    ← Python backend: reads your Excel, outputs scores
└── README.md            ← This file
```

---

## How to run the frontend

Just double-click `index.html` in any modern browser (Chrome, Edge, Firefox).
No internet connection required. No installation needed.

---

## How to update with your real Excel data

### Step 1 — Run the Python backend

```bash
pip install pandas openpyxl
python backend_scorer.py Myanmar_prediction_filled.xlsx
```

This produces:
- `Myanmar_scored_output.xlsx` — full scored spreadsheet
- `regions_data.json` — JSON ready for the frontend

Your Excel must have these columns:
Region, Population, Cholera cases 5yr, Flood events 5yr (comma-separated annual counts),
Historical flood levels, Rainfall intensity, Rainfall duration, Soil moisture,
River water levels, Land elevation, Slope gradient, Drainage quality,
Urbanisation level, Vegetation cover, History of cholera, Water quality,
Sanitation quality, Access to clean water, Temperature climate,
Population density, Time since last outbreak, Health facility coverage,
Community mobility, Flood risk severity, Cholera outbreak probability,
Accessibility during floods, Cold chain reliability, Vulnerable populations,
Population displacement risk, Speed of spread, Past vaccine uptake,
Current vaccine supply.

### Step 2 — Paste JSON into the frontend

Open index.html in a code editor. Find the RAW array (around line 850).
Replace each region's values with those from regions_data.json.

---

## How the prediction model works

### 1. Flood Risk Score (0–50 points)
Ten environmental factors, each scored 1–5:
Historical flood levels, Rainfall intensity, Rainfall duration,
Soil moisture, River water levels, Land elevation, Slope gradient,
Drainage quality, Urbanisation level, Vegetation cover.

### 2. Cholera Risk Score (0–45 points)
Nine public health factors, each scored 1–5:
History of cholera, Water quality, Sanitation quality,
Access to clean water, Temperature/climate, Population density,
Time since last outbreak, Health facility coverage, Community mobility.

### 3. Vaccine Priority Score (combined)
Flood Score + Cholera Score + 9 response-capacity factors.

Final classification:
- Score >= 77  →  URGENT
- Score 54–76  →  PREPARE
- Score < 54   →  LOW

### 4. Flood Probability for 2026 (%)

  base_prob   = High→78%,  Medium→52%,  Low→28%
  score_boost = (flood_score/50 − 0.5) × 30%
  trend_boost = linear regression slope on 5yr data × 2  (capped ±15%)
  final_prob  = base + score_boost + trend_boost  (clamped 5–98%)

The LINEAR REGRESSION fits a straight line to 5 years of flood event counts
and extrapolates one year forward. Rising trend → higher probability.
Falling trend → lower probability.
This replaced v2.4's hardcoded +12% multiplier with data-driven forecasting.

### 5. Vaccine Need Formula

  at_risk_factor = (flood_probability × 0.15) + (5yr_cholera_rate × 0.10)
  vaccines_needed = population × at_risk_factor  (min 5%, max 35% of pop)

### 6. National 2026 Forecast
Linear regression across 2021–2025 national flood totals, projected to 2026.
The forecast card shows the real % change above 2025 actuals.

---

## Rolling 5-year window

The model always uses the 5 most recent years of data.
Current window: 2021–2025. Each year, drop the oldest, add the newest actuals.

---

## Built for humanitarian response
Hackathon 2026 · Model v2.5 · 15 regions · Linear regression forecasting
