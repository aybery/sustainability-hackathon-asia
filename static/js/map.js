var map = L.map('map').setView([20, 96.1], 6);

// CartoDB Voyager tiles - English labels by default
/*
L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
    subdomains: 'abcd',
    maxZoom: 20
}).addTo(map);
*/

// Stamen Toner Lite tiles - English labels by default
L.tileLayer('https://tiles.stadiamaps.com/tiles/stamen_toner/{z}/{x}/{y}{r}.png', {
//L.tileLayer('https://tiles.stadiamaps.com/tiles/stamen_toner_lite/{z}/{x}/{y}{r}.png', {
maxZoom: 20,
attribution: '&copy; <a href="https://stadiamaps.com/" target="_blank">Stadia Maps</a> ' +
            '&copy; <a href="https://stamen.com/" target="_blank">Stamen Design</a> ' +
            '&copy; <a href="https://openmaptiles.org/" target="_blank">OpenMapTiles</a> ' +
            '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a>',
}).addTo(map);

