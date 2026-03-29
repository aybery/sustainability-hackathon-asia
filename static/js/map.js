// ── Map initialisation ──────────────────────────────────────────────────────
var map = L.map('map', { zoomControl: true }).setView([20, 96.1], 6);

// CartoDB Dark Matter – dark base that makes our colour overlays pop
L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_matter/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors ' +
                 '&copy; <a href="https://carto.com/attributions">CARTO</a>',
    subdomains: 'abcd',
    maxZoom: 18
}).addTo(map);

// ── Colour helpers ──────────────────────────────────────────────────────────
function priorityColor(priority) {
    if (priority === 'HIGH')   return '#ef4444'; // red
    if (priority === 'MEDIUM') return '#f59e0b'; // amber
    if (priority === 'LOW')    return '#22c55e'; // green
    return '#64748b'; // grey – no data
}

function scoreBarColor(score) {
    if (score >= 70) return '#ef4444';
    if (score >= 40) return '#f59e0b';
    return '#22c55e';
}

function regionStyle(priority) {
    var color = priorityColor(priority);
    return {
        fillColor: color,
        weight: 1.5,
        opacity: 0.9,
        color: '#1f2937',
        fillOpacity: 0.55
    };
}

// ── Info panel helpers ──────────────────────────────────────────────────────
var infoPanel    = document.getElementById('info-panel');
var closeBtn     = document.getElementById('close-panel');

function showPanel(regionName, data) {
    if (!data) return;

    document.getElementById('panel-name').textContent = regionName;

    var badge = document.getElementById('panel-badge');
    badge.textContent = data.vaccinePriority + ' PRIORITY';
    badge.className = 'panel-badge ' + data.vaccinePriority;

    document.getElementById('panel-priority-score').textContent = data.priorityScore + ' / 100';

    var bar = document.getElementById('panel-score-bar');
    bar.style.width = data.priorityScore + '%';
    bar.style.background = scoreBarColor(data.priorityScore);

    document.getElementById('panel-flood').textContent   = data.floodRisk + ' / 10';
    document.getElementById('panel-cholera').textContent = data.choleraRisk + ' / 10';
    document.getElementById('panel-pop').textContent     = data.populationAffected.toLocaleString();
    document.getElementById('panel-flood-date').textContent = data.lastFloodEvent;
    document.getElementById('panel-description').textContent = data.description;

    infoPanel.classList.remove('hidden');
}

closeBtn.addEventListener('click', function () {
    infoPanel.classList.add('hidden');
});

// ── Fetch flood data then draw GeoJSON ─────────────────────────────────────
Promise.all([
    fetch('/api/flood-data').then(function (r) { return r.json(); }),
    fetch('/static/js/geoserver-GetFeature.application.json').then(function (r) { return r.json(); })
]).then(function (results) {
    var floodData = results[0];
    var geojson   = results[1];

    L.geoJSON(geojson, {
        style: function (feature) {
            var name = feature.properties.ST;
            var d    = floodData[name];
            return regionStyle(d ? d.vaccinePriority : null);
        },

        onEachFeature: function (feature, layer) {
            var name = feature.properties.ST || 'Unknown Region';
            var d    = floodData[name];

            // Tooltip
            var tooltipText = name;
            if (d) {
                tooltipText += ' — ' + d.vaccinePriority + ' PRIORITY (Score: ' + d.priorityScore + ')';
            }
            layer.bindTooltip(tooltipText, {
                sticky: true,
                direction: 'auto',
                className: 'region-tooltip'
            });

            // Hover
            layer.on('mouseover', function () {
                this.setStyle({ fillOpacity: 0.85, weight: 2.5 });
                if (!L.Browser.ie && !L.Browser.opera && !L.Browser.edge) {
                    layer.bringToFront();
                }
            });

            layer.on('mouseout', function () {
                var priority = d ? d.vaccinePriority : null;
                this.setStyle(regionStyle(priority));
            });

            // Click → info panel
            layer.on('click', function () {
                showPanel(name, d);
            });
        }
    }).addTo(map);

    console.log('GeoJSON and flood data loaded successfully.');
}).catch(function (err) {
    console.error('Failed to load data:', err);
});

