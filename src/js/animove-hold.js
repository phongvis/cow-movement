/**
 * A visualization of movement of an animal.
 */
pv.vis.animove = function() {
    /**
     * Visual configs.
     */
    const margin = { top: 30, right: 30, bottom: 30, left: 30 },
        animalPadding = 1,
        animalSize = 4;

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
        }

        // Updates that depend on both data and display change
        computeHoldingsLayout();
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

        container.append('circle')
            .attr('r', 12);
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

        // Arrow head
        container.append('defs').append('marker')
            .attr('id', movementId)
            .attr('viewBox', '0 -5 10 10')
            .attr('refX', 19)
            .attr('refY', 0)
            .attr('markerWidth', 8)
            .attr('markerHeight', 8)
            .attr('markerUnits', 'userSpaceOnUse')
            .attr('orient', 'auto')
                .append('path')
                .attr('class', 'head')
                .style('fill', 'none')
                .attr('d', 'M0,-5L10,0L0,5');

        container.append('path')
            .attr('class', 'curve')
            .attr('marker-end', d => 'url(#' + movementId(d) + ')');

        // container.append('rect')
        //     .attr('x', -animalSize / 2)
        //     .attr('y', -animalSize / 2)
        //     .attr('width', animalSize)
        //     .attr('height', animalSize);
    }

    /**
     * Called when animals updated.
     */
    function updateAnimals(selection) {
        selection.each(function(d) {
            const container = d3.select(this);

            // Transition location & opacity
            container.transition()
                .attr('opacity', 1);

            container.select('.curve')
                .attr('d', d.path);

            // container.select('rect')
            //     .style('fill', colorScale(d.stayLength));
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
        const ox = holdingLookup[d.origin] ? holdingLookup[d.origin].x : 0,
            oy = holdingLookup[d.origin] ? holdingLookup[d.origin].y : 0,
            dx = holdingLookup[d.dest] ? holdingLookup[d.dest].x : 0,
            dy = holdingLookup[d.dest] ? holdingLookup[d.dest].y : 0;
        const dr = Math.sqrt((dx - ox) * (dx - ox) + (dy - oy) * (dy - oy));

        return 'M' + ox + ',' + oy + 'A' + dr + ',' + dr + ' 0 0,1 ' + dx + ',' + dy;
    }

    /**
     * Computes the position of all animals in the given holding.
     */
    function computeHoldingAnimalsLayout(h, origin) {
        if (h.lat && h.lon) {
            const seqs = pv.misc.makeSpiralSquare(h.animals.length);
            h.animals.forEach((a, idx) => {
                if (a.x0 === undefined) {
                    a.x0 = (origin.x === undefined ? -width : origin.x) + (animalSize + animalPadding) * seqs[idx].col;
                    a.y0 = (origin.y === undefined ? -height : origin.y) + (animalSize + animalPadding) * seqs[idx].row;
                }

                a.x = h.x + (animalSize + animalPadding) * seqs[idx].col;
                a.y = h.y + (animalSize + animalPadding) * seqs[idx].row;
            });
        } else {
            // If a holding doesn't exist, it's an external, set it to somewhere far
            h.animals.forEach(a => {
                if (a.x0 === undefined) {
                    a.x0 = -width;
                    a.y0 = -height;
                }

                a.x = -width;
                a.y = -height;
            });
        }
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