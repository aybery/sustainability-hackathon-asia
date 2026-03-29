// ── Map initialisation ──────────────────────────────────────────────────────
var map = L.map('map', { zoomControl: true }).setView([20, 96.1], 6);
map.maxZoom = 6;
map.setMinZoom(6);

// Stamen Toner tiles - English labels by default
L.tileLayer('https://tiles.stadiamaps.com/tiles/stamen_toner_dark/{z}/{x}/{y}{r}.png', {
//L.tileLayer('https://tiles.stadiamaps.com/tiles/stamen_toner_lite/{z}/{x}/{y}{r}.png', {
maxZoom: 6,
attribution: '&copy; <a href="https://stadiamaps.com/" target="_blank">Stadia Maps</a> ' +
            '&copy; <a href="https://stamen.com/" target="_blank">Stamen Design</a> ' +
            '&copy; <a href="https://openmaptiles.org/" target="_blank">OpenMapTiles</a> ' +
            '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a>',
}).addTo(map);

// ── Colour helpers ──────────────────────────────────────────────────────────
function actionColor(action) {
    if (action === 'URGENT')  return '#ef4444'; // red
    if (action === 'PREPARE') return '#f59e0b'; // amber
    if (action === 'LOW')     return '#22c55e'; // green
    return '#64748b'; // grey – no data
}

function scoreBarColor(score) {
    if (score >= 67) return '#ef4444';
    if (score >= 54) return '#f59e0b';
    return '#22c55e';
}

function regionStyle(action, highlighted) {
    var color = actionColor(action);
    return {
        fillColor: color,
        weight: highlighted ? 2.5 : 1.5,
        opacity: 0.9,
        color: highlighted ? '#ffffff' : '#1f2937',
        fillOpacity: highlighted ? 0.85 : 1
    };
}

// ── Layer tracking ──────────────────────────────────────────────────────────
var layersByName = {};   // region name → Leaflet layer
var activeRegion = null; // currently highlighted region name

function setActiveRegion(name, d) {
    // Reset previous
    if (activeRegion && layersByName[activeRegion]) {
        var prevData = layersByName[activeRegion]._regionData;
        layersByName[activeRegion].setStyle(regionStyle(prevData ? prevData.action : null, false));
    }
    activeRegion = name;
    if (name && layersByName[name]) {
        layersByName[name].setStyle(regionStyle(d ? d.action : null, true));
        layersByName[name].bringToFront();
    }
    // Update sidebar active state
    document.querySelectorAll('.sidebar-item').forEach(function (el) {
        el.classList.toggle('active', el.dataset.region === name);
    });
}

// ── Info panel helpers ──────────────────────────────────────────────────────
var infoPanel = document.getElementById('info-panel');
var closeBtn  = document.getElementById('close-panel');

function fmtNum(n) { return n !== undefined ? n.toLocaleString() : '—'; }
function fmtK(n)   { return n !== undefined ? (n / 1000).toFixed(1) + 'K' : '—'; }

function showPanel(regionName, data) {
    if (!data) return;

    document.getElementById('panel-name').textContent = regionName;

    var badge = document.getElementById('panel-badge');
    var actionLabel = data.action || data.vaccinePriority;
    badge.textContent = actionLabel + ' PRIORITY';
    badge.className = 'panel-badge ' + actionLabel.toLowerCase();

    document.getElementById('panel-priority-score').textContent = data.priorityScore + ' / 100';

    var bar = document.getElementById('panel-score-bar');
    bar.style.width = data.priorityScore + '%';
    bar.style.background = scoreBarColor(data.priorityScore);

    document.getElementById('panel-action').textContent      = data.action || '—';
    document.getElementById('panel-flood').textContent       = data.floodRisk + ' / 10';
    document.getElementById('panel-cholera').textContent     = data.choleraRisk + ' / 10';
    document.getElementById('panel-pop-total').textContent   = fmtNum(data.population);
    document.getElementById('panel-pop').textContent         = fmtNum(data.populationAffected);
    document.getElementById('panel-chol5yr').textContent     = fmtNum(data.chol5yr) + ' cases';
    document.getElementById('panel-flood-prob').textContent  = (data.floodProb || '—') + '%';
    document.getElementById('panel-vax-need').textContent    = fmtK(data.vaccineDosesNeeded) + ' doses';
    document.getElementById('panel-vax-supply').textContent  = fmtK(data.currentSupply) + ' doses';

    var gap = data.vaccineGap;
    var vaccineGapEl = document.getElementById('panel-vax-gap');
    if (gap > 0) {
        vaccineGapEl.textContent = '−' + fmtK(gap) + ' doses';
        vaccineGapEl.style.color = '#f87171';
    } else {
        vaccineGapEl.textContent = 'Adequate';
        vaccineGapEl.style.color = '#4ade80';
    }

    document.getElementById('panel-flood-date').textContent  = data.lastFloodEvent;
    document.getElementById('panel-description').textContent = data.description;

    infoPanel.classList.remove('hidden');
}

closeBtn.addEventListener('click', function () {
    infoPanel.classList.add('hidden');
    setActiveRegion(null, null);
});

// ── Sidebar builder ─────────────────────────────────────────────────────────
function buildSidebar(floodData) {
    var regions = Object.keys(floodData).map(function (name) {
        return { name: name, data: floodData[name] };
    });

    // Sort: URGENT first, then PREPARE, then LOW; within group by priorityScore desc
    var order = { URGENT: 0, PREPARE: 1, LOW: 2 };
    regions.sort(function (a, b) {
        var ao = order[a.data.action] !== undefined ? order[a.data.action] : 3;
        var bo = order[b.data.action] !== undefined ? order[b.data.action] : 3;
        if (ao !== bo) return ao - bo;
        return b.data.priorityScore - a.data.priorityScore;
    });

    // Summary counts
    var urgent  = regions.filter(function (r) { return r.data.action === 'URGENT'; }).length;
    var prepare = regions.filter(function (r) { return r.data.action === 'PREPARE'; }).length;
    var low     = regions.filter(function (r) { return r.data.action === 'LOW'; }).length;
    document.getElementById('sidebar-counts').innerHTML =
        '<span class="sc urgent">' + urgent + ' Urgent</span>' +
        '<span class="sc prepare">' + prepare + ' Prepare</span>' +
        '<span class="sc low">' + low + ' Low</span>';

    var list = document.getElementById('sidebar-list');
    list.innerHTML = regions.map(function (r) {
        var d = r.data;
        var action = d.action || d.vaccinePriority;
        var cls = action === 'URGENT' ? 'urgent' : action === 'PREPARE' ? 'prepare' : 'low';
        return '<div class="sidebar-item ' + cls + '" data-region="' + r.name + '">' +
            '<div class="si-top">' +
                '<div class="si-name">' + r.name + '</div>' +
                '<span class="si-badge ' + cls + '">' + action + '</span>' +
            '</div>' +
            '<div class="si-stats">' +
                '<div class="si-stat"><span class="si-stat-label">Score</span><span class="si-stat-val">' + d.priorityScore + '</span></div>' +
                '<div class="si-stat"><span class="si-stat-label">Flood</span><span class="si-stat-val">' + d.floodProb + '%</span></div>' +
                '<div class="si-stat"><span class="si-stat-label">Cholera 5yr</span><span class="si-stat-val">' + (d.chol5yr / 1000).toFixed(1) + 'K</span></div>' +
            '</div>' +
            '<div class="si-bar-wrap"><div class="si-bar ' + cls + '" style="width:' + d.priorityScore + '%"></div></div>' +
        '</div>';
    }).join('');

    // Wire sidebar clicks
    list.querySelectorAll('.sidebar-item').forEach(function (el) {
        el.addEventListener('click', function () {
            var name = el.dataset.region;
            var d = floodData[name];
            setActiveRegion(name, d);
            showPanel(name, d);
            // Pan map to region if layer exists
            if (layersByName[name]) {
                map.fitBounds(layersByName[name].getBounds(), { padding: [40, 40] });
            }
        });
    });
}

// ── Fetch flood data then draw GeoJSON ─────────────────────────────────────
Promise.all([
    fetch('/api/flood-data').then(function (r) { return r.json(); }),
    fetch('/static/js/geoserver-GetFeature.application.json').then(function (r) { return r.json(); })
]).then(function (results) {
    var floodData = results[0];
    var geojson   = results[1];

    buildSidebar(floodData);

    L.geoJSON(geojson, {
        style: function (feature) {
            var name = feature.properties.ST;
            var d    = floodData[name];
            return regionStyle(d ? d.action : null, false);
        },

        onEachFeature: function (feature, layer) {
            var name = feature.properties.ST || 'Unknown Region';
            var d    = floodData[name];

            layer._regionData = d;
            layersByName[name] = layer;

            // Tooltip
            var tooltipText = name;
            if (d) {
                tooltipText += ' — ' + (d.action || d.vaccinePriority) + ' (Score: ' + d.priorityScore + ')';
            }
            layer.bindTooltip(tooltipText, {
                sticky: true,
                direction: 'auto',
                className: 'region-tooltip'
            });

            // Hover
            layer.on('mouseover', function () {
                if (activeRegion !== name) {
                    this.setStyle({ fillOpacity: 0.75, weight: 2 });
                }
                if (!L.Browser.ie && !L.Browser.opera && !L.Browser.edge) {
                    layer.bringToFront();
                }
            });

            layer.on('mouseout', function () {
                if (activeRegion !== name) {
                    this.setStyle(regionStyle(d ? d.action : null, false));
                }
            });

            // Click → info panel + sidebar highlight
            layer.on('click', function () {
                setActiveRegion(name, d);
                showPanel(name, d);
                // Scroll sidebar item into view
                var sidebarItem = document.querySelector('.sidebar-item[data-region="' + name + '"]');
                if (sidebarItem) {
                    sidebarItem.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                }
            });
        }
    }).addTo(map);

    console.log('GeoJSON and flood data loaded successfully.');
}).catch(function (err) {
    console.error('Failed to load data:', err);
});

