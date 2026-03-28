var map = L.map('map').setView([20, 96.1], 6);

// CartoDB Voyager tiles - English labels by default
/*
L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
    subdomains: 'abcd',
    maxZoom: 20
}).addTo(map);
*/

// Stamen Toner tiles - English labels by default
L.tileLayer('https://tiles.stadiamaps.com/tiles/stamen_toner/{z}/{x}/{y}{r}.png', {
//L.tileLayer('https://tiles.stadiamaps.com/tiles/stamen_toner_lite/{z}/{x}/{y}{r}.png', {
maxZoom: 20,
attribution: '&copy; <a href="https://stadiamaps.com/" target="_blank">Stadia Maps</a> ' +
            '&copy; <a href="https://stamen.com/" target="_blank">Stamen Design</a> ' +
            '&copy; <a href="https://openmaptiles.org/" target="_blank">OpenMapTiles</a> ' +
            '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a>',
}).addTo(map);



// Fetch the GeoJSON and draw it
fetch('/static/js/geoserver-GetFeature.application.json')
    .then(function(response) {
        if (!response.ok) {
            throw new Error("HTTP error! status: " + response.status);
        }
        return response.json();
    })

// Define the Green Style for the "boxes" (regions)
function regionStyle() {
    return {
        fillColor: "#2ecc71", // Standard Green
        weight: 2,            // Border thickness
        opacity: 1,           // Border opacity
        color: 'white',       // Border color
        fillOpacity: 0.7      // How "filled" the green looks
    };
}

// Fetch the GeoJSON and draw it
fetch('/static/js/geoserver-GetFeature.application.json')
    .then(function(response) {
        if (!response.ok) {
            throw new Error("HTTP error! status: " + response.status);
        }
        return response.json();
    })
.then(function(data) {
    // Draw the GeoJSON on the map
    L.geoJSON(data, {
        style: regionStyle,
        onEachFeature: function(feature, layer) {
            // Check if the name exists in the properties
            var name = feature.properties.ST || "Unknown Region";

            // Bind the hover label (Tooltip)
            layer.bindTooltip(name, {
                sticky: true,        // Follows the mouse
                direction: "auto",   // Keeps text from going off-screen
                className: "region-tooltip" // We'll style this in CSS
            });

            // Add a subtle highlight effect on hover
            layer.on('mouseover', function () {
                this.setStyle({
                    fillOpacity: 0.9,
                    weight: 3,
                    color: '#fff'
                });
            });

            layer.on('mouseout', function () {
                this.setStyle(regionStyle()); // Resets to original style
            });
        }
    }).addTo(map);
    
    console.log("GeoJSON successfully loaded with hover labels.");
})


