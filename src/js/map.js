/**
 * A map visualization of cows.
 */
pv.vis.map = function() {
    /**
     * Visual configs.
     */
    const margin = { top: 20, right: 20, bottom: 20, left: 20 },
        animalPadding = 1,
        animalSize = 4;

    let visWidth = 960, visHeight = 600, // Size of the visualization, including margins
        width, height; // Size of the main content, excluding margins

    const transitionDuration = 100;

    /**
     * Accessors.
     */
    let holdingId = d => d.id,
        animalId = d => d.animalId,
        lat = d => d.lat,
        lon = d => d.lon;

    /**
     * Data binding to DOM elements.
     */
    let data,
        movementGroupData,
        holdingLookup = {}, // Store lat, lon of holdings and live animals (update according to the animation)
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
                visContainer = d3.select(this).append('g').attr('class', 'pv-map');
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
            xScale.domain(d3.extent(holdingData, lon));
            yScale.domain(d3.extent(holdingData, lat));

            holdingData.forEach(h => {
                holdingLookup[h.id] = h;
                h.animals = [];
            });
        }

        // Updates that depend on both data and display change
        computeLayout(holdingData);

        /**
         * Draw.
         */
        const holdings = holdingContainer.selectAll('.holding').data(holdingData, holdingId);
        holdings.enter().append('g').attr('class', 'holding').call(enterHoldings)
            .merge(holdings).call(updateHoldings);
        holdings.exit().transition().attr('opacity', 0).remove();

        animate();
    }

    let animationCount = 0;
    const maxCount = 200;

    function animate() {
        if (animationCount >= Math.min(maxCount, movementGroupData.length)) return;

        const m = movementGroupData[animationCount++];
        updateHoldingAnimalsAfterMovement(m);

        const origin = holdingLookup[m.origin],
            dest = holdingLookup[m.dest];
        computeHoldingAnimalsLayout(origin, origin);
        computeHoldingAnimalsLayout(dest, origin);

        // Need to update positions of all animals in both origin and destination, not only the moving ones
        const involvedAnimals = origin.animals.concat(dest.animals);
        const animals = animalContainer.selectAll('.animal').data(involvedAnimals, animalId);
        animals.enter().append('g').attr('class', 'animal').call(enterAnimals)
            .merge(animals).call(updateAnimals);
        // animals.exit().transition().attr('opacity', 0).remove();

        if (animationCount <= maxCount) {
            setTimeout(animate, transitionDuration);
        }
    }

    function updateHoldingAnimalsAfterMovement(m) {
        const origin = holdingLookup[m.origin] = holdingLookup[m.origin] || { animals: [] };
        const dest = holdingLookup[m.dest] = holdingLookup[m.dest] || { animals: [] };
        const originIds = origin.animals.map(animalId);

        m.animals.forEach(a => {
            const idx = originIds.indexOf(animalId(a));
            if (idx !== -1) origin.animals.splice(idx, 1);

            dest.animals.push(a);
        });
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
        container.append('text')
            .text(d => d.type);
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
            .attr('transform', d => 'translate(' + d.x0 + ',' + d.y0 + ')')
            .attr('opacity', 0.5)
            .on('click', function(d) {
                listeners.call('click', this, d);
                console.log(d.group);
            }).on('mouseover', function(d) {
                d3.select(this).raise();
            });

        container.append('rect')
            .attr('x', -animalSize / 2)
            .attr('y', -animalSize / 2)
            .attr('width', animalSize)
            .attr('height', animalSize);
    }

    /**
     * Called when animals updated.
     */
    function updateAnimals(selection) {
        selection.each(function(d) {
            const container = d3.select(this);

            // Transition location & opacity
            container.transition().duration(transitionDuration)
                .attr('transform', 'translate(' + d.x + ',' + d.y + ')')
                .attr('opacity', 1);

            container.select('rect')
                .style('fill', colorScale(d.stayLength));
        });
    }

    /**
     * Computes the position of each item.
     */
    function computeLayout(data) {
        data.forEach(d => {
            d.x = xScale(lon(d));
            d.y = yScale(lat(d));
        });
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