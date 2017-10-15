/**
 * A visualization of movement of an animal.
 */
pv.vis.animove = function() {
    /**
     * Visual configs.
     */
    const margin = { top: 30, right: 30, bottom: 30, left: 30 },
        animalPadding = 1,
        animalSize = 10;

    let visWidth = 960, visHeight = 600, // Size of the visualization, including margins
        width, height; // Size of the main content, excluding margins

    /**
     * Accessors.
     */
    let holdingId = d => d.id,
        movementId = d => d.id,
        lat = d => d.lat,
        lon = d => d.lon;

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

    /**
     * D3.
     */
    const xScale = d3.scaleLinear(),
        yScale = d3.scaleLinear(),
        colorScale = d => d3.interpolateReds(d <= 15 ? 1 : d <= 30 ? 0.5 : d <= 60 ? 0.25 : 0.1),
        orderScale = d3.interpolateGreys,
        listeners = d3.dispatch('click');

    /**
     * Main entry of the module.
     */
    function module(selection) {
        selection.each(function(_data) {
            // Initialize
            if (!this.visInitialized) {
                visContainer = d3.select(this).append('g').attr('class', 'pv-animove');
                animalContainer = visContainer.append('g').attr('class', 'animals');
                holdingContainer = visContainer.append('g').attr('class', 'holdings');

                this.visInitialized = true;
            }

            data = _data;

            update();
        });

        dataChanged = false;
    }

    /**
     * Updates the visualization when data or display attributes changes.
     */
    function update() {
        // Canvas update
        width = visWidth - margin.left - margin.right;
        height = visHeight - margin.top - margin.bottom;
        xScale.range([ 0, width ]);
        yScale.range([ height, 0 ]);

        visContainer.attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

        /**
         * Computation.
         */
        // Updates that depend only on data change
        if (dataChanged) {
            xScale.domain(getExtent(holdingData, lon));
            yScale.domain(getExtent(holdingData, lat));

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

        const animals = animalContainer.selectAll('.animal').data(data, movementId);
        animals.enter().append('g').attr('class', 'animal').call(enterAnimals)
            .merge(animals).call(updateAnimals);
        animals.exit().transition().attr('opacity', 0).remove();
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
    }

    /**
     * Called when holdings updated.
     */
    function updateHoldings(selection) {
        selection.each(function(d) {
            const container = d3.select(this);

            // Transition location & opacity
            container.transition()
                .attr('transform', 'translate(' + d.x + ',' + d.y + ')')
                .attr('opacity', 1);

            // Cells
            const items = container.selectAll('rect').data(d.cells);
            items.enter().append('rect')
                .attr('width', animalSize)
                .attr('height', animalSize)
                .style('fill', c => c.start ? 'green' : colorScale(c.stayLength))
              .merge(items)
                .attr('x', c => c.x - animalSize / 2 - d.x)
                .attr('y', c => c.y - animalSize / 2 - d.y);
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
    }

    /**
     * Called when animals updated.
     */
    function updateAnimals(selection) {
        selection.each(function(d, i) {
            const container = d3.select(this);

            // Transition location & opacity
            container.transition()
                .attr('opacity', 1);

            container.select('.curve')
                .attr('d', d.path);

            container.style('stroke', orderScale((i + 1) / data.length));
            container.style('fill', orderScale((i + 1) / data.length));
        });
    }

    /**
     * Computes the position of each holding.
     */
    function computeHoldingsLayout() {
        holdingData.forEach(d => {
            d.x = lon(d) === undefined ? _.random(0, width) : xScale(lon(d));
            d.y = lat(d) === undefined ? _.random(0, height) : yScale(lat(d));
        });
    }

    /**
     * Computes the position of each movement.
     */
    function computeMovementsLayout() {
        data.forEach(d => {
            if (!d.birth && !d.death) {
                d.path = linkArc(d);
            }
        });
    }

    function linkArc(d) {
        // const fx = holdingLookup[d.origin].x,
        //     fy = holdingLookup[d.origin].y,
        //     tx = holdingLookup[d.dest].x,
        //     ty = holdingLookup[d.dest].y;
        const fx = d.originCell.x,
            fy = d.originCell.y,
            tx = d.destCell.x,
            ty = d.destCell.y;

        const dx = Math.abs(fx - tx),
            dy = Math.abs(fy - ty),
            dr = Math.sqrt(dx * dx + dy * dy),
            offset = 1.5,
            offsetX = offset * dx / dr,
            offsetY = offset * dy / dr,
            fx1 = fx - offsetX,
            fx2 = fx + offsetX,
            fy1 = fy - offsetY,
            fy2 = fy + offsetY;

        // return 'M' + fx + ',' + fy + 'A' + dr + ',' + dr + ' 0 0,1 ' + tx + ',' + ty;
        return 'M' + fx1 + ',' + fy1 +
            'A' + dr + ',' + dr + ' 0 0,1 ' + tx + ',' + ty +
            'A' + dr + ',' + dr + ' 0 0,0 ' + fx2 + ',' + fy2 + 'Z';
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
                cell.x = h.x + (animalSize + animalPadding) * seqs[idx].col;
                cell.y = h.y + (animalSize + animalPadding) * seqs[idx].row;
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