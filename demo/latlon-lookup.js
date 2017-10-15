document.addEventListener('DOMContentLoaded', function() {
    const holdingFile = '../../data/GLholdings.csv';
    d3.csv(filename, (err, obj) => {

    });

    function updateLatLon(locationKey, postcode) {
        const request = new XMLHttpRequest();
        request.open('GET', 'https://api.postcodes.io/postcodes/' + postcode.trim(), true);
        request.onload = function() {
            if (request.status >= 200 && request.status < 400) { // Success!
                const r = JSON.parse(request.responseText).result;
                holdingLookup[locationKey].lat = r.latitude;
                holdingLookup[locationKey].lon = r.longitude;

                console.log(holdingLookup[locationKey]);

            }
        };
        request.send();
    }
});