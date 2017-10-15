/**
 * A line chart.
 */
pv.vis.linechart = function() {
    /**
     * Visual configs.
     */
    const margin = { top: 10, right: 25, bottom: 20, left: 40 };

    let visWidth = 960, visHeight = 600, // Size of the visualization, including margins
        width, height; // Size of the main content, excluding margins

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
        dataChanged = true; // True to redo all data-related computations

    /**
     * DOM.
     */
    let visContainer, // Containing the entire visualization
        itemContainer,
        xAxisContainer,
        yAxisContainer;

    /**
     * D3.
     */
    const xScale = d3.scaleLinear(),
        yScale = d3.scaleLinear(),
        xAxis = d3.axisBottom().scale(xScale),
        yAxis = d3.axisLeft().scale(yScale),
        line = d3.line().x(d => d.x).y(d => d.y),
        listeners = d3.dispatch('click');

    /**
     * Main entry of the module.
     */
    function module(selection) {
        selection.each(function(_data) {
            // Initialize
            if (!this.visInitialized) {
                visContainer = d3.select(this).append('g').attr('class', 'pv-linechart');
                xAxisContainer = visContainer.append('g').attr('class', 'x-axis');
                yAxisContainer = visContainer.append('g').attr('class', 'y-axis');
                itemContainer = visContainer.append('g').attr('class', 'items');

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

        visContainer.attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');
        xAxisContainer.attr('transform', 'translate(0,' + height + ')');

        xScale.rangeRound([ 0, width ]);
        yScale.rangeRound([ height, 0 ]);

        /**
         * Computation.
         */
        // Updates that depend only on data change
        if (dataChanged) {
            // Domain scale
            xScale.domain([ 0, d3.max(data, xDim.value) ]).nice();
            yScale.domain([ 0, d3.max(data, yDim.value) ]).nice();
        }

        // Updates that depend on both data and display change
        computeLayout(data);

        /**
         * Draw.
         */
        // Axes
        xAxisContainer.call(xAxis).call(xLabel);
        yAxisContainer.call(yAxis).call(yLabel);

        // Items
        const items = itemContainer.selectAll('.item').data([ data ]);
        items.enter().append('g').attr('class', 'item').call(enterItems)
            .merge(items).call(updateItems);
        items.exit().transition().attr('opacity', 0).remove();
    }

    /**
     * Called when new items added.
     */
    function enterItems(selection) {
        const container = selection.attr('opacity', 0);

        // Line
        container.append('path').attr('class', 'line');
    }

    /**
     * Called when items updated.
     */
    function updateItems(selection) {
        selection.each(function(d) {
            const container = d3.select(this);

            // Transition opacity
            container.transition().attr('opacity', 1);

            // Line
            container.select('.line').attr('d', line(d));

            // Points
            const items = container.selectAll('circle').data(d);
            const enterItems = items.enter().append('circle')
                .attr('r', 2);
            enterItems.append('title')
                .text(title)
            enterItems.merge(items)
                .attr('cx', d2 => d2.x)
                .attr('cy', d2 => d2.y);
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
     * Sets/gets the unique id accessor.
     */
    module.id = function(value) {
        if (!arguments.length) return id;
        id = value;
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