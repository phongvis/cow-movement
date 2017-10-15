document.addEventListener('DOMContentLoaded', function() {
    // Data
    const movementFile = '../../data/movement.csv',
        holdingFile = '../../data/GLholdings.csv'
    let data,
        holdingLookup = {};

    loadCsvData(movementFile).then(movementData => {
        data = movementData;
        return loadCsvData(holdingFile);
    }).then(holdingData => {
        holdingData.forEach(h => {
            holdingLookup[h.LocationKey] = {
                postcode: h.PostCode
            };

            // updateLatLon(h.LocationKey, h.PostCode);
        });

        console.log(_.size(_.groupBy(data, 'OnLocationKey')));

        // Run the first time to build the vis
        updateVis();

        // Rebuild vis when the window is resized
        window.onresize = _.throttle(updateVis, 100);
    }).catch(console.error);

    // Vis
    const template = pv.vis.template();

    /**
     * Updates vis when window changed.
     */
    function updateVis() {
        // Update size of the vis
        template.width(window.innerWidth)
            .height(window.innerHeight);

        // Update size of the vis container and redraw
        d3.select('.pv-vis-demo')
            .attr('width', window.innerWidth)
            .attr('height', window.innerHeight)
            .datum(data)
            .call(template);
    }

    function loadCsvData(filename) {
        return new Promise((resolve, reject) => {
            d3.csv(filename, (err, obj) => {
                if (err) {
                    reject(Error('failed to load ' + filename));
                } else {
                    resolve(obj);
                }
            });
        });
    }

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