# ================================================================
# FloodGuard Myanmar — Backend Scoring Engine
# ================================================================
# This script reads your Excel data, computes all risk scores,
# and outputs a scored Excel file ready for import into the frontend.
#
# To update the frontend, run this script and paste the output
# JSON into the REGIONS_RAW array inside index.html.
# ================================================================

import pandas as pd
import json
import sys

# ── SCORING MAPS (from untitled0.py) ──────────────────────────
SM = {
    "hist_flood":    {"High": 4, "Medium": 2, "Low": 1},
    "rain_int":      {"High": 4, "Medium": 3},
    "rain_dur":      {"Long": 4, "Moderate": 3},
    "s_moist":       {"High": 4, "Medium": 3},
    "riv_flow":      {"High": 5, "Medium": 3},
    "elev":          {"Low": 5, "High": 1},
    "slope":         {"Flat": 5, "Steep": 1},
    "drain":         {"Poor": 5, "Moderate": 3},
    "urban":         {"High": 4, "Medium": 2},
    "veg":           {"High": 2, "Medium": 3},
    "chol_hist":     {"High": 4, "Medium": 3, "Low": 1},
    "wq":            {"Poor": 4, "Variable": 3, "Good": 2},
    "sanit":         {"Poor": 4, "Variable": 3, "Moderate": 3},
    "cw":            {"Limited": 4, "Moderate": 3, "Good": 2},
    "temp":          {"Tropical": 3, "Temperate": 1},
    "pop_d":         {"High": 4, "Medium": 3, "Low": 2},
    "t_out":         {"Recent": 4, "Unknown": 2, "Long ago": 1},
    "hcov":          {"Low": 4, "Moderate": 3, "High": 2},
    "mob":           {"High": 4, "Medium": 3},
    "vup":           {"Low": 4, "Moderate": 3, "High": 2},
    "fsev":          {"High": 4, "Medium": 3, "Low": 2},
    "cpro":          {"High": 4, "Medium": 3, "Low": 2},
    "acc":           {"Low": 1, "Medium": 3, "High": 5},
    "vuln":          {"High": 4, "Medium": 3, "Low": 2},
    "cold":          {"Poor": 4, "Moderate": 3, "Good": 2},
    "disp":          {"High": 4, "Medium": 3, "Low": 2},
    "spd":           {"High": 4, "Medium": 3},
}

def mv(val, mapping, default=3):
    return mapping.get(str(val).strip(), default)

# ── SCORE FUNCTIONS ────────────────────────────────────────────
def flood_risk_score(r):
    return (
        mv(r["Historical flood levels"], SM["hist_flood"]) +
        mv(r["Rainfall intensity"], SM["rain_int"]) +
        mv(r["Rainfall duration"], SM["rain_dur"]) +
        mv(r["Soil moisture"], SM["s_moist"]) +
        mv(r["River water levels"], SM["riv_flow"]) +
        mv(r["Land elevation"], SM["elev"]) +
        mv(r["Slope gradient"], SM["slope"]) +
        mv(r["Drainage quality"], SM["drain"]) +
        mv(r["Urbanisation level"], SM["urban"]) +
        mv(r["Vegetation cover"], SM["veg"])
    )

def cholera_risk_score(r):
    return (
        mv(r["History of cholera"], SM["chol_hist"]) +
        mv(r["Water quality"], SM["wq"]) +
        mv(r["Sanitation quality"], SM["sanit"]) +
        mv(r["Access to clean water"], SM["cw"]) +
        mv(r["Temperature climate"], SM["temp"]) +
        mv(r["Population density"], SM["pop_d"]) +
        mv(r["Time since last outbreak"], SM["t_out"]) +
        mv(r["Health facility coverage"], SM["hcov"]) +
        mv(r["Community mobility"], SM["mob"])
    )

def vaccine_priority_score(r, fs, cs):
    return (
        fs + cs +
        mv(r["Flood risk severity"], SM["fsev"]) +
        mv(r["Cholera outbreak probability"], SM["cpro"]) +
        mv(r["Population density"], SM["pop_d"]) +
        mv(r["Accessibility during floods"], SM["acc"]) +
        mv(r["Cold chain reliability"], SM["cold"]) +
        mv(r["Vulnerable populations"], SM["vuln"]) +
        mv(r["Population displacement risk"], SM["disp"]) +
        mv(r["Speed of spread"], SM["spd"]) +
        mv(r["Past vaccine uptake"], SM["vup"])
    )

def classify_action(score):
    if score >= 77:
        return "URGENT"
    elif score >= 54:
        return "PREPARE"
    return "LOW"

def linear_trend_boost(flood5yr):
    """Compute a probability adjustment from 5-year flood event trend via linear regression."""
    if not flood5yr or len(flood5yr) < 2:
        return 0.0
    n = len(flood5yr)
    x_mean = (n - 1) / 2
    y_mean = sum(flood5yr) / n
    denom = sum((i - x_mean) ** 2 for i in range(n))
    if denom == 0:
        return 0.0
    slope = sum((i - x_mean) * (flood5yr[i] - y_mean) for i in range(n)) / denom
    intercept = y_mean - slope * x_mean
    next_val = intercept + slope * n
    boost = (slope / max(next_val, 1)) * 2
    return round(min(0.15, max(-0.15, boost)), 3)

def predict_flood_probability(hist_flood, fs, flood5yr=None):
    """Predict 2026 flood probability using historical classification,
    flood risk score, and linear regression trend on 5-year event data."""
    base = {"High": 0.78, "Medium": 0.52, "Low": 0.28}.get(str(hist_flood).strip(), 0.4)
    fs_norm = fs / 50.0
    score_boost = (fs_norm - 0.5) * 0.3
    trend_boost = linear_trend_boost(flood5yr) if flood5yr else 0.0
    return round(min(0.98, max(0.05, base + score_boost + trend_boost)), 3)

def calc_vaccine_need(population, flood_prob, chol5yr_rate):
    """
    Calculates minimum vaccine doses needed.
    Formula: (population * at-risk factor) where at-risk factor
    is based on flood probability and historical cholera rate.
    """
    at_risk_factor = (flood_prob * 0.15) + (chol5yr_rate * 0.1)
    at_risk_factor = min(0.35, max(0.05, at_risk_factor))
    return int(population * at_risk_factor)

# ── MAIN PROCESSING FUNCTION ───────────────────────────────────
def process_file(input_path, output_excel="Myanmar_scored_output.xlsx", output_json="regions_data.json"):
    print(f"Reading: {input_path}")
    df = pd.read_excel(input_path)
    print(f"Columns found: {list(df.columns)}")

    results = []
    for _, row in df.iterrows():
        r = row.to_dict()
        fs = flood_risk_score(r)
        cs = cholera_risk_score(r)
        vs = vaccine_priority_score(r, fs, cs)
        action = classify_action(vs)
        flood_prob = predict_flood_probability(
            r.get("Historical flood levels", "Medium"), fs,
            flood5yr=[int(x) for x in str(r.get("Flood events 5yr", "")).split(",") if x.strip().isdigit()] or None
        )

        pop = int(r.get("Population", 1000000))
        chol5yr = int(r.get("Cholera cases 5yr", 0))
        chol_rate = chol5yr / max(pop, 1)
        need = calc_vaccine_need(pop, flood_prob, chol_rate)
        supply = int(r.get("Current vaccine supply", 0))
        gap = max(0, need - supply)
        cover_pct = min(100, round((supply / max(need, 1)) * 100))

        row_out = {
            **r,
            "Flood_Risk_Score":       fs,
            "Cholera_Risk_Score":     cs,
            "Vaccine_Priority_Score": vs,
            "Flood_Probability_2026": f"{round(flood_prob*100)}%",
            "Recommended_Action":     action,
            "Vaccines_Needed":        need,
            "Current_Supply":         supply,
            "Supply_Gap":             gap,
            "Coverage_Pct":           f"{cover_pct}%",
        }
        results.append(row_out)

    out_df = pd.DataFrame(results)

    # Save scored Excel
    out_df.to_excel(output_excel, index=False)
    print(f"\n✓ Scored Excel saved: {output_excel}")

    # Save JSON for frontend
    json_rows = []
    for r in results:
        json_rows.append({
            "name":            str(r.get("Region", "Unknown")),
            "fs":              r["Flood_Risk_Score"],
            "cs":              r["Cholera_Risk_Score"],
            "vs":              r["Vaccine_Priority_Score"],
            "action":          r["Recommended_Action"],
            "floodProb":       float(r["Flood_Probability_2026"].replace("%",""))/100,
            "pop":             int(r.get("Population", 0)),
            "need":            r["Vaccines_Needed"],
            "current_supply":  r["Current_Supply"],
            "gap":             r["Supply_Gap"],
            "coverPct":        int(r["Coverage_Pct"].replace("%","")),
            "chol5yr":         int(r.get("Cholera cases 5yr", 0)),
        })
    with open(output_json, "w") as f:
        json.dump(json_rows, f, indent=2)
    print(f"✓ JSON for frontend saved: {output_json}")

    # Print summary
    print("\n══════════════════════════════")
    print("  SCORING SUMMARY")
    print("══════════════════════════════")
    for r in results:
        action_sym = "🔴" if r["Recommended_Action"]=="URGENT" else "🟡" if r["Recommended_Action"]=="PREPARE" else "🟢"
        gap_str = f"  | Gap: {r['Supply_Gap']:,} doses" if r["Supply_Gap"] > 0 else "  | Supply: OK"
        print(f"{action_sym} {str(r.get('Region','?')):20s}  Score:{r['Vaccine_Priority_Score']:3d}  Flood:{r['Flood_Probability_2026']:5s}{gap_str}")

    urgent = sum(1 for r in results if r["Recommended_Action"]=="URGENT")
    prepare = sum(1 for r in results if r["Recommended_Action"]=="PREPARE")
    low = sum(1 for r in results if r["Recommended_Action"]=="LOW")
    total_gap = sum(r["Supply_Gap"] for r in results)
    print("──────────────────────────────")
    print(f"  URGENT: {urgent}  |  PREPARE: {prepare}  |  LOW: {low}")
    print(f"  Total vaccine shortfall: {total_gap:,} doses")
    print("══════════════════════════════\n")

    return out_df

# ── RUN ────────────────────────────────────────────────────────
if __name__ == "__main__":
    input_file = sys.argv[1] if len(sys.argv) > 1 else "Myanmar_prediction_filled.xlsx"
    process_file(input_file)
