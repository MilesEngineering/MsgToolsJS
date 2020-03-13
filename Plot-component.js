/*
 * Plots a time series of data, with configurable number of lines and names.
 */

if (typeof MsgBasePlot !== "undefined") {
    console.log('MsgBasePlot already loaded');
} else {
var svgns = "http://www.w3.org/2000/svg";
class MsgBasePlot extends HTMLElement {
    constructor() {
        super();

        // used to set the colors for the plots
        this.themeClass = document.querySelector('body').classList;
        this.themeClass = Array.from(this.themeClass);
        this.themeDark = false;
        if(this.themeClass.includes('dark')){ this.themeDark = true ;}


        this.shadow = this.attachShadow({mode: 'open'});

        var style = document.createElement('style');

        let baseColor = 'black';
        if(this.themeDark){
            baseColor = 'white';
        }

        style.textContent = `svg {
                               font-family: monospace;
                            }

                            .axis {
                               stroke-width: 1;
                            }

                            .axis .tick line {
                               stroke: var(--color-text, ${baseColor});
                            }

                            .axis .tick text {
                               fill: var(--color-text, ${baseColor});
                               font-size: 0.7em;
                            }

                            .axis .domain {
                               fill: none;
                               stroke: var(--color-text, ${baseColor});
                            }

                            .group {
                               fill: none;
                               stroke: var(--color-text, ${baseColor});
                               stroke-width: 1.5;
                            }`;

        this.shadow.appendChild(style);

        if(this.hasAttribute('timeLimit')) {
            this.timeLimit = parseFloat(this.getAttribute('timeLimit')); // seconds
        } else {
            this.timeLimit = 20.0;
        }
        this.duration = 750;
        if(this.hasAttribute('yMin') || this.hasAttribute('yMax')) {
            this.yMin = parseFloat(this.getAttribute('yMin'));
            this.yMax = parseFloat(this.getAttribute('yMax'));
            this.autoscale = 0;
        } else {
            this.yMin = 0;
            this.yMax = 1;
            this.autoscale = 1;
        }

        // #a09344
        // #7f64b9
        // #c36785
        this.dataSets = {};
        if(this.hasAttribute('labels')) {
            let labels = this.getAttribute('labels').split(",");
            this.configureDataSets(labels);
        }
        this.timestamps = [];

        this.shift = null;
        // this is for the width of the tick marks and labels on the y axis, on both sides of the plot
        this.yAxisLabelWidth = 50;
        // this is for the height of the tick marks and labels on the x axis, on bottom of the plot
        this.xAxisLabelHeight = 20;
        // this is to allow a label at the very top tick mark on the y axis to be totally visible.
        // it should be 1/2 the height of text, because the label can be centered at the very
        // top of the box (which would make half of it hang offscreen, if we didn't account for it).
        this.topMarginForScaleLabel = 10;

        this.svg = document.createElementNS(svgns, 'svg');
        this.svg.setAttribute('class', 'chart');
        this.shadow.appendChild(this.svg);
        this.svg_selector = d3.select(this.svg);

        //window.addEventListener('resize', this.resize.bind(this));
        //window.addEventListener('visibilitychange', this.resize.bind(this));
        this.resize();
    }

    configureDataSets(labels)
    {
        console.log(this.themeDark);
        let colors = [];
        if( this.themeDark ){
            // Dark theme needs light colors
            colors = ['#f0b4e5', '#d4f0b4',  '#f086e9', '#e1ff5c', '#fc6886',
                      '#68fc8f', '#f2acae', '#f2eaac', '#b5f0b4', '#68cbfc',
                      '#f0b4b4', '#b4f0e7', '#f086af', '#f0b286', '#88aeeb',
                      '#69f5ad', '#f56969', '#9af569', '#697ef5', '#86f0de',
                      '#69f579', '#ec69f5', '#c9f086', '#acdbdf', '#69779b',
                      '#c199c7', '#ead5ed', '#d4d420', '#20d492', '#745cff',
                      '#ff6f5c', '#e1ff5c', '#ffbd66', '#fa66ff', '#66baff',
                  ]
        } else {
            // Light theme needs dark colors
            colors = [ '#0833a1', '#a13808', '#a10882', '#29a108', '#5c0404',
                       '#753a32', '#669900', '#8a009c', '#487532', '#3c009c',
                       '#353275', '#453614', '#32755e', '#507532', '#324d75',
                       '#bf1da9', '#1dbf58', '#1d7ebf', '#4c8f54', '#de1bde',
                       '#a10854', '#bf691d',  '#565c04','#045c33', '#bf281d',
                       '#71bf1d', '#bf791d', '#6e3275', '#421445', '#756232',
                       '#144536', '#420d38', '#1dbf22', '#1db4bf', '#084fa1',
            ];
        }
        var color=0;
        for (var i in labels) {
            var label = labels[i];
            this.dataSets[label] = {
                value: 0,
                color: colors[color],
                data: [],
                pathData: [],
                name: label
            }
            color++;
        }
    }

    resize(width=undefined, height=undefined)
    {
        // if the element is hidden, don't do anything.
        if(this.offsetParent === null) {
            return;
        }
        if(width != undefined && height != undefined) {
            this.width = width;
            this.height = height;
        } else {
            var rect = this.parentElement.getBoundingClientRect();
            this.width = rect.width;
            this.height = rect.height;
            if(this.hasAttribute('height')) {
                var height = this.getAttribute('height');
                if(height.includes("%")) {
                    this.height = this.height * height.replace("%","") / 100;
                } else {
                    this.height = height;
                }
            }
            if(this.hasAttribute('width')) {
                var width = this.getAttribute('width');
                if(width.includes("%")) {
                    this.width = this.width * width.replace("%","") / 100;
                } else {
                    this.width = width;
                }
            }
        }
        this.svg.setAttribute('width', this.width);
        this.svg.setAttribute('height', this.height);
        this.emptySVG();
        this.pixelPerSecond = ((this.width-2.0*this.yAxisLabelWidth)/this.timeLimit);
        this.initFromData();
    }

    initFromData()
    {
        let viewBox = "0 -"+(this.topMarginForScaleLabel)+" "+(this.width)+" "+(this.height+this.topMarginForScaleLabel+this.xAxisLabelHeight)
        this.svg.setAttribute("viewBox", viewBox);

        this.xScale = d3.scale.linear()
            .domain([-this.timeLimit, 0])
            .range([this.yAxisLabelWidth, this.width-this.yAxisLabelWidth])

        this.yScale = d3.scale.linear()
            .domain([this.yMin, this.yMax])
            .range([this.height-this.xAxisLabelHeight-this.topMarginForScaleLabel, 0])

        var that = this;

        this.xAxis = this.svg_selector.append('g')
            .attr('class', 'x axis')
            .attr('transform', 'translate(0,' + (this.height-this.xAxisLabelHeight-this.topMarginForScaleLabel) + ')')
            .call(that.xScale.axis = d3.svg.axis().scale(that.xScale).orient('bottom'));

        this.yAxis = this.svg_selector.append('g')
            .attr('class', 'y axis')
            .attr('transform', 'translate(' + this.yAxisLabelWidth + ',0)')
            .call(that.yScale.axis = d3.svg.axis().scale(that.yScale).orient('left'));

        this.yAxisR = this.svg_selector.append('g')
            .attr('class', 'y axis')
            .attr('transform', 'translate(' + (this.width-this.yAxisLabelWidth) + ',0)')
            .call(that.yScale.axis = d3.svg.axis().scale(that.yScale).orient('right'));

        this.paths = this.svg_selector.append('g');

        this.labels = {};
        var y = 5;
        for (var name in this.dataSets) {
            let group = this.dataSets[name];
            group.path = this.paths.append('path')
                .attr('d', 'M 0,0')
                .attr('class', name + ' group')
                .style('stroke', group.color)
                .style('stroke-width', 1);

            this.labels[name] =
                this.svg_selector.append('text')
                    .attr('class', 'value xvalue')
                    .attr('x', this.yAxisLabelWidth+10)
                    .attr('y', y)
                    .attr('fill', group.color)
                    .attr('dominant-baseline', 'text-before-edge')
                    .text(name);
            y += 15;
        }

        for (var name in this.dataSets)
        {
            this.dataSets[name].pathData = [ ];
            for(var i=0; i<this.timestamps.length; i++) {
                this.dataSets[name].pathData.push(((this.timestamps[i]-this.shift)*this.pixelPerSecond)+","+this.yScale(this.dataSets[name].data[i]));
            }
            if(this.timestamps.length>1) {
                this.dataSets[name].path.attr("d", "M "+(this.dataSets[name].pathData.join(" L ")));
            }
        }
        this.plotLatestData();
    }

    setLegendValues() {
        var i = 0;
        for (var name in this.labels) {
            var val = '?';
            if(name in this.dataSets && this.dataSets[name].data.length > 1) {
                let lastIndex = this.dataSets[name].data.length-1;
                val = Math.round(this.dataSets[name].data[lastIndex]);
            }
            this.labels[name].text((val < 0 ? name : name+' ') + val);
            i += 1;
        }
    }

    autoscaleYAxis() {
        var newMin = Number.POSITIVE_INFINITY;
        var newMax = Number.NEGATIVE_INFINITY;
        var hit_limit = 0;
        for (var name in this.labels) {
            for(i in this.dataSets[name].data) {
                var val = this.dataSets[name].data[i];
                if(val < newMin) {
                    newMin = val;
                }
                if(val > newMax) {
                    newMax = val;
                }
            }
        }
        if((newMax > this.yMax || newMax < this.yMax)||
           (newMin < this.yMin || newMin > this.yMin)) {
            this.yMax = newMax;
            this.yMin = newMin;
            this.yScale = d3.scale.linear()
                .domain([this.yMin, this.yMax])
                .range([this.height-this.xAxisLabelHeight-this.topMarginForScaleLabel, 0])
            this.emptySVG();
            this.initFromData();
        }
    }

    adjustTimeLimit(newLimit) {
        this.timeLimit = Math.abs(newLimit);
        this.emptySVG();
        this.pixelPerSecond = ((this.width-2.0*this.yAxisLabelWidth)/this.timeLimit);
        this.initFromData();
    }

    emptySVG() {
        while(this.svg.lastChild) {
            this.svg.removeChild(this.svg.lastChild);
        }
    }

    plot(time, newData) {
        //time /= 1000.0;
        this.now = time;
        // Add new values
        if(this.shift === null) {
            this.shift = time;
        }

        // figure out how many of the initial items are expired
        var expired = 0;
        for(var past of this.timestamps) {
            if(past < (time - this.timeLimit)) {
                expired ++;
            } else {
                break;
            }
        }

        // trim off expired items
        this.timestamps.splice(0, expired);
        for(var name in this.dataSets) {
            this.dataSets[name].data.splice(0, expired);
            this.dataSets[name].pathData.splice(0, expired);
        }

        this.timestamps.push(time);
        var dataNum = 0;
        for (var name in this.dataSets)
        {
            var value = newData[dataNum++];
            this.dataSets[name].data.push(value);
            // append a chunk of svg path data to the list
            this.dataSets[name].pathData.push(((time-this.shift)*this.pixelPerSecond)+","+this.yScale(value));
        }
        if(this.autoscale) {
            this.autoscaleYAxis();
        }
        this.plotLatestData();
    }
    plotLatestData() {
        this.setLegendValues();
        // the performance of this approach comes from not having to recompute
        // the path data with every update.
        if(this.now != undefined && this.shift != undefined ) {
            this.paths.attr('transform', 'translate('+(this.width-this.yAxisLabelWidth-(this.now-this.shift)*this.pixelPerSecond)+' 0)');
        }
        for (var name in this.dataSets)
        {
            // convert the entire list into svg path data. just string concat
            this.dataSets[name].path.attr("d", "M "+(this.dataSets[name].pathData.join(" L ")));
        }
    }
}

// This should be run after we're confident that all of the uses of the
// tag have been defined, so that our calls to getAttribute will succeed.
// (Also after any remaining dependencies are loaded.)
// Best plan is just to import this whole file at the end of your HTML.
customElements.define('msgtools-plot', MsgBasePlot);
window.MsgBasePlot = MsgBasePlot;
}
