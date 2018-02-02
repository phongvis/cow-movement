/**
 * A visualization of movement of an animal.
 */
pv.vis.animove = function() {
    /**
     * Visual configs.
     */
    const margin = { top: 30, right: 30, bottom: 30, left: 30 },
        animalPadding = 1,
        continuous = false,
        singleLocation = true,
        animalSize = 6;

    let visWidth = 960, visHeight = 600, // Size of the visualization, including margins
        width, height; // Size of the main content, excluding margins

    /**
     * Accessors.
     */
    let holdingId = d => d.id,
        movementId = d => d.id,
        lat = d => d.lat,
        lng = d => d.lng;

    /**
     * Data binding to DOM elements.
     */
    let data,
        movementGroupData,
        holdingLookup = {},
        holdingData,
        dataChanged = true; // True to redo all data-related computations

    /**
     * DOM.
     */
    let visContainer, // Containing the entire visualization
        holdingContainer,
        animalContainer;

    let bgMap; // Background map (leaflet)
    let zoomToFitted = false;

    /**
     * D3.
     */
    const colorScale = d => d3.interpolateReds(d <= 15 ? 0.1 : d <= 30 ? 0.25 : d <= 60 ? 0.5 : 0.75),
        orderScale = d3.interpolateGreens,
        line = d3.line().x(d => d.x).y(d => d.y)
            // .curve(d3.curveCatmullRom),
        listeners = d3.dispatch('click');

    /**
     * Main entry of the module.
     */
    function module(selection) {
        selection.each(function(_data) {
            // Initialize
            if (!this.visInitialized) {
                visContainer = initMap(d3.select(this));
                holdingContainer = visContainer.append('g').attr('class', 'holdings');
                animalContainer = visContainer.append('g').attr('class', 'animals');

                visContainer.append('path').attr('class', 'journey');

                this.visInitialized = true;
            }

            data = _data;

            update();

            if (!zoomToFitted) {
                zoomToFit();
                zoomToFitted = true;
            }
        });

        dataChanged = false;
    }

    function initMap(selection) {
        // Div container for background map
        selection.append('foreignObject')
            .attr('width', '100%')
            .attr('height', '100%')
                .append('xhtml:div')
                .attr('id', 'animove')
                .attr('class', 'pv-animove');

        bgMap = L.map('animove');
        bgMap.setView([ 0, 0 ], 0);
        // L.tileLayer("http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { opacity: 0.5 }).addTo(bgMap);
        L.tileLayer.grayscale("http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { opacity: 0.5 }).addTo(bgMap);

        bgMap._initPathRoot();
        bgMap.on('viewreset', update);

        return d3.select('#animove').select('svg');
    }

    /**
     * Updates the visualization when data or display attributes changes.
     */
    function update() {
        // Canvas update
        width = visWidth - margin.left - margin.right;
        height = visHeight - margin.top - margin.bottom;

        visContainer.attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

        /**
         * Computation.
         */
        // Updates that depend only on data change
        if (dataChanged) {
            holdingData.forEach(h => {
                holdingLookup[h.id] = h;
            });

            computeHoldingCells();
        }

        // Updates that depend on both data and display change
        computeHoldingsLayout();
        computeHoldingCellsLayout();
        computeMovementsLayout();

        /**
         * Draw.
         */
        const holdings = holdingContainer.selectAll('.holding').data(holdingData, holdingId);
        holdings.enter().append('g').attr('class', 'holding').call(enterHoldings)
            .merge(holdings).call(updateHoldings);
        holdings.exit().transition().attr('opacity', 0).remove();

        if (continuous) {
            visContainer.select('.journey').attr('d', getJourney());
        } else {
            const animals = animalContainer.selectAll('.animal').data(data, movementId);
            animals.enter().append('g').attr('class', 'animal').call(enterAnimals)
                .merge(animals).call(updateAnimals);
            animals.exit().transition().attr('opacity', 0).remove();
        }
    }

    function zoomToFit() {
        bgMap.fitBounds([
            [ d3.min(holdingData, lat), d3.min(holdingData, lng) ],
            [ d3.max(holdingData, lat), d3.max(holdingData, lng) ]
        ]);
    }

    function getExtent(array, f) {
        const e = d3.extent(array, f);
        return e[0] !== e[1] ? e : [e[0] - 1, e[1] + 1];
    }

    /**
     * Called when new holdings added.
     */
    function enterHoldings(selection) {
        const container = selection
            .attr('transform', d => 'translate(' + d.x + ',' + d.y + ')')
            .attr('opacity', 0)
            .on('click', function(d) {
                listeners.call('click', this, d);
            }).on('mouseover', function(d) {
                d3.select(this).raise();
            });

        container.append('rect').attr('class', 'single');

        container.append('title')
            .text(d => d.name + ' (' + d.postcode + ')');
    }

    /**
     * Called when holdings updated.
     */
    function updateHoldings(selection) {
        selection.each(function(d) {
            const container = d3.select(this);

            // Location & opacity
            container.attr('transform', 'translate(' + d.x + ',' + d.y + ')')
                .attr('opacity', 1);

            // Cells
            if (singleLocation) {
                container.select('.single')
                    .attr('width', animalSize)
                    .attr('height', animalSize)
                    .attr('x', -animalSize / 2)
                    .attr('y', -animalSize / 2);
            } else {
                const items = container.selectAll('rect.cell').data(d.cells);
                items.enter().append('rect')
                    .attr('class', 'cell')
                    .attr('width', animalSize)
                    .attr('height', animalSize)
                    .style('fill', c => c.start ? 'green' : colorScale(c.stayLength))
                    // .style('fill', c => colorScale(c.stayLength))
                  .merge(items)
                    .attr('x', c => c.x - animalSize / 2 - d.x)
                    .attr('y', c => c.y - animalSize / 2 - d.y);
            }
        });
    }

    /**
     * Called when new animals added.
     */
    function enterAnimals(selection) {
        const container = selection
            .attr('opacity', 0)
            .on('click', function(d) {
                listeners.call('click', this, d);
            }).on('mouseover', function(d) {
                d3.select(this).raise();
            });

        container.append('path')
            .attr('class', 'curve');

        container.append('title')
            .text(d => holdingLookup[d.origin].name + ' (' + holdingLookup[d.origin].postcode + ') → ' +
                holdingLookup[d.dest].name + ' (' + holdingLookup[d.dest].postcode + ')');
    }

    /**
     * Called when animals updated.
     */
    function updateAnimals(selection) {
        selection.each(function(d, i) {
            const container = d3.select(this);

            // Location & opacity
            container.attr('opacity', 1);

            container.select('.curve').attr('d', d.path);

            // container.select('.curve')
            //     .style('stroke', orderScale((i + 1) / data.length));
        });
    }

    function getJourney() {
        return line(data.map(d => ({
            x: d.originCell.x,
            y: d.originCell.y
        })));
    }

    /**
     * Computes the position of each holding.
     */
    function computeHoldingsLayout() {
        holdingData.forEach(d => {
            const p = bgMap.latLngToLayerPoint(new L.LatLng(lat(d), lng(d)));
            d.x = p.x;
            d.y = p.y;
        });
    }

    /**
     * Computes the position of each movement.
     */
    function computeMovementsLayout() {
        data.forEach(d => {
            if (!d.birth && !d.death) {
                d.path = linkArcAsymmetric(d);
            }
        });
    }

    function linkArc(d) {
        const fx = d.originCell.x,
            fy = d.originCell.y,
            tx = d.destCell.x,
            ty = d.destCell.y;

        const dx = Math.abs(fx - tx),
            dy = Math.abs(fy - ty),
            dr = Math.sqrt(dx * dx + dy * dy);

        return 'M' + fx + ',' + fy + 'A' + dr + ',' + dr + ' 0 0,1 ' + tx + ',' + ty;
    }

    function linkArcAsymmetric(d) {
        const fx = d.originCell.x,
            fy = d.originCell.y,
            tx = d.destCell.x,
            ty = d.destCell.y;

        const dx = Math.abs(fx - tx),
            dy = Math.abs(fy - ty),
            dr = Math.sqrt(dx * dx + dy * dy);

        const asym = 0.25,
            angle = Math.PI / 180 * 90;
        const x = (fx - tx) * asym,
            y = (fy - ty) * asym,
            cx = tx + x * Math.cos(angle) - y * Math.sin(angle),
            cy = ty + y * Math.cos(angle) + x * Math.sin(angle);

        return 'M' + fx + ',' + fy + 'C' + cx + ' ' + cy + ' ' + tx + ' ' + ty + ' ' + tx + ' ' + ty;
    }

    /**
     * Each holding contains a number of cells. Each cell is for an incoming movement.
     * The first outgoing cell also takes a cell.
     */
    function computeHoldingCells() {
        holdingData.forEach(h => {
            const id = holdingId(h);
            const hData = data.filter(d => d.origin === id || d.dest === id);
            let prevDir = false;

            h.cells = [];

            hData.forEach(m => {
                const incoming = m.dest === id;

                // If it's an incoming movement, always need a new cell to store its stay length.
                if (incoming) {
                    const cell = { stayLength: m.stayLength };
                    h.cells.push(cell);
                    m.destCell = cell;
                } else if (incoming === prevDir) {
                    // If not, create a new cell if the previous one is also an outgoing.
                    const cell = {};
                    h.cells.push(cell);
                    m.originCell = cell;
                } else {
                    // Outgoing using the previous cell
                    m.originCell = _.last(h.cells);
                }

                prevDir = incoming;
            });
        });

        // Mark initial cell
        data[0].originCell.start = true;
    }

    /**
     * Computes the position of all cells.
     */
    function computeHoldingCellsLayout() {
        holdingData.forEach(h => {
            const seqs = pv.misc.makeSpiralSquare(h.cells.length);
            h.cells.forEach((cell, idx) => {
                cell.x = h.x + (singleLocation ? 0 : (animalSize + animalPadding) * seqs[idx].col);
                cell.y = h.y + (singleLocation ? 0 : (animalSize + animalPadding) * seqs[idx].row);
            });
        });
    }

    /**
     * Sets/gets the width of the visualization.
     */
    module.width = function(value) {
        if (!arguments.length) return visWidth;
        visWidth = value;
        return this;
    };

    /**
     * Sets/gets the height of the visualization.
     */
    module.height = function(value) {
        if (!arguments.length) return visHeight;
        visHeight = value;
        return this;
    };

    /**
     * Sets/gets the unique id accessor.
     */
    module.id = function(value) {
        if (!arguments.length) return id;
        id = value;
        return this;
    };

    /**
     * Sets/gets the holding data.
     */
    module.holdingData = function(value) {
        if (!arguments.length) return holdingData;
        holdingData = value;
        return this;
    };

    /**
     * Sets/gets the group of movements.
     */
    module.movementGroupData = function(value) {
        if (!arguments.length) return movementGroupData;
        movementGroupData = value;
        return this;
    };

    /**
     * Sets the flag indicating data input has been changed.
     */
    module.invalidate = function() {
        dataChanged = true;
    };

    /**
     * Binds custom events.
     */
    module.on = function() {
        const value = listeners.on.apply(listeners, arguments);
        return value === listeners ? module : value;
    };

    return module;
};