/**
 * A timeline visualization of cows.
 */
pv.vis.timeline = function() {
    /**
     * Visual configs.
     */
    const margin = { top: 0, right: 0, bottom: 0, left: 0 };

    let visWidth = 960, visHeight = 600, // Size of the visualization, including margins
        width, height; // Size of the main content, excluding margins

    /**
     * Accessors.
     */
    let id = d => d.id,
        label = d => d.label;

    /**
     * Data binding to DOM elements.
     */
    let data,
        dataChanged = true; // True to redo all data-related computations

    /**
     * DOM.
     */
    let visContainer, // Containing the entire visualization
        itemContainer;

    /**
     * D3.
     */
    const listeners = d3.dispatch('click');

    /**
     * Main entry of the module.
     */
    function module(selection) {
        selection.each(function(_data) {
            // Initialize
            if (!this.visInitialized) {
                visContainer = d3.select(this).append('g').attr('class', 'pv-timeline');
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

        /**
         * Computation.
         */
        // Updates that depend only on data change
        if (dataChanged) {

        }

        // Updates that depend on both data and display change
        computeLayout(data);

        /**
         * Draw.
         */
        const items = itemContainer.selectAll('.item').data(data, id);
        items.enter().append('g').attr('class', 'item').call(enterItems)
            .merge(items).call(updateItems);
        items.exit().transition().attr('opacity', 0).remove();
    }

    /**
     * Called when new items added.
     */
    function enterItems(selection) {
        const container = selection
            .attr('transform', d => 'translate(' + d.x + ',' + d.y + ')')
            .attr('opacity', 0)
            .on('click', function(d) {
                listeners.call('click', this, d);
            });

        container.append('circle')
            .style('fill', 'black')
            .attr('r', 12);

        container.append('text')
            .style('fill', 'white')
            .style('text-anchor', 'middle')
            .style('dominant-baseline', 'central')
            .text(label);
    }

    /**
     * Called when items updated.
     */
    function updateItems(selection) {
        selection.each(function(d) {
            const container = d3.select(this);

            // Transition location & opacity
            container.transition()
                .attr('transform', 'translate(' + d.x + ',' + d.y + ')')
                .attr('opacity', 1);
        });
    }

    /**
     * Computes the position of each item.
     */
    function computeLayout(data) {
        data.forEach(d => {
            const lastTwoDigits = d.id % 100;
            d.ix = lastTwoDigits % 10;
            d.iy = Math.floor(lastTwoDigits / 10);
            d.x = d.ix * width / 10 + 10;
            d.y = d.iy * height / 10 + 10;
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
     * Sets/gets the label accessor.
     */
    module.label = function(value) {
        if (!arguments.length) return label;
        label = value;
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