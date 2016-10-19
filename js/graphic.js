// Global vars
/* globals AIRTABLE_DATA:true */
/* globals DATA:true */
/* globals DEFAULT_WIDTH:true */
/* globals MOBILE_THRESHOLD:true */
/* globals COLORS:true */
/* globals fmtComma, fmtYearAbbrev, fmtYearFull */
/* globals classify, formatStyle, makeTranslate, getParameterByName, urlToLocation, cmp */

var pymChild = null;
var isMobile = false;
var dataSeries = [];
var jsonData = {};
var unNestedData = [];
var tableRendered = false;

var dispatch = d3.dispatch('recordchange', 'recordhover', 'recordclear');

var dateFormat = d3.time.format('%b %Y');
var versionFormat = d3.time.format('%Y-%m-%d');

/*
 * Initialize graphic
 */
var onWindowLoaded = function() {
    
    renderPym();

    function renderPym () {
        // console.log(DATA);
        // console.log(AIRTABLE_DATA);
        jsonData = AIRTABLE_DATA;
        DATA = jsonData['records'];

        if (Modernizr.svg) {
            formatData();

            pymChild = new pym.Child({
                renderCallback: render
            });
        } else {
            pymChild = new pym.Child({});
        }

    }
};

/*
 * Format graphic data for processing by D3.
 */
var formatData = function() {
    // DATA = DATA.filter(function(d) {
    //         return _.has(d['fields'], 'Date');
    //     });

    // DATA = DATA.filter(function(d) {
    //         return _.has(d['fields'], 'References');
    //     });

    DATA.forEach(function(d) {
        // console.log(d['fields']);
        if ( d['fields']['Date'] ) {
            d['fields']['Date'] = d3.time.format('%m/%y').parse(d['fields']['Date']);
            // d['fields']['DateTime'] = d3.time.format.iso.parse(d['fields']['DateTime']);
        }
        else {
            d['fields']['Date'] = d3.time.format('%m/%y').parse('6/16');
        }

        if ( !d['fields']['References'] ) {
            d['fields']['References'] = [];
        }
        
        // for (var key in d['fields']) {
        //     console.log(key);
        //     if (key != 'Date' && d[key] != null && d[key].length > 0) {
        //         d[key] = +d[key];
        //     }
        // }
    });

    /*
     * Restructure tabular data for easier charting.
     */

    

    // for (var column in DATA[0]['fields']) {
    //     if (column !== 'Efficiency (%)') {
    //         continue;
    //     }

    //     dataSeries.push({
    //         'name': column,
    //         'values': DATA.map(function(d) {
    //             // console.log(d['fields']['Date']);
    //             // console.log(d['fields'][column]);
    //             return {
    //                 'date': d['fields']['Date'],
    //                 'amt': d['fields'][column]
    //             };
    // // filter out empty data. uncomment this if you have inconsistent data.
    //        // }).filter(function(d) {
    //        //     return !d['Fields']['Date'];
    //         })
    //     });
    // }

    // console.log(dataSeries);
    unNestedData = DATA;

    unNestedData.forEach(function(d) {
        var cellData = jsonData['cell-types'].find(function(name) {
                // console.log(name.id);
                // console.log(d['fields']['Cell type']);
                return name.id === d['fields']['Cell type'][0];
            })['fields'];
        // console.log(cellData);
        var cellCategory = jsonData['cell-categories'].find(function(name) {
                // console.log(name);
                return name.id === cellData['Category'][0];
            })['fields']['Name'];
        // var name = cellCategory + ' - ' + cellData['Cell type'];

        d['name'] = cellData['Cell type'];
        // d['name'] = d['fields']['Name'];
        // d['category'] = d['fields']['Cell category'];
        d['category'] = cellCategory;
        d['date'] = d['fields']['Date'];
        d['amt'] = d['fields']['Efficiency (%)'];
        d['institutions'] = d['fields']['Group'].map(function(group) {
            return jsonData['institutions'].find(function(institution) {
                    return institution.id === group;
                })['fields']['Full Name'];
        });

        d['references'] = d['fields']['References'].map(function(reference) {
            return jsonData['references'].find(function(publication) {
                return publication.id === reference;
            })['fields']['Reference'];
        });
    });

    DATA = d3.nest()
        .key(function(d) {
            return d['fields']['Cell type'];
        })
        .entries(DATA);

    console.log(DATA);

    DATA.forEach(function(series) {
        // console.log(series);
        var cellData = jsonData['cell-types'].find(function(name) {
                return name.id === series.key;
            })['fields'];
        // console.log(cellData);
        var cellCategory = jsonData['cell-categories'].find(function(name) {
                // console.log(name);
                return name.id === cellData['Category'][0];
            })['fields']['Name'];
        var name = cellCategory + ' - ' + cellData['Cell type'];

        dataSeries.push({
            'name': name,
            'category': cellCategory,
            'values': series.values.map(function(d) {
                return {
                    'id': d.id,
                    'name': name,
                    'category': cellCategory,
                    'date': d['fields']['Date'],
                    'amt': d['fields']['Efficiency (%)'],
                    'voc': d['fields']['Voc (mV)'],
                    'jsc': d['fields']['Jsc (mAcm-2)'],
                    'ff': d['fields']['FF (%)'],
                    'area': d['fields']['area (cm-2)'],
                    'suns': d['fields']['Sun'] || 1,
                    'institutions': d['fields']['Group'].map(function(group) {
                        return jsonData['institutions'].find(function(institution) {
                                return institution.id === group;
                            })['fields']['Full Name'];
                    }),
                    'references': d['fields']['References'].map(function(reference) {
                        return jsonData['references'].find(function(publication) {
                            return publication.id === reference;
                        })['fields']['Reference'];
                    })
                    // 'institution': jsonData['institutions'].find(function(institution) {
                    //     return institution.id === d['fields']['Group'][0];
                    // })['fields']['Full Name']
                };
            }).sort(function(a,b) {
                return cmp(a.date,b.date) || cmp(a.amt,b.amt);
            })
        });
    });

    console.log(dataSeries);
};

/*
 * Render the graphic(s). Called by pym with the container width.
 */
var render = function(containerWidth) {
    if (!containerWidth) {
        containerWidth = DEFAULT_WIDTH;
    }

    if (containerWidth <= MOBILE_THRESHOLD) {
        isMobile = true;
    } else {
        isMobile = false;
    }

    // Render the chart!
    renderLineChart({
        container: '#line-chart',
        width: containerWidth,
        data: dataSeries
    });

    // Render the datatable!
    renderTable({
        container: '#pv-table',
        data: unNestedData
    });

    // Update iframe
    if (pymChild) {
        pymChild.sendHeight();
    }
};

/*
 * Render a line chart.
 */
var renderLineChart = function(config) {
    /*
     * Setup
     */
    var dateColumn = 'date';
    var valueColumn = 'amt';

    var aspectWidth = isMobile ? 4 : 16;
    var aspectHeight = isMobile ? 3 : 9;

    var margins = {
        top: 5,
        // right: 75,
        right: 30,
        bottom: 20,
        left: 30
    };

    var ticksX = 10;
    var ticksY = 10;
    var roundTicksFactor = 5;

    // Mobile
    if (isMobile) {
        ticksX = 5;
        ticksY = 5;
        margins['right'] = 25;
    }

    // Calculate actual chart dimensions
    var chartWidth = config['width'] - margins['left'] - margins['right'];
    var chartHeight = Math.ceil((config['width'] * aspectHeight) / aspectWidth) - margins['top'] - margins['bottom'];

    // Clear existing graphic (for redraw)
    var containerElement = d3.select(config['container']);
    containerElement.html('');

    /*
     * Create D3 scale objects.
     */
    var xScale = d3.time.scale()
        // .domain(d3.extent(config['data'], function(series) {
        //     console.log(series);
        //     console.log(d3.extent(series['values'], function(d) {
        //         // console.log(d);
        //         return d['date'];
        //     }))
        // }))
        .domain([
            d3.min(config['data'], function(series) {
                return d3.min(series['values'], function(d) {
                    // console.log(d);
                    // console.log(d['date'].getFullYear());
                    if (d['date'].getFullYear() < 2000) { return; }
                    return d['date'];
                });
            }),
            d3.max(config['data'], function(series) {
                return d3.max(series['values'], function(d) {
                    // console.log(d);
                    return d['date'];
                });
            })
        ])
        .range([ 0, chartWidth ]);

    var min = d3.min(config['data'], function(d) {
        return d3.min(d['values'], function(v) {
            return Math.floor(v[valueColumn] / roundTicksFactor) * roundTicksFactor;
        });
    });

    if (min > 0) {
        min = 0;
    }

    var max = d3.max(config['data'], function(d) {
        return d3.max(d['values'], function(v) {
            return Math.ceil(v[valueColumn] / roundTicksFactor) * roundTicksFactor;
        });
    });

    var yScale = d3.scale.linear()
        .domain([min, max])
        .range([chartHeight, 0]);

    var colorScale = d3.scale.ordinal()
        .domain(_.pluck(config['data'], 'category'))
        .range([COLORS['dark red'], COLORS['dark green'], COLORS['light blue'], COLORS['orange'], COLORS['teal']]);

    /*
     * Render the HTML legend.
     */
    var legend = d3.select('#key-container ul')
        .attr('class', 'key')
        .classed('mobile', isMobile)
        .selectAll('li')
        // .data(config['data'])
        .data(colorScale.domain().sort(function(a, b) {
            // console.log(a['name']);
            return a.localeCompare(b);
        }))
        .enter().append('li')
            .attr('class', function(d, i) {
                return 'key-item ' + classify(d);
            });

    legend.append('b')
        .style('background-color', function(d) {
            return colorScale(d);
        });

    legend.append('label')
        .text(function(d) {
            return d;
        });

    /*
     * Create the root SVG element.
     */
    var chartWrapper = containerElement.append('div')
        .attr('class', 'graphic-wrapper');

    var chartElement = chartWrapper.append('svg')
        .attr('id', 'line-chart-svg')
        .attr('width', chartWidth + margins['left'] + margins['right'])
        .attr('height', chartHeight + margins['top'] + margins['bottom'])
        .append('g')
        .attr('transform', 'translate(' + margins['left'] + ',' + margins['top'] + ')');

    /*
     * Create D3 axes.
     */
    var xAxis = d3.svg.axis()
        .scale(xScale)
        .orient('bottom')
        .ticks(ticksX)
        .tickFormat(function(d, i) {
            if (isMobile) {
                return '\u2019' + fmtYearAbbrev(d);
            } else {
                return fmtYearFull(d);
            }
        });

    var yAxis = d3.svg.axis()
        .scale(yScale)
        .orient('left')
        .ticks(ticksY);

    /*
     * Render axes to chart.
     */
    chartElement.append('g')
        .attr('class', 'x axis')
        .attr('transform', makeTranslate(0, chartHeight))
        .call(xAxis);

    chartElement.append('g')
        .attr('class', 'y axis')
        .call(yAxis);

    /*
     * Render grid to chart.
     */
    var xAxisGrid = function() {
        return xAxis;
    };

    var yAxisGrid = function() {
        return yAxis;
    };

    chartElement.append('g')
        .attr('class', 'x grid')
        .attr('transform', makeTranslate(0, chartHeight))
        .call(xAxisGrid()
            .tickSize(-chartHeight, 0, 0)
            .tickFormat('')
        );

    chartElement.append('g')
        .attr('class', 'y grid')
        .call(yAxisGrid()
            .tickSize(-chartWidth, 0, 0)
            .tickFormat('')
        );

    /*
     * Render lines to chart.
     */
    var line = d3.svg.line()
        // .interpolate('monotone')
        .x(function(d) {
            // console.log(d[dateColumn]);
            // console.log(xScale(d[dateColumn]));
            return xScale(d[dateColumn]);
        })
        .y(function(d) {
            return yScale(d[valueColumn]);
        });

    chartElement.append('g')
        .attr('class', 'lines')
        .selectAll('path')
        .data(config['data'])
        .enter()
        .append('path')
            .attr('class', function(d, i) {
                return 'line ' + classify(d['name']);
            })
            .attr('stroke', function(d) {
                return colorScale(d['category']);
            })
            .attr('d', function(d) {
                return line(d['values']);
            });

    /*
     * Render infobox area
     */
    var infoBox = containerElement.append('div')
        .attr('class', 'info-box')
        .html('<p><b>Cell type:</b></p><p><b>Date:</b></p><p><b>Efficiency:</b></p>');

    var points = chartElement
        .selectAll('g.points')
        .data(config['data'])
        .enter()
        .append('g')
            .attr('class', function(d, i) {
                    return 'points ' + classify(d['name']);
                });

    // var filter = chartElement.append('defs')
    //     .html('<filter x="-2%" y="-10%" width="104%" height="120%" id="solid"><feFlood flood-color="white"/><feComposite in="SourceGraphic"/></filter>')

    var point = points.selectAll('circle')
        .data(function(d) { return d['values']; })
        .enter()
        .append('circle')
            .attr('class', 'point')
            .attr('id', function(d) { return d.id; })
            .attr('cx', function(d) {
                // console.log(d);
                // console.log(xScale(d[dateColumn]));
                return xScale(d[dateColumn]);
            })
            .attr('cy', function(d) {
                // console.log(d[valueColumn]);
                return yScale(d[valueColumn]);
            })
            .attr('r', 5)
            .attr('stroke', 'none')
            .attr('fill', function(d) {
                return colorScale(d['category']);
            });

    var ttTemplate = _.template($('#tooltip-template').html(), {variable: 'record'});
    var tooltip = chartWrapper.append('div')
            .classed('tooltip-details', true);

    point.on('click', function(){
        d3.event.stopPropagation();
        var id = d3.select(this).datum().id;
        
        dispatch.recordchange(id);
    });

    point.on('mouseover', function(){
        var id = d3.select(this).datum().id;
        // console.log(id);

        dispatch.recordhover(id);
    });

    d3.select(chartElement.node().parentElement).on('click', function(){
        console.log('chart clicked');
        dispatch.recordclear();
    });

    dispatch.on('recordclear.chart', function() {
        d3.selectAll('.selected')
            .classed('selected', false);

        d3.selectAll('.line')
            .attr('opacity', 1);  

        d3.selectAll('.points .point')
            .attr('opacity', 1);  

        // d3.select('.div-tooltip').remove();
        $(tooltip.node()).hide();

    });

    dispatch.on('recordhover.chart', function(id) {
        var el = d3.select('#' + id);
        var selectedData = el.datum();
        var offset = 15;
        // var dateFormat = d3.time.format('%b %Y');

        d3.selectAll('.tooltip')
            .remove();

        d3.selectAll('.point')
            .attr('r', 5);

        el
            .attr('r', 7.5);

        var ttText = chartElement.append('g')
            .attr('class', 'tooltip')
            .append('text')
                // .attr('filter', 'url(#solid)')
                .attr('text-anchor', function() {
                    return xScale(selectedData[dateColumn]) > (chartWidth / 2) ? 'end' : 'start';
                })
                .attr('dx', function() {
                    return xScale(selectedData[dateColumn]) > (chartWidth / 2) ? (- offset) : offset;
                })
                .attr('x', xScale(selectedData[dateColumn]))
                .attr('y', yScale(selectedData[valueColumn]) - offset)
                .text(function() {
                    var label = selectedData[valueColumn].toFixed(1)  + '%';
                    if (!isMobile) {
                        label = dateFormat(selectedData['date']) + ': ' + label;
                    }

                    return label;
                });

        var bbox = ttText.node().getBBox();
        var padding = 5;
        var rect = d3.select('.tooltip').insert('rect', 'text')
            .attr('class', 'tt-background')
            .attr('x', bbox.x - padding)
            .attr('y', bbox.y - padding)
            .attr('width', bbox.width + (padding*2))
            .attr('height', bbox.height + (padding*2))
            .style('fill', 'white')
            .style('stroke', '#ddd')
            .style('width', (bbox.width + (padding*2)) + 'px')
            .style('height', (bbox.height + (padding*2)) + 'px');
    });

    dispatch.on('recordchange.chart', function(id) {
        var el = d3.select('#' + id);
        var node = el.node();
        var selectedData = el.datum();
        // var dateFormat = d3.time.format('%b %Y');

        var svgPos = chartElement.node().parentElement.getBoundingClientRect();
        var matrix = node.getScreenCTM()
            .translate(+ node.getAttribute('cx') - svgPos.left, + node.getAttribute('cy') - svgPos.top);
        var ttOffset = 9.5;
        var ttWidth = (chartWidth / 2) - ttOffset;

        node.parentNode.appendChild(node);

        console.log(selectedData);

        infoBox.html('');

        infoBox
            .append('p')
            .html('<b>Cell type:</b> ' + selectedData['name']);

        infoBox
            .append('p')
            .html('<b>Date:</b> ' + dateFormat(selectedData['date']) +
                '    <b>Group:</b> ' + selectedData['institutions'] +
                '    <b>References:</b> ' + selectedData['references']);

        infoBox
            .append('p')
            .html('<b>Efficiency:</b> ' + selectedData['amt'].toFixed(1) + '%');

        d3.selectAll('.selected')
            .classed('selected', false);

        el.classed('selected', true);

        d3.selectAll('.line:not(.' + classify(selectedData['name']) + ')')
            .attr('opacity', 0.3);

        d3.selectAll('.' + classify(selectedData['name']))
            .attr('opacity', 1);  

        d3.selectAll('.points:not(.' + classify(selectedData['name']) + ') .point')
            .attr('opacity', 0.3);

        d3.selectAll('.points.' + classify(selectedData['name']) + ' .point')
            .attr('opacity', 1);  

        // d3.select('.div-tooltip').remove();

        // var tooltip = chartWrapper.append('div')
        //     .classed('div-tooltip', true)
        //     .html(infoBox.html())
        //     .style('width', ttWidth + 'px');

        // console.log(d3.select(chartElement.node().parentNode));

        $(tooltip.node()).show();

        tooltip
            .html(ttTemplate(selectedData))
            .style('max-width', isMobile ? null : ttWidth + 'px')
            .style('border-color', colorScale(selectedData['category']))
            .style('left', function() {
                // console.log(xScale(selectedData[dateColumn]));
                // console.log(chartWidth / 2);
                // console.log(xScale(selectedData[dateColumn]) < (chartWidth / 2));
                if ( isMobile ) {
                    return 0;
                }
                else if ( xScale(selectedData[dateColumn]) < (chartWidth / 2) ) {
                    return (window.pageXOffset + matrix.e + ttOffset) + 'px';
                }
                else {
                    return (window.pageXOffset + matrix.e - this.clientWidth - ttOffset ) + 'px';
                }
            })
            .style('top', function() {
                if ( yScale(selectedData[valueColumn]) < (chartHeight / 2) ) {
                    return (window.pageYOffset + matrix.f + ttOffset) + 'px';
                }
                else {
                    return (window.pageYOffset + matrix.f - this.clientHeight - ttOffset ) + 'px';
                }
            });

        tooltip
            .select('#select-series').selectAll('option')
            .data(config['data'])
        .enter()
            .append('option')
            .attr('value', function (d) { return d.name; })
            .text(function (d) { return d.name; });

        $('.tooltip-details #close').click(function(e) {
            e.preventDefault();

            dispatch.recordclear();
        });

        $('#ttMore-details').click(function(e) {
            e.preventDefault();

            $(this).text($('.tooltip-details .more-details').is(':visible') ? 'Show details' : 'Hide details');

            $('.tooltip-details .more-details').toggle();
        });


        pymChild.sendHeight();
    });

    chartElement.append('g')
        .attr('class', 'value')
        .selectAll('text')
        .data(config['data'])
        .enter().append('text')
            .attr('text-anchor', function(d) {
                var last = d['values'][d['values'].length - 1];

                return (xScale(last[dateColumn]) - 5) > (chartWidth / 2) ? 'end' : 'start';
            })
            .attr('x', function(d, i) {
                var last = d['values'][d['values'].length - 1];

                return xScale(last[dateColumn]) - 5;
            })
            .attr('y', function(d) {
                var last = d['values'][d['values'].length - 1];

                return yScale(last[valueColumn]) - 3;
            })
            .text(function(d) {
                var last = d['values'][d['values'].length - 1];
                var value = last[valueColumn];

                var label = last[valueColumn].toFixed(1);

                if (!isMobile) {
                    label = d['name'] + ': ' + label;
                }

                return label;
            });
};

var renderTable = function(config) {
    /*
     * Setup
     */
    var dateColumn = 'date';
    var valueColumn = 'amt';
    // var dateFormat = d3.time.format('%b %Y');

    if ( !tableRendered ) {
        var pvTable = $('#pv-table').DataTable({
            data: config['data'],
            buttons: [
                'csv',
                {
                    extend:'pdf',
                    exportOptions: {
                        columns: ':visible'
                    }
                }
            ],
            deferRender: true,
            dom: 'Bfrtip',
            order: [[0, 'desc']],
            responsive: true,
            rowId: 'id',
            select: true,
            columns: [
                {
                    title: 'Date',
                    data: 'date',
                    render: function ( data, type, row ) { return dateFormat(data); },
                    responsivePriority: 1
                },
                {
                    title: 'Cell type',
                    data: 'name',
                    responsivePriority: 3
                },
                {
                    title: 'Cell category',
                    data: 'category',
                    responsivePriority: 5
                },
                {
                    title: 'Group(s)',
                    data: 'institutions',
                    render: function ( data, type, row ) { return data.join('; '); },
                    responsivePriority: 4
                },
                {
                    title: 'Efficiency (%)',
                    data: 'amt',
                    responsivePriority: 2
                },
                {
                    title: 'V<sub>OC</sub> (mV)',
                    data: 'fields.Voc (mV)', defaultContent: '',
                    responsivePriority: 7
                },
                {
                    title: 'J<sub>SC</sub> (mA/cm<sup>2</sup>)',
                    data: 'fields.Jsc (mAcm-2)', defaultContent: '',
                    responsivePriority: 8
                },
                {
                    title: 'Area (cm<sup>2</sup>)',
                    data: 'fields.area (cm-2)', defaultContent: '',
                    responsivePriority: 9
                },
                {
                    title: 'FF (%)',
                    data: 'fields.FF (%)', defaultContent: '',
                    responsivePriority: 10
                },
                {
                    title: 'Suns',
                    data: 'fields.Sun', defaultContent: 1,
                    responsivePriority: 6
                },

                {
                    title: 'References',
                    data: 'references',
                    defaultContent: 'not available',
                    render: function ( data, type, row ) {
                        if ( data.length === 0 ) {
                            return 'not available';
                        }
                        var inner = '';
                        data.forEach(function(d) {
                            inner += '<li>' + d + '</li>';
                        });
                        return '<ul>' + inner + '</ul>';
                    },
                    responsivePriority: 11
                },
                {
                    title: 'Last Modified',
                    data: 'date-added',
                    render: function ( data, type, row ) { return versionFormat(data); },
                    responsivePriority: 12
                },
            ]
        });

        $('.dt-buttons').prepend('<span>Export to: </span>');


        pvTable.on( 'click', 'tr', function () {
            var id = this.id;
            // console.log(id);
            if ( id ) {
                dispatch.recordchange(id);
            }
        } );

        pvTable.on( 'mouseover', 'tr', function () {
            var id = this.id;
            // console.log(id);
            if ( id ) {
               dispatch.recordhover(id);
            }
        } );
        // pvTable.on( 'select', function ( e, dt, type, indexes ) {
        //     // console.log('selection!' + type);
        //     if ( type === 'row' ) {
        //         var data = pvTable.rows( indexes ).data().pluck( 'id' );
        //         console.log(pvTable.rows( indexes ));
        //         var id = pvTable[ type ]( indexes ).nodes().id;
        //         console.log(id);
        //         dispatch.recordchange.call(this, d3.select('#' + id).node());
        //         // do something with the ID of the selected items
        //     }
        // } );

        dispatch.on('recordchange.table', function(id) {
            // var el = d3.select('#' + id);
            // var selectedData = el.datum();
            // console.log(selectedData.id);

            pvTable.row('.selected').deselect();

            pvTable.row('#' + id).select();
        });

        // pymChild.sendHeight();

        pvTable.on( 'draw', function () {
            console.log( 'Table redrawn' );
            pymChild.sendHeight();
        } );

        tableRendered = true;
    }
};

/*
 * Initially load the graphic
 * (NB: Use window.load to ensure all images have loaded)
 */
window.onload = onWindowLoaded;
