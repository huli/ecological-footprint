 

"use strict";


var bubble_opacity = .7;
var bubble_chart_div = ".container-bubble #graph";
var timeline_div = ".container-timeline #graph";
var closing_div = ".container-closing #graph";
var timeline_opacity = 1;
var timeline_stroke = 3;
var timeline_inactive_opacity = .1;
var colors = ['#8c510a','#bf812d','#dfc27d','#f6e8c3','#c7eae5','#80cdc1','#35978f','#01665e'];

var country_metrics_data;
var timeline_metrics_data;
var biocapacity_metrics;


var animation_time = 1000;
var animation_overlap = 500;

var y_scale;
var r_scale;

var x_timeline;
var world_biocap;
var world_footprint;
var y_timeline;
var line;
var zero_line; 
var geo_data;

var svg_worldmap;


function render()
{

}

function highlight_country()
{
    var selectedCountry = this.value;

    var svg = d3.select(closing_div)
        .select("svg"); 

    svg.selectAll('path')
        .transition()
        .duration(animation_time)
        .style('fill', function (d){
                    if(selectedCountry.indexOf(d.properties.name) !== -1)
                    {
                        return "darkred";
                    }
                    return get_color(d.properties.name);
                });

    change_text(selectedCountry);
}

function draw_legend()
{
    var svg = d3.select(closing_div)
        .select("svg")
        .selectAll("circle")
        .data(colors)
        .enter()
        .append("circle")
        .attr("r", 10)
        .attr("cx", function(c,i ) 
            { 
                return 600 + (i * 80);
            }
        )
        .attr("cy", 700)
        .attr("fill", function(c) {return c;})

    // var legend = ["> 150%", 
    //                 "150% - 100%", 
    //                 "100% - 50%",
    //                 "50% - 0%",
    //                 "0% - 50%",
    //                 "50% - 100%",
    //                 "100% - 150%",
    //                 "150% <"];
    var legend = ["-150%", 
                    "", 
                    "",
                    "",
                    "+/- 0%",
                    "",
                    "",
                    "+150%"];
                    
    d3.select(closing_div)
        .append("div")
        .selectAll("h5")
        .data(legend)
        .enter()
        .append("h5")
        .style("position", "absolute")
        .style("top", "690px")
        .style("left", function(c, i) 
        { 
            return (585 + (i * 80)) + "px";
        })
        .text(function(d) {return d});
}

function show_chloropleth()
{
    var margin = 75,
        width = 1920 -margin,
        height = 1080 -margin;

    var svg = d3.select(closing_div)
        .select("svg");

    
    d3.select('select')
        .attr('id','xSelect')
        .on('change', highlight_country)
        .selectAll('option')
        .data(geo_data.features)
        .enter()
        .append('option')
        .attr('value', function (feature) { return feature.properties.name })
        .text(function (feature) { return feature.properties.name ;});

    color_countries();
    draw_legend();
}

function color_countries()
{
    var svg = d3.select(closing_div)
        .select("svg");

    var capacity_and_prints = timeline_metrics_data.filter(function(d) 
                                { 
                                    return d.record == "BiocapPerCap" 
                                    || d.record == "EFConsPerCap"; 
                                    });

    
    biocapacity_metrics = d3.nest()
                    .key(function(d) { return d.country; })
                    .rollup(function(v) 
                    { 
                        var last_year_of_country = d3.max(v, function(d) {return d.year;}).getFullYear();

                        var biocap_entry = v.filter(function(iv){
                            return iv.year.getFullYear() == last_year_of_country && iv.record == "BiocapPerCap";
                        });

                        var footprint_entry = v.filter(function(iv){
                            return iv.year.getFullYear() == last_year_of_country && iv.record == "EFConsPerCap";
                        });

                        var country_metric;
                        if(biocap_entry.length < 1 || footprint_entry < 1)
                        {
                            return  {
                                max_year: last_year_of_country,
                                biocap: 0,
                                footprint: 0,
                                metric: 0
                            }
                        }

                        var biocap = biocap_entry[0].total;
                        var footprint = footprint_entry[0].total;

                        var result;
                        if(biocap > footprint)
                        {
                            result = 1.0000 * biocap / footprint;
                        }
                        else{
                            
                            result = -(1.0000 * footprint / biocap);
                        }

                        return {
                                max_year: last_year_of_country,
                                biocap: biocap,
                                footprint: footprint,
                                metric: result
                        }
                    })
                    .entries(capacity_and_prints);

        svg.selectAll('path')
        .transition()
        .duration(600)
        .style("opacity", .7)
        .style('fill', function (d)
            {
                return get_color(d.properties.name);
            });
}

var creditor_text = "Your country has a footprint of {fp} hectares and  "+
                    "only a biocapacity of {bc} hectares. <br/>"+
                    "That means, your country is one of the worlds "+ 
                    "<br>creditors</br> - <br/>you are using more resources than you "+
                    "can build."
var debitor_text = "Your country has a footprint of {fp} hectares and "+
                    "only a biocapacity of {bc} hectares. <br/>"+
                    "That means, your country is one of the worlds "+ 
                    "<br>debitors</br> - <br/>you build more ressource than you "+
                    "use. Great!"
var no_information_text = "Your country has provided no information<br/>" +
                          " to the Global Footprint Network. <br/>" +
                          "Sorry."

function roundToOne(num) {    
    return +(Math.round(num + "e+1")  + "e-1");
}

function change_text(selectedCountry)
{
    var value = get_metric(selectedCountry);
    var text = "";
    if(value == null)
    {    
        d3.select("#you-text")
            .html(no_information_text);
        return;
    }
    else if(value.metric > 0)
    {
        text = debitor_text
    }
    else
    {
        text = creditor_text;
    }
    
    text = text
        .replace("{bc}", roundToOne(value.biocap))
        .replace("{fp}", roundToOne(value.footprint))

    d3.select("#you-text")
        .html(text);
}

function get_metric(name)
{
    var record = biocapacity_metrics.filter(function(f) 
    { 
        return f.key == name; 
    });

    if(record.length < 1)
    {
        return null;
    }


    return record[0].value;
}

function get_color(d)
{
    var node = get_metric(d); 
    if(node == null)
        return "#f5f5f5";

    var val = node.metric;
    var color_index = 0;

    switch (true) {
        case (val < -1.5): color_index = 1; break;
        case (val < -1): color_index = 2; break;
        case (val < -0.5): color_index = 3; break;
        case (val < 0.0): color_index = 4; break;
        case (val < 0.5): color_index = 5; break;
        case (val < 1.0): color_index = 6; break;
        case (val < 1.5): color_index = 7; break;
        case (val >= 1.5): color_index = 8; break;
    }


    return colors[color_index-1];
}

function GetProjection()
{
    var margin = 50,
    width = innerWidth -margin,
    height = innerHeight -2*margin;

    return d3.geoMercator()
        .scale(200)
        .translate([width / 1.7, height / 1.6]);
}

var isClosingShown = false;

function show_closing()
{
    if(isClosingShown) return;
    isClosingShown = true;

    var margin = 50,
        width = innerWidth -margin,
        height = innerHeight -margin;

    var svg = d3.select(closing_div)
                .select("svg")
                .attr("width", width + margin)
                .attr("height", height + margin)
                .append('g')
                .attr('class', 'map');
    
    var projection = GetProjection();
            
    var path = d3.geoPath().projection(projection);

    var map = svg.selectAll('path')
                    .data(geo_data.features)
                    .enter()
                    .append('path')
                    .attr('d', path)
                    .style('fill',"white")
                    .style('stroke', "white")
                    .style('stroke-width',"0.3")
                    .transition()
                    .duration(animation_time * 1.5)
                    .attr('d', path)
                    .style('fill',"#d8ecf3")
                    .style('stroke', "white")
                    .style('stroke-width',"0.3");
}

function draw_timeline(data)
{
    timeline_metrics_data = data;
}

function show_worst_timeline()
{
    var svg = d3.select(timeline_div)
        .select("svg");
    
    svg.selectAll("path")
        .transition()
        .duration(animation_time)
        .attr("stroke-opacity", timeline_inactive_opacity);

    var fiji_biocap = timeline_metrics_data.filter(function (d){
        return d.record == "BiocapPerCap" &&
                d.country == "Fiji";
    });

    var fiji_footprint = timeline_metrics_data.filter(function (d){
        return d.record == "EFConsPerCap" &&
                d.country == "Fiji";
    });

    // Show biocapacity of world and country
    svg.append("path")
        .datum(world_biocap)
        .attr("fill", "none")
        .attr("stroke", "#5ab4ac")
        .attr("stroke-linejoin", "round")
        .attr("stroke-linecap", "round")
        .attr("stroke-width", 1)
        .attr("stroke-opacity", 0.1)
        .attr("d", line)
        .datum(fiji_biocap)
        .transition()
        .duration(animation_time) 
        .ease(d3.easePolyInOut)
        .attr("d", line)
        .attr("stroke-opacity", timeline_opacity)
        .attr("stroke-width", timeline_stroke);
    
    // Show footprint of world and country
    svg.append("path")
        .datum(world_footprint)
        .attr("class", ".reference")
        .attr("fill", "none")
        .attr("stroke", "#d8b365")
        .attr("stroke-linejoin", "round")
        .attr("stroke-linecap", "round")
        .attr("stroke-width", 1)
        .attr("stroke-opacity", 0.1)
        .attr("d", line)
        .datum(fiji_footprint)
        .transition()
        .delay(2* (animation_time - animation_overlap))
        .duration(animation_time) 
        .ease(d3.easePolyInOut)
        .attr("d", line)
        .attr("stroke-opacity", timeline_opacity)
        .attr("stroke-width", timeline_stroke);
}

function show_best_timeline()
{
    var svg = d3.select(timeline_div)
        .select("svg");
    
    svg.selectAll("path")
        .transition()
        .duration(animation_time)
        .attr("stroke-opacity", timeline_inactive_opacity);

    var cyprus_biocap = timeline_metrics_data.filter(function (d){
        return d.record == "BiocapPerCap" &&
                d.country == "Cyprus";
    });

    var cyprus_footprint = timeline_metrics_data.filter(function (d){
        return d.record == "EFConsPerCap" &&
                d.country == "Cyprus";
    });

    // Show biocapacity of world and country
    svg.append("path")
        .datum(world_biocap)
        .attr("fill", "none")
        .attr("stroke", "#5ab4ac")
        .attr("stroke-linejoin", "round")
        .attr("stroke-linecap", "round")
        .attr("stroke-width", 1)
        .attr("stroke-opacity", 0.1)
        .attr("d", line)
        .datum(cyprus_biocap)
        .transition()
        .duration(animation_time) 
        .ease(d3.easePolyInOut)
        .attr("d", line)
        .attr("stroke-opacity", timeline_opacity)
        .attr("stroke-width", timeline_stroke);
    
    // Show footprint of world and country
    svg.append("path")
        .datum(world_footprint)
        .attr("class", ".reference")
        .attr("fill", "none")
        .attr("stroke", "#d8b365")
        .attr("stroke-linejoin", "round")
        .attr("stroke-linecap", "round")
        .attr("stroke-width", 1)
        .attr("stroke-opacity", 0.1)
        .attr("d", line)
        .datum(cyprus_footprint)
        .transition()
        .delay(2* (animation_time - animation_overlap))
        .duration(animation_time) 
        .ease(d3.easePolyInOut)
        .attr("d", line)
        .attr("stroke-opacity", timeline_opacity)
        .attr("stroke-width", timeline_stroke);
}

var isGlobalTimelineDefined = false;
function show_global_timeline()
{    
    if(isGlobalTimelineDefined) return;
    isGlobalTimelineDefined = true;

    var div_rect = d3.select(timeline_div).node().getBoundingClientRect();

    var cover = {
                    top: 20,
                    right: 20,
                    bottom: 20,
                    left: 600
                },
                width = div_rect.width - cover.left - cover.right,
                height = div_rect.height - cover.top - cover.bottom;

    d3.select(timeline_div)
            .select("svg")
            .remove();

    var svg = d3.select(timeline_div)
        .append("svg")
        .style("padding-left", cover.left)  
        .style("padding-top", cover.top)        
        .attr("width", width + cover.left + cover.right)
        .attr("height", height + cover.top + cover.bottom);

    x_timeline = d3.scaleTime()
        .domain([new Date(1960, 1, 1), new Date(2017, 1, 1)])
        .rangeRound([0, width]);

    world_biocap = timeline_metrics_data.filter(function (d){
        return d.record == "BiocapPerCap" &&
                d.country == "World";
    });

    world_footprint = timeline_metrics_data.filter(function (d){
        return d.record == "EFConsPerCap" &&
                d.country == "World";
    });

    y_timeline = d3.scaleLinear()
        .domain([0, 7.2])
        .rangeRound([height, 0]);

    line = d3.line()
        .x(function(d) { return x_timeline(d.year); })
        .y(function(d) { return y_timeline(d.total); });

    zero_line = d3.line()
        .x(function(d) { return x_timeline(d.year); })
        .y(function(d) { return y_timeline(0); });

    
    svg.append("g")
        .attr("transform", "translate(0," + height + ")")
        .call(d3.axisBottom(x_timeline))
        .style("opacity", .4)
        .attr("stroke-opacity", 0.1)
        .select(".domain")
        .remove();

    svg.append("g")
        .attr("transform", "translate(" + width + ", 0)")
        .call(d3.axisRight(y_timeline))
        .style("opacity", .4)
        .attr("stroke-opacity", 0.1)
        .append("text")
        .attr("transform", "rotate(-90)")
        .attr("y", 6)
        .attr("dy", "0.71em")
        .attr("text-anchor", "end");    
        //.text("ef per capita");

    // Show biocapacity of world and country
    svg.append("path")
        .datum(world_biocap)
        .attr("fill", "none")
        .attr("stroke", "#5ab4ac")
        .attr("stroke-linejoin", "round")
        .attr("stroke-linecap", "round")
        .attr("stroke-width", 1)
        .attr("stroke-opacity", 0.1)
        .attr("d", zero_line)
        .transition()
        .duration(animation_time) 
        .ease(d3.easePolyInOut)
        .attr("d", line)
        .attr("stroke-opacity", timeline_opacity)
        .attr("stroke-width", timeline_stroke);
    
    // Show footprint of world and country
    svg.append("path")
        .datum(world_footprint)
        .attr("class", ".reference")
        .attr("fill", "none")
        .attr("stroke", "#d8b365")
        .attr("stroke-linejoin", "round")
        .attr("stroke-linecap", "round")
        .attr("stroke-width", 1)
        .attr("stroke-opacity", 0.1)
        .attr("d", zero_line)
        .transition()
        .delay(2* (animation_time - animation_overlap))
        .duration(animation_time) 
        .ease(d3.easePolyInOut)
        .attr("d", line)
        .attr("stroke-opacity", timeline_opacity)
        .attr("stroke-width", timeline_stroke);
}

function start_worst()
{
    var svg = d3.select(bubble_chart_div)
        .select("svg")

    var svg_height = svg.node().getBoundingClientRect().height;

    // reposition the others circle to their default
    var filtered = get_all_but_best();
    var filtered_circles = svg.selectAll("circle")
                        .data(filtered, key_func);

    var transitions = 0;
    filtered_circles.transition()
        .delay(function(d,i){ return 10 * (i)})
        .duration(1000) 
        .ease(d3.easePolyInOut)
        .attr("cy", function(d){
            return y_scale(d.EFConsPerCap);
        })
        .on("start", function() 
            {
                transitions++;
            }  
        )
        .on("end", function() 
        {
            if( --transitions === 0 ) 
            {
                // show the worsts bubbles. resp. hide others
                var filtered = get_all_but_worst();

                hide_bubbles(filtered);
            }
        })
        .style("opacity", bubble_opacity)
        .attr("r", function(d){
            return r_scale(Math.sqrt(d.Population));
        });
}


function get_all_but_best()
{
    return country_metrics_data.filter(function(d){
                        switch(d["Country Name"])
                        {
                            case "Haiti":
                            case "Burundi":
                            case "Eritrea":
                                return false;
                                break;
                            default:
                                return true;
                        }
                    });
}

function get_all_but_worst()
{
    return country_metrics_data.filter(function(d){
                        switch(d["Country Name"])
                        {
                            case "Luxembourg":
                            case "Canada":
                            case "Australia":
                                return false;
                                break;
                            default:
                                return true;
                        }
                    });
}


function key_func(d){
    return d['Country Name'];
}

function hide_bubbles(bubbles)
{
    var svg = d3.select(bubble_chart_div)
        .select("svg")

    var svg_height = svg.node().getBoundingClientRect().height;

    var filtered_circles = svg.selectAll("circle")
                        .data(bubbles, key_func);

    filtered_circles.transition()
                    .delay(function(d,i){ return 10 * (i)})
                    .duration(1000) 
                    .ease(d3.easePolyIn)
                    .attr("cy", function(d){
                        return svg_height;
                    })
                    .style("opacity", 0)
                    .attr("r", function(d){
                        return 0;
                    });

    filtered_circles.exit()
                .style("opacity", 0.8)    
}



function start_best()
{
    var filtered = get_all_but_best();

    hide_bubbles(filtered);
}

function start_overview()
{
    d3.csv('country_metrics.csv', draw_overview_bubble)
}


var isOverviewDrawn = false;

function draw_overview_bubble(data)
{
    if(isOverviewDrawn) return;
    isOverviewDrawn = true;
    
    country_metrics_data = data;

    var div_rect = d3.select(bubble_chart_div).node().getBoundingClientRect();

    var cover = {
                    top: 20,
                    right: 50,
                    bottom: 20,
                    left: 180
                },
                width = div_rect.width - cover.left - cover.right,
                height = div_rect.height - cover.top - cover.bottom;

    var div = d3.select("body").append("div")	
        .attr("class", "tooltip")				
        .style("opacity", 0);

    d3.select(bubble_chart_div)
            .select("svg")
            .remove();
            
    d3.select(bubble_chart_div)
        .style("z-index", 1);

    var svg = d3.select(bubble_chart_div)
        .append("svg")
        .style("padding-top", cover.top)    
        .style("padding-left", cover.left)        
        .attr("width", width + cover.left + cover.right)
        .attr("height", height + cover.top + cover.bottom);

    var maxEfPerCapita = d3.max(data, function(d){
        return +d.EFConsPerCap;
    });

    var maxPopulation = d3.max(data, function(d){
        return +d.Population;
    });

    var maxHdi = d3.max(data, function(d){
        return +d.HDI
    });

    // display x-axis
    var xScale = d3.scaleLinear()
                .range([0, width])
                .domain([0, 1.0]);

    var xAxis = d3.axisBottom()
        .scale(xScale)
        .ticks(5);

    svg.append("g")
        .attr("class", "x axis")
        .attr("transform", "translate(0, "+ height +")")
        .call(xAxis)
        .transition()
        .duration(5000)
        .style("opacity", 0.4);
    
    // display y-axis
    y_scale = d3.scaleLinear()
                    .range([height, 0])
                    .domain([0, 13.2]);

    var maxCrossProduct = d3.max(data, function(d){
        return (+d.EFConsPerCap * d.Population);
    });
    
    var minCrossProduct = d3.min(data, function(d){
        return (+d.EFConsPerCap * d.Population);
    });
    

    var colorScale = d3.scaleLog()
        .range([0, 7])
        .domain([maxCrossProduct, minCrossProduct]);
                    
    var yAxis = d3.axisRight()
                    .scale(y_scale)
                    .ticks(5);

    svg.append("g")
        .attr("class", "y axis")
        .attr("transform", "translate("+ width +", 0)")
        .call(yAxis)
        .transition()
        .duration(5000)
        .style("opacity", 0.4);

    // create scale for radius/population
    r_scale = d3.scaleLinear()
        .range([3, 50])
        .domain([0, Math.sqrt(maxPopulation)]);

    // draw bubbles
    svg.selectAll("bubble")
        .data(data.sort(function(x, y){
            return 0; 
            }))
        .enter()
        .append("circle")
        .attr("class", "bubble")
        .attr("cx", function(d, i){
            return xScale(d.HDI);
        })
        .attr("cy", function(d){
            return y_scale(0);
        })
        .on("mouseover", function(d) {
                    div.transition()		
                        .duration(300)		
                        .style("opacity", .8);		
                    div.html(d["Country Name"] + "<br/>" 
                            + d.EFConsPerCap)	
                        .style("left", (d3.event.pageX) + "px")		
                        .style("top", (d3.event.pageY - 28) + "px");	
                    })					
                .on("mouseout", function(d) {	
                    div.transition()		
                        .duration(500)		
                        .style("opacity", 0);	
                })
        .style("opacity", 0)	
        .transition()
        .delay(function(d,i){ return 10 * (i)})
        .duration(1000) 
        .ease(d3.easePolyOut)
        .attr("cx", function(d, i){
            return xScale(d.HDI);
        })
        .attr("cy", function(d){
            return y_scale(d.EFConsPerCap);
        })
        .attr("r", function(d){
            return r_scale(Math.sqrt(d.Population));
        })                
        .style("fill", function(d){
            return colors[Math.round(colorScale(+d.Population * d.EFConsPerCap))];
        })
        .style("opacity", bubble_opacity)


    // draw hight development line 
    svg.append("line")
        .attr("class", "high-development-border")
        .attr("x1", xScale(0.7))
        .attr("y1", height)
        .attr("x2", xScale(0.7))
        .attr("y2", 0)
        .transition() 
        .duration(2000)
        .style("opacity", 0.3)
        .on("end", function() 
            {
                svg.append("text")
                    .attr("class", "annotation-text")
                    .text("High human development")
                    .attr("x", xScale(0.7) + 10)
                    .attr("y", 100)
                    .transition() 
                    .duration(2000)
                    .style("opacity", 0.8);
            });
    

    // draw world bio capacity line 
    svg.append("line")
        .attr("class", "world-biocapacity-border")
        .attr("x1", 0)
        .attr("y1", y_scale(1.74))
        .attr("x2", width)
        .attr("y2", y_scale(1.74))
        .transition() 
        .duration(2000)
        .style("opacity", 0.3)        
        .on("end", function() 
            {
                svg.append("text")
                    .attr("class", "annotation-text")
                    .text("World Biocapacity per Person (1.7 hectares)")
                    .attr("x", 270)
                    .attr("y", y_scale(1.74) -9)
                    .transition() 
                    .duration(2000)
                    .style("opacity", 0.8);
            });
    
    // draw axis labels
    
    svg.append("text")
        .attr("class", "axis-label")
        .text("HUMAN DEVELOPMENT")                    
        .attr("x", 550)
        .attr("y", height + 35)
        .style("opacity", 0.1)
        .transition() 
        .duration(2000)
        .style("opacity", 0.8);

    svg.append("text")
        .attr("class", "axis-label")
        .text("ECOLOGICAL FOOTPRINT")  
        //.attr("transform", "translate(400, 400)")
        .attr("transform", "rotate(270, "+ (width + 40) +  " , 450)")
        .attr("x", width + 40)
        .attr("y", 450)
        .style("opacity", 0.1)
        .transition() 
        .duration(2000)
        .style("opacity", 0.8);
}


function hideOthers(nottohide)
{
    
}

function intialize_graph_scroll()
{   
    var margin = 50,
    width = innerWidth -margin,
    height = innerHeight -margin;
    
    // Container Introduction    
    svg_worldmap = d3.select('.container-introduction #graph').html('')
        .append('svg');

    var gs = d3.graphScroll()
        .container(d3.select('#container'))
        .graph(d3.selectAll('#graph'))
        .eventId('uniqueId1')
        .sections(d3.selectAll('#sections > div'))
        .on('active', function(i){
            // nothing to do
        })

    svg_worldmap.attr("width", width)
                .attr("height", height + margin -20)
                .append('g')
                .attr('class', 'map');

    // Container Bubble
    var svg2 = d3.select('.container-bubble #graph').html('')
    .append('svg')
        .attrs({width: width, height: height})

    var gs2 = d3.graphScroll()
        .container(d3.select('.container-bubble'))
        .graph(d3.selectAll('.container-bubble #graph'))
        .eventId('uniqueId1')
        .sections(d3.selectAll('.container-bubble #sections > div'))
        .on('active', function(i){
            console.log("bubble " + i);
            switch(i)
            {
                case 1:
                    start_overview();
                    break;
                case 4:
                    start_best();
                    break;
                case 5:
                    start_worst();
                    break;
            }
        })
  
    // Container Timeline
    var svg3 = d3.select('.container-timeline #graph').html('')
    .append('svg')
        .attrs({width: width, height: height})

    var gs3 = d3.graphScroll()
        .container(d3.select('.container-timeline'))
        .graph(d3.selectAll('.container-timeline #graph'))
        .eventId('uniqueId1')
        .sections(d3.selectAll('.container-timeline #sections > div'))
        .on('active', function(i){
            console.log("timeline " + i);
            switch(i)
            {
                case 1:
                    show_global_timeline();
                    break;
                case 3:
                    show_best_timeline();
                    break;
                case 4:
                    show_worst_timeline();
            }
        })
  
          
    // Container Closing
    var svg3 = d3.select('.container-closing #graph').html('')
    .append('svg')
        .attrs({width: width, height: height})

    var gs3 = d3.graphScroll()
        .container(d3.select('.container-closing'))
        .graph(d3.selectAll('.container-closing #graph'))
        .eventId('uniqueId1')
        .sections(d3.selectAll('.container-closing #sections > div'))
        .on('active', function(i){
            console.log("you " + i);
            switch(i)
            {                
                case 1:
                    show_closing();
                    break;
                case 5:
                    show_chloropleth();
                    break;
            }
        })
          
}




function draw_map(data)
{
    geo_data = data;

    intialize_graph_scroll();

    var margin = 50,
    width = innerWidth -2*margin,
    height = innerHeight -2*margin;

    var projection = GetProjection();

    var path = d3.geoPath().projection(projection);

    var map = svg_worldmap.selectAll('path')
                    .data(geo_data.features)
                    .enter()
                    .append('path')
                    .attr('d', path)
                    .style('fill',"#d8ecf3")
                    .style('stroke', "white")
                    .style('stroke-width',"0.3");
}


render();

d3.select(window).on('resize', render)