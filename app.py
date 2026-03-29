import flask

app = flask.Flask(__name__)

# Flood and cholera risk data for each Myanmar state/region
FLOOD_DATA = {
    "Ayeyarwady": {
        "floodRisk": 9,
        "choleraRisk": 8,
        "vaccinePriority": "HIGH",
        "priorityScore": 88,
        "populationAffected": 820000,
        "lastFloodEvent": "2024-08",
        "description": "The Ayeyarwady Delta is one of Myanmar's most flood-prone areas. Annual monsoon flooding affects hundreds of thousands of residents and creates severe cholera outbreak conditions."
    },
    "Bago": {
        "floodRisk": 8,
        "choleraRisk": 7,
        "vaccinePriority": "HIGH",
        "priorityScore": 78,
        "populationAffected": 590000,
        "lastFloodEvent": "2024-09",
        "description": "Bago Region experiences severe flooding along the Bago and Sittaung rivers every monsoon season, with significant displacement and waterborne disease risk."
    },
    "Yangon": {
        "floodRisk": 7,
        "choleraRisk": 6,
        "vaccinePriority": "HIGH",
        "priorityScore": 74,
        "populationAffected": 1250000,
        "lastFloodEvent": "2024-09",
        "description": "As Myanmar's largest city, Yangon's dense population and ageing drainage infrastructure make it highly vulnerable. Urban flooding leads to significant cholera exposure risk."
    },
    "Rakhine": {
        "floodRisk": 8,
        "choleraRisk": 7,
        "vaccinePriority": "HIGH",
        "priorityScore": 80,
        "populationAffected": 510000,
        "lastFloodEvent": "2024-08",
        "description": "Rakhine State faces dual threats from coastal cyclones and river flooding. Displaced populations in camps have severely limited access to clean water and sanitation."
    },
    "Mon": {
        "floodRisk": 7,
        "choleraRisk": 6,
        "vaccinePriority": "HIGH",
        "priorityScore": 70,
        "populationAffected": 380000,
        "lastFloodEvent": "2024-09",
        "description": "Mon State's coastal lowlands and river networks flood extensively during monsoon season, disrupting water supplies and elevating cholera risk."
    },
    "Sagaing": {
        "floodRisk": 6,
        "choleraRisk": 5,
        "vaccinePriority": "MEDIUM",
        "priorityScore": 56,
        "populationAffected": 310000,
        "lastFloodEvent": "2024-08",
        "description": "Sagaing Region experiences significant Irrawaddy River flooding. Ongoing conflict has disrupted healthcare access, increasing vulnerability to disease outbreaks."
    },
    "Kayin": {
        "floodRisk": 6,
        "choleraRisk": 5,
        "vaccinePriority": "MEDIUM",
        "priorityScore": 54,
        "populationAffected": 240000,
        "lastFloodEvent": "2024-09",
        "description": "Kayin State experiences moderate flooding along the Salween and Gyaing rivers, with rural communities most affected."
    },
    "Tanintharyi": {
        "floodRisk": 6,
        "choleraRisk": 5,
        "vaccinePriority": "MEDIUM",
        "priorityScore": 58,
        "populationAffected": 190000,
        "lastFloodEvent": "2024-09",
        "description": "Tanintharyi Region's long coastline and numerous river systems experience heavy flooding during monsoon season, affecting coastal communities significantly."
    },
    "Mandalay": {
        "floodRisk": 5,
        "choleraRisk": 5,
        "vaccinePriority": "MEDIUM",
        "priorityScore": 50,
        "populationAffected": 340000,
        "lastFloodEvent": "2024-08",
        "description": "Mandalay faces moderate flooding risk from the Irrawaddy River. Urban water supply disruption during floods elevates cholera risk in densely populated areas."
    },
    "Kachin": {
        "floodRisk": 5,
        "choleraRisk": 4,
        "vaccinePriority": "MEDIUM",
        "priorityScore": 46,
        "populationAffected": 148000,
        "lastFloodEvent": "2024-07",
        "description": "Kachin State's mountainous terrain leads to flash flooding events in river valleys. Internally displaced people face elevated health risks."
    },
    "Magway": {
        "floodRisk": 5,
        "choleraRisk": 4,
        "vaccinePriority": "MEDIUM",
        "priorityScore": 44,
        "populationAffected": 210000,
        "lastFloodEvent": "2024-08",
        "description": "Magway Region's dry zone experiences less severe flooding, but flash floods in low-lying areas still pose risks to rural communities."
    },
    "Nay Pyi Taw": {
        "floodRisk": 3,
        "choleraRisk": 3,
        "vaccinePriority": "LOW",
        "priorityScore": 28,
        "populationAffected": 75000,
        "lastFloodEvent": "2023-09",
        "description": "The capital union territory has better infrastructure reducing flood impact, though some rural townships remain vulnerable during heavy monsoon rains."
    },
    "Shan": {
        "floodRisk": 4,
        "choleraRisk": 3,
        "vaccinePriority": "LOW",
        "priorityScore": 34,
        "populationAffected": 130000,
        "lastFloodEvent": "2024-07",
        "description": "Shan State's high plateau limits widespread flooding, though river valleys and lower-lying areas experience seasonal flash floods."
    },
    "Kayah": {
        "floodRisk": 3,
        "choleraRisk": 2,
        "vaccinePriority": "LOW",
        "priorityScore": 22,
        "populationAffected": 52000,
        "lastFloodEvent": "2023-08",
        "description": "Kayah State has a relatively lower flood risk due to its elevated terrain, though localised flooding does occur in some townships."
    },
    "Chin": {
        "floodRisk": 3,
        "choleraRisk": 2,
        "vaccinePriority": "LOW",
        "priorityScore": 24,
        "populationAffected": 58000,
        "lastFloodEvent": "2023-08",
        "description": "Chin State's mountainous geography leads primarily to landslide risk rather than widespread flooding. Cholera risk remains low compared to delta regions."
    }
}

@app.route('/')
def index():
    total_affected = sum(d['populationAffected'] for d in FLOOD_DATA.values())
    high_risk = sum(1 for d in FLOOD_DATA.values() if d['vaccinePriority'] == 'HIGH')
    medium_risk = sum(1 for d in FLOOD_DATA.values() if d['vaccinePriority'] == 'MEDIUM')
    low_risk = sum(1 for d in FLOOD_DATA.values() if d['vaccinePriority'] == 'LOW')
    return flask.render_template(
        'index.html',
        total_affected=total_affected,
        high_risk=high_risk,
        medium_risk=medium_risk,
        low_risk=low_risk,
        regions=len(FLOOD_DATA)
    )

@app.route('/map')
def map_page():
    return flask.render_template('map.html')

@app.route('/api/flood-data')
def flood_data():
    return flask.jsonify(FLOOD_DATA)

if __name__ == '__main__':
    app.run(debug=True)
