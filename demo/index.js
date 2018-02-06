document.addEventListener('DOMContentLoaded', function() {
    // Data
    const holdingFile = '../data/HoldingsWithGL2010movement.csv'
    let movementData,
        movementGroupData,
        accData,
        holdingData,
        holdingTypes,
        holdingLookup;
    let view,
        opt; // full, part

    const viewFunctionLookup = {
        aggregate: updateMap, // Map showing aggregated movements
        time: updatePlot, // Scatter plot of time moving in and number of days staying
        accumulative: updateChart, // Accumulated line chart of number of days staying
        move: updateMove // Movement of an animal
    };

    const movementFileLookup = {
        aggregate: '../data/movement10k.csv',
        time: '../data/movement50k.csv',
        accumulative: '../data/movement.csv', // filter out birth/death
        move: '../data/cow-02.csv',
    };

    const maxStayLength = 100;

    // Vis
    const map = pv.vis.map(),
        plot = pv.vis.scatterplot()
            .xDim({ label: '', value: d => d.date })
            .yDim({ label: 'stay length (days)', value: d => d.stayLength })
            .title(d => d.animalId + ' moves to ' + d.type + '-' + d.dest + ' on ' + d3.timeFormat('%A %b %d, %Y')(d.date) + ' and stays for ' + d.stayLength + ' days');
        chart = pv.vis.linechart()
            .xDim({ label: 'stay length (days)', value: d => d.length })
            .yDim({ label: '%', value: d => d.percent })
            .title(d => d.count + ' incoming cows (' + _.round(d.percent, 2) + '%) stay ≤ ' + d.length + ' days')
            .cellTitle(d => d.count + ' holdings (' + _.round(d.value * 100, 2)
                + '%) are considered as dealers (≥ '
                + d.row + '% incoming cows staying ≤ '
                + d.col + ' days)'),
        animove = pv.vis.animove();

    // Main entry
    (function() {
        checkQueryStringView();
        d3.select('.vis-list').classed('hidden', view);

        if (!view) return;

        if (view === 'time' && opt === 'full') {
            movementFileLookup.time = '../data/movement.csv';
        }

        loadCsvData(movementFileLookup[view]).then(data => {
            movementData = data.map(m => ({
                animalId: m.AnimalId,
                moveId: +m.MovementId,
                id: m.AnimalId + '-' + m.MovementId,
                date: new Date(m.MovementDate),
                origin: m.OffLocationKey,
                dest: m.OnLocationKey,
                birth: m.Birth.toLowerCase() === 'true',
                death: m.Death.toLowerCase() === 'true',
                stayLength: +m.Stay_Length
            }));

            return loadCsvData(holdingFile);
        }).then(data => {
            holdingData = data.map(h => {
                const holding = {
                    id: h.LocationKey,
                    type: h.PremisesType,
                    name: h.LocationName,
                    postcode: h.PostCode
                };

                const l = (new OSRef(+h.X, +h.Y)).toLatLng();
                holding.lat = l.lat;
                holding.lng = l.lng;

                return holding;
            });

            preprocess();

            if (view === 'time') {
                holdingTypes = extractTypes(movementData);
                if (opt !== 'full') {
                    movementData = movementData.filter(d => d.stayLength <= maxStayLength);
                }
                plot.dotSize(opt === 'full' ? 1 : 3);
            }

            if (view === 'aggregate') {
                movementData = movementData.filter(d => d.origin && d.dest && d.origin !== d.dest);
                constrainArea();
                aggregateMovements();
            }

            if (view === 'move') {
                movementData = movementData.filter(d => d.origin && d.dest && d.origin !== d.dest);
                movementData = _.sortBy(movementData, 'moveId');
            }

            if (view === 'accumulative') {
                filterIrrelevantHoldings();
                accData = accumulateMovements(movementData, opt === 'cells');
            }

            // Assign extra data to vis
            map.movementGroupData(movementGroupData)
                .holdingData(holdingData);
            plot.holdingData(holdingData)
                .labels(holdingTypes);
            chart.showCells(opt === 'cells');
            animove.holdingData(holdingData)
                .singleLocation(opt === 'single');

            // Run the first time to build the vis
            updateVis();

            // Rebuild vis when the window is resized
            window.onresize = _.throttle(updateVis, 100);
        }).catch(console.error);
    })();

    /**
     * Updates vis when window changed.
     */
    function updateVis() {
        viewFunctionLookup[view]();
    }

    function updateMap() {
        map.width(window.innerWidth)
            .height(window.innerHeight);

        d3.select('.pv-vis-demo')
            .attr('width', window.innerWidth)
            .attr('height', window.innerHeight)
            .datum(movementData)
            .call(map);
    }

    function updatePlot() {
        plot.width(window.innerWidth)
            .height(window.innerHeight);

        d3.select('.pv-vis-demo')
            .attr('width', window.innerWidth)
            .attr('height', window.innerHeight)
            .datum(movementData)
            .call(plot);
    }

    function updateChart() {
        chart.width(window.innerWidth)
            .height(window.innerHeight);

        d3.select('.pv-vis-demo')
            .attr('width', window.innerWidth)
            .attr('height', window.innerHeight)
            .datum(accData)
            .call(chart);
    }

    function updateMove() {
        animove.width(window.innerWidth)
            .height(window.innerHeight);

        d3.select('.pv-vis-demo')
            .attr('width', window.innerWidth)
            .attr('height', window.innerHeight)
            .datum(movementData)
            .call(animove);
    }

    function checkQueryStringView() {
        const obj = pv.misc.getQueryStringObject();
        if (obj) {
            view = obj.view;
            opt = obj.opt;
        }
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

    function preprocess() {
        // Filter out birth and death movements
        movementData = movementData.filter(m => !m.birth && !m.death);

        // Filter out non-coordinated, non-type holdings
        holdingData = holdingData.filter(h => h.lat && h.lng && h.type);

        // Filter out non-coordinated movements
        holdingLookup = {};
        holdingData.forEach(h => {
            holdingLookup[h.id] = 1;
        });
        movementData = movementData.filter(m => holdingLookup[m.origin] && holdingLookup[m.dest]);

        // Filter out non-movement holdings
        holdingLookup = {};
        movementData.forEach(m => {
            if (m.origin) holdingLookup[m.origin] = 1;
            if (m.dest) holdingLookup[m.dest] = 1;
        });
        holdingData = holdingData.filter(h => holdingLookup[h.id]);

        // Build holding lookup: id -> holding
        // Associate incoming movement with holdings
        holdingLookup = {};
        holdingData.forEach(h => {
            holdingLookup[h.id] = h;
            h.moves = [];
        });

        // Associate type of incoming holding to movement
        movementData.forEach(m => {
            m.type = holdingLookup[m.dest].type;

            holdingLookup[m.dest].moves.push(m);
        });
    }

    /**
     * Returns all different types of outgoing holdings in the movements.
     */
    function extractTypes(data) {
        return _.orderBy(_.entries(_.countBy(data, 'type')), e => e[1], 'desc')
            .map(d => d[0]);
    }

    /**
     * Filter movements so that they move within a small area, easy for demonstration.
     */
    function constrainArea() {
        const latCenter = 51.8642,
            lngCenter = -2.2382,
            offset = 0.2;

        movementData = movementData.filter(m => {
            const latO = holdingLookup[m.origin].lat,
                lngO = holdingLookup[m.origin].lng,
                latD = holdingLookup[m.dest].lat,
                lngD = holdingLookup[m.dest].lng;
            return latO > latCenter - offset && latO < latCenter + offset &&
                lngO > lngCenter - offset && lngO < lngCenter + offset &&
                latD > latCenter - offset && latD < latCenter + offset &&
                lngD > lngCenter - offset && lngD < lngCenter + offset;
        });

        // Filter out non-movement holdings
        holdingLookup = {};
        movementData.forEach(m => {
            if (m.origin) holdingLookup[m.origin] = 1;
            if (m.dest) holdingLookup[m.dest] = 1;
        });
        holdingData = holdingData.filter(h => holdingLookup[h.id]);
    }

    /**
     * Each group of movements is determined by a combination of
     * - movement date
     * - origin
     * - destination
     * Each group contains a list of animals, each has
     * - animalId
     * - birth/death
     * - stayLength
     */
    function aggregateMovements() {
        const groupLookup = _.groupBy(movementData, m => m.date + ':' + m.origin + '-' + m.dest);
        movementGroupData = [];

        _.each(groupLookup, moves => {
            const g = {
                date: moves[0].date,
                origin: moves[0].origin,
                dest: moves[0].dest,
                animals: moves.map(a => _.pick(a, ['animalId', 'birth', 'death', 'stayLength']))
            };

            movementGroupData.push(g);

            g.animals.forEach(a => {
                a.group = g;
            });
        });
    }

    function filterIrrelevantHoldings() {
        // Holdings with non-in-movements
        holdingData = holdingData.filter(h => h.moves.length);

        // Holdings with all in-movements having stay days > maxStayLength
        holdingData = holdingData.filter(h => h.moves.some(m => m.stayLength <= maxStayLength));
    }

    /**
     * Accumulate movements based on the number of stay days.
     */
    function accumulateMovements(data, showCells) {
        const maxNumTypes = showCells ? 1 : 10;
        const sortedTypes = _.orderBy(_.entries(_.countBy(data, 'type')), e => e[1], 'desc').slice(0, maxNumTypes);
        const typedMovementsLookup = _.groupBy(data, 'type');

        return sortedTypes.map(t => {
            // For all movements
            const points = accumulateMoves(typedMovementsLookup[t[0]]);

            // For each holding, accumulate its movements
            holdingData.forEach(h => {
                holdingPoints = accumulateMoves(h.moves);

                // Fill all possible pairs (day, percent)
                h.pointLookup = {};
                let prevPercent = 0;
                for (let i = 0; i < points.length; i++) {
                    const p = holdingPoints.find(p => p.length === i);
                    if (p) {
                        prevPercent = h.pointLookup[i] = p.percent;
                    } else {
                        h.pointLookup[i] = prevPercent;
                    }
                }
            });

            // For each pair (day, percentage),
            // count the number of holdings having the percentage <= days
            const maxPercent = Math.round(_.last(points).percent);
            const cells = [];
            for (let i = 0; i < points.length; i++) {
                for (let j = 1; j <= maxPercent; j++) {
                    // Check if it's a dealer
                    const dealers = holdingData.filter(h => h.pointLookup && h.pointLookup[i] >= j);
                    cells.push({
                        row: j,
                        col: i,
                        count: dealers.length,
                        value: dealers.length / holdingData.length
                    });
                }
            }

            return {
                name: t[0],
                points: points,
                cells: cells
            };
        });
    }

    function accumulateMoves(data) {
        let moves = [];
        _.each(_.countBy(data, 'stayLength'), (v, k) => {
            moves.push({ length: +k, count: v });
        });

        moves = _.sortBy(moves.filter(m => m.length <= maxStayLength), 'length');

        // Accumulate
        let prevCount = moves[0].count;
        for (let i = 1; i < moves.length; i++) {
            moves[i].count += moves[i - 1].count;
        }

        // To percentage
        moves.forEach(m => {
            m.percent = m.count / data.length * 100;
        });

        return moves;
    }
});