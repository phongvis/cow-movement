/**
 * A scatter plot visualization.
 */
pv.vis.scatterplot = function() {
    /**
     * Visual configs.
     */
    const margin = { top: 10, right: 45, bottom: 25, left: 40 };
    let visWidth = 960, visHeight = 600, // Size of the visualization, including margins
        width, height; // Excluding margins

    /**
     * Accessors.
     */
    let id = d => d.id,
        xDim, yDim,
        title;

    /**
     * Data binding to DOM elements.
     */
    let data,
        holdingLookup = {},
        holdingData,
        dataChanged = true; // True to redo all data-related computations

    /**
     * DOM.
     */
    let visContainer, // Containing the entire visualization
        xAxisContainer,
        yAxisContainer,
        itemContainer,
        legendContainer;

    /**
     * D3.
     */
    const xScale = d3.scaleTime(),
        yScale = d3.scaleLinear(),
        xAxis = d3.axisBottom().scale(xScale),
        yAxis = d3.axisLeft().scale(yScale),
        colorScale = d3.scaleOrdinal(d3.schemeCategory10),
        listeners = d3.dispatch('click');

    /**
     * Main entry of the module.
     */
    function module(selection) {
        selection.each(function(_data) {
            // Initialize
            if (!this.visInitialized) {
                visContainer = d3.select(this).append('g').attr('class', 'pv-scatterplot');
                xAxisContainer = visContainer.append('g').attr('class', 'x-axis');
                yAxisContainer = visContainer.append('g').attr('class', 'y-axis');
                itemContainer = visContainer.append('g').attr('class', 'items');
                legendContainer = visContainer.append('g').attr('class', 'legends');

                this.visInitialized = true;
            }

            data = _data;
            update();
        });

        dataChanged = false;
    }

    /**
     * Updates the visualization when data or visual properties change.
     */
    function update() {
        // Canvas update
        width = visWidth - margin.left - margin.right;
        height = visHeight - margin.top - margin.bottom;

        visContainer.attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');
        xAxisContainer.attr('transform', 'translate(0,' + height + ')');

        xScale.range([ 0, width ]);
        yScale.range([ height, 0 ]);

        /**
         * Computation.
         */
        // Updates that depend only on data change
        if (dataChanged) {
            holdingData.forEach(h => {
                holdingLookup[h.id] = h;
            });

            // Domain scale
            xScale.domain(d3.extent(data, xDim.value)).nice();
            yScale.domain([ 0, d3.max(data, yDim.value) ]).nice();

            colorScale.domain(labels);
        }

        // Updates that depend on both data and display change
        computeLayout(data);

        /**
         * Draw.
         */
        // Axes
        xAxisContainer.call(xAxis).call(xLabel);
        yAxisContainer.call(yAxis).call(yLabel);

        // Data items
        const items = visContainer.selectAll('g.item').data(data, id);
        items.enter().append('g').attr('class', 'item').call(enterItems)
            .merge(items).call(updateItems);
        items.exit().transition().attr('opacity', 0).remove();

        // Legend
        const legends = legendContainer.selectAll('.legend').data(labels);
        legends.enter().append('g').attr('class', 'legend').call(enterLegends)
            .merge(legends).call(updateLegends);
    }

    /**
     * Called when new items added.
     */
    function enterItems(selection) {
        const container = selection
            .attr('transform', d => 'translate(' + Math.round(d.x) + ',' + Math.round(d.y) + ')')
            .attr('opacity', 0);
        container.append('circle')
            .attr('r', 1);
        container.append('title')
            .text(title);
    }

    /**
     * Called when items updated.
     */
    function updateItems(selection) {
        selection.each(function(d) {
            const container = d3.select(this);

            // Transition location & opacity
            container.transition()
                .attr('transform', 'translate(' + Math.round(d.x) + ',' + Math.round(d.y) + ')')
                .attr('opacity', 1);

            container.select('circle')
                .style('fill', holdingLookup[d.dest] ? colorScale(holdingLookup[d.dest].type) : 'gray');
        });
    }

        /**
     * Called when new legends added.
     */
    function enterLegends(selection) {
        selection.append('text').text(String);
        selection.append('circle')
            .attr('r', 5)
            .attr('cx', 10);
    }

    /**
     * Called when legends updated.
     */
    function updateLegends(selection) {
        selection.each(function(d, i) {
            const container = d3.select(this);

            const x = width + 25,
                y = i * 20;
            container.attr('transform', 'translate(' + x + ', ' + y + ')');

            container.select('circle')
                .style('fill', colorScale(d));
        });
    }

    /**
     * Computes the position of each item.
     */
    function computeLayout(data) {
        data.forEach(d => {
            d.x = xScale(xDim.value(d));
            d.y = yScale(yDim.value(d));
        });
    }

    /**
     * x-axis label.
     */
    function xLabel(selection) {
        selection.selectAll('text.x-label').data([ xDim.label ])
            .enter().append('text')
                .attr('class', 'x-label')
                .text(Object);
        selection.select('text.x-label').attr('transform', 'translate(' + width + ', 0)');
    }

    /**
     * y-axis label.
     */
    function yLabel(selection) {
        selection.selectAll('text.y-label').data([ yDim.label ])
            .enter().append('text')
                .attr('class', 'y-label')
                .attr('dy', '.2em')
                .text(Object);
        selection.select('text.y-label').attr('transform', 'rotate(-90)');
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
     * Sets/gets the x dimension.
     */
    module.xDim = function(value) {
        if (!arguments.length) return xDim;
        xDim = value;
        return this;
    };

    /**
     * Sets/gets the y dimension.
     */
    module.yDim = function(value) {
        if (!arguments.length) return yDim;
        yDim = value;
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
     * Sets/gets the holding types.
     */
    module.labels = function(value) {
        if (!arguments.length) return labels;
        labels = value;
        return this;
    };

    /**
     * Sets/gets the tooltip of points.
     */
    module.title = function(value) {
        if (!arguments.length) return title;
        title = value;
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