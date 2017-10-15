document.addEventListener('DOMContentLoaded', function() {
    // Data
    const movementFile = '../../data/cow-1.csv',
        holdingFile = '../../data/GLholdings.csv'
    let movementData,
        movementGroupData,
        accData,
        holdingData;
    let animoveDemo = true;

    loadCsvData(movementFile).then(data => {
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

        if (animoveDemo) {
            movementData = movementData.filter(d => d.origin && d.dest && d.origin !== d.dest);
            movementData = _.sortBy(movementData, 'moveId');
        }

        // excludeDeathMovements();
        aggregateMovements();
        accData = accumulateMovements(movementData);

        return loadCsvData(holdingFile);
    }).then(data => {
        holdingData = data.map(h => ({
            id: h.LocationKey,
            type: h.PremisesType,
            lat: +h.Y,
            lon: +h.X
        }));

        keepOnlyHoldingsInMovementData();
        associateIncomingMovementWithHoldings();

        // Assign extra data to vis
        map.movementGroupData(movementGroupData)
            .holdingData(holdingData);
        plot.holdingData(holdingData);
        animove.holdingData(holdingData);

        // Run the first time to build the vis
        updateVis();

        // Rebuild vis when the window is resized
        window.onresize = _.throttle(updateVis, 100);
    }).catch(console.error);

    // Vis
    const map = pv.vis.map(),
        plot = pv.vis.scatterplot()
            .xDim({ label: '', value: d => d.date })
            .yDim({ label: 'stay length (days)', value: d => d.stayLength }),
        chart = pv.vis.linechart()
            .xDim({ label: 'stay length (days)', value: d => d.length })
            .yDim({ label: '%', value: d => d.count })
            .title(d => d.count + '% of incoming cows stay less than or equal to ' + d.length + ' days'),
        animove = pv.vis.animove();

    /**
     * Updates vis when window changed.
     */
    function updateVis() {
        // Update size of the vis
        map.width(window.innerWidth)
            .height(window.innerHeight);
        plot.width(window.innerWidth)
            .height(window.innerHeight);
        chart.width(window.innerWidth)
            .height(window.innerHeight);
        animove.width(window.innerWidth)
            .height(window.innerHeight);

        // Update size of the vis container and redraw
        // d3.select('.pv-vis-demo')
        //     .attr('width', window.innerWidth)
        //     .attr('height', window.innerHeight)
        //     .datum(movementData)
        //     .call(map);

        // d3.select('.pv-vis-demo')
        //     .attr('width', window.innerWidth)
        //     .attr('height', window.innerHeight)
        //     .datum(movementData)
        //     .call(plot);

        // d3.select('.pv-vis-demo')
        //     .attr('width', window.innerWidth)
        //     .attr('height', window.innerHeight)
        //     .datum(accData)
        //     .call(chart);

        d3.select('.pv-vis-demo')
            .attr('width', window.innerWidth)
            .attr('height', window.innerHeight)
            .datum(movementData)
            .call(animove);
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

    function excludeDeathMovements() {
        movementData = movementData.filter(m => !m.death);
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

    /**
     * Accumulate movements based on the number of stay days.
     */
    function accumulateMovements(data) {
        let moves = [];
        _.each(_.countBy(data, 'stayLength'), (v, k) => {
            moves.push({ length: +k, count: v });
        });

        moves = _.sortBy(moves.filter(m => m.length <= 100), 'length');

        // Accumulate
        let prevCount = moves[0].count;
        for (let i = 1; i < moves.length; i++) {
            moves[i].count += moves[i - 1].count;
        }

        // To percentage
        moves.forEach(m => {
            m.count = _.round(m.count / data.length * 100, 1);
        });

        return moves;
    }

    function keepOnlyHoldingsInMovementData() {
        const holdingLookup = {};

        movementData.forEach(m => {
            if (m.origin) holdingLookup[m.origin] = 1;
            if (m.dest) holdingLookup[m.dest] = 1;
        });

        holdingData = holdingData.filter(h => holdingLookup[h.id]);

        // If origin or dest of a movement is out side of GL, that holding isn't in 'holdingData' in the first place.
        const holdingIds = holdingData.map(h => h.id);
        _.each(holdingLookup, (v, k) => {
            if (!holdingIds.includes(k)) holdingData.push({ id: k });
        });
    }

    function associateIncomingMovementWithHoldings() {
        const holdingLookup = {};
        holdingData.forEach(h => {
            holdingLookup[h.id] = h;
            h.moves = [];
        });

        movementData.forEach(m => {
            if (holdingLookup[m.dest]) holdingLookup[m.dest].moves.push(m);
        });
    }
});