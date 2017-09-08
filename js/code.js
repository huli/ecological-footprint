 

"use strict";


var bubble_opacity = .7;
var bubble_chart_div = ".container-bubble #graph";
var timeline_div = ".container-timeline #graph";
var closing_div = ".container-closing #graph";
var timeline_opacity = 1;
var timeline_stroke = 3;
var timeline_inactive_opacity = .3;
var colors = ['#8c510a','#bf812d','#dfc27d','#f6e8c3','#c7eae5','#80cdc1','#35978f','#01665e'];

var country_metrics_data;
var timeline_metrics_data;
var biocapacity_metrics;


var animation_time = 1000;
var animation_overlap = 500;

var y_scale;
var x_scale;
var r_scale;

var x_timeline;
var world_biocap;
var world_footprint;
var y_timeline;
var line;
var zero_line; 
var geo_data;

var bubbleGroups;
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
    var svg_worldmap = d3.select(closing_div)
        .select("svg");
    
    // draw legend
    var legendGroup = svg_worldmap.append("g");
    var legend_width = 0;
    legendGroup
        .attr("transform", "translate(850, 650)")
        .selectAll("rect")
        .data(colors)
        .enter()
        .append("rect")
        .style("fill", function(d) {return d;})
        .attr("width", 20)
        .attr("height", 10)
        .attr("x", function(d,i) 
        {
            var current_x = legend_width;
            legend_width += 20; 
            return current_x; 
        })
        .attr("y", 0)
        .attr("opacity", .7);
    legendGroup
        .append("text")
        .attr("y", 20)
        .attr("x",  - 5)
        .attr("class", "legend-text-map")
        .text("0.5");
    legendGroup
        .append("text")
        .attr("y", 20)
        .attr("x",  legend_width/2 - 4)
        .attr("class", "legend-text-map")
        .text("1.0");
    legendGroup
        .append("text")
        .attr("y", 20)
        .attr("x", legend_width - 5)
        .attr("class", "legend-text-map")
        .text("2.0");
    legendGroup
        .append("text")
        .attr("y", -4)
        .attr("x", -3)
        .attr("class", "legend-title-map")
        .text("Sustainability (Footp./Biocap.)")
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
    change_text("Switzerland")
}

function color_countries()
{
    var svg = d3.select(closing_div)
        .select("svg");

    var div = d3.select("body").append("div")	
        .attr("class", "tooltip")				
        .style("opacity", 0);

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
                        var country_name = v[0].country;

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
                                country: country_name,
                                max_year: last_year_of_country,
                                biocap: 0,
                                footprint: 0,
                                metric: 0
                            }
                        }

                        var biocap = biocap_entry[0].total;
                        var footprint = footprint_entry[0].total;

                        var result = footprint / biocap;

                        return {
                                country: country_name,
                                max_year: last_year_of_country,
                                biocap: biocap,
                                footprint: footprint,
                                metric: result
                        }
                    })
                    .entries(capacity_and_prints);

        svg.selectAll('path')
        .on("mouseover", function(d) {
            div.transition()		
                .duration(300)		
                .style("opacity", .8);		
            div.html(function(){
                var country_name = d.properties.name;                
                var text = "<b>"+ country_name + "</b>";
                var value = GetCountryData(country_name);
                if(value == null)
                    return text + "<br/>" + no_information_tooltip;
                else{
                    return "<table>"
                        + "<tr><td colspan=2>"+ text +"</td></tr>"
                        + "<tr><td>People: </td><td>" + Number(value.population).toLocaleString("en") + "</td></tr>"
                        + "<tr><td>Footprint: </td><td>" + Number(value.footprint).toFixed(2).toLocaleString("en") + " ha</td></tr>"
                        + "<tr><td>Biocapacity: </td><td>" + Number(value.biocap).toFixed(2).toLocaleString("en") + " ha</td></tr>"
                        + "<tr><td>Sustainability: </td><td>" + Number(value.metric).toFixed(2).toLocaleString("en") + "</td></tr>"
                        + "<tr><td>Status: </td><td>" + (value.metric > 1 ? "Debtor" : "Creditor") + "</td></tr>"
                        +"</table>";
                }
            })	
                .style("left", (d3.event.pageX + 10) + "px")		
                .style("top", (d3.event.pageY - 10) + "px")
        })					
        .on("mouseout", function(d) {	
            div.transition()		
                .duration(500)		
                .style("opacity", 0);	
        })
        .transition()
        .duration(600)
        .style("opacity", .7)
        .style('fill', function (d)
            {
                return get_color(d.properties.name);
            });
}

var creditor_text = "{country} has a footprint of {fp} hectares and "+
                    "a biocapacity of {bc} hectares. "+
                    "The country is one of the worlds "+ 
                    "<b>creditors</b> and builds more ressource than it "+
                    "uses."
                    
var debitor_text = "{country} has a footprint of {fp} hectares and "+
                    "only a biocapacity of {bc} hectares. "+
                    "The country is one of the worlds "+ 
                    "<b>debtors</b> and is using more resources than it "+
                    "can build."

var even_text = "{country} has a footprint of {fp} hectares and "+
                    "a biocapacity of {bc} hectares. "+
                    "Its use of ressources is "+ 
                    "in harmony with its build up."

var no_information_text = "This country has provided no information<br/>" +
                          " to the Global Footprint Network. <br/>" +
                          "Sorry."

var no_information_tooltip = "No information available";

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
    if(roundToOne(value.metric) == 1)
    {
        text = even_text;
    }
    else if(value.metric > 1)
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
        .replace("{country}", value.country)

    d3.select("#you-text")
        .html(text);
}

function GetCountryData(name)
{
    name = CorrectCountryNames(name);
    var record = country_metrics_data.filter(function(f) 
    { 
        return f["Country Name"] == name; 
    });
    if(record.length < 1)
    {
        return null;
    }
    var metric_record = get_metric(name);
    if(metric_record.length < 1)
    {
        return null;
    }
    return {
        population: record[0].Population,
        hdi: record[0].HDI,
        biocap: metric_record.biocap,
        footprint: metric_record.footprint,
        metric: metric_record.metric,
        country: metric_record.country
    };
}

function get_metric(name)
{
    name = CorrectCountryNames(name);
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

function CorrectCountryNames(name)
{
    var mappings = {
        "USA": "United States of America",
        "Democratic Republic of the Congo": "Congo, Democratic Republic of",
        "Republic of the Congo": "Congo",
        "Northern Cyprus": "Cyprus",
        "England": "United Kingdom",
        "South Korea": "Korea, Republic of",
        "Russia": "Russian Federation",
        "Syria": "Syrian Arab Republic",
        "Libya": "Libyan Arab Jamahiriya",
        "Iran": "Iran, Islamic Republic of"
    }
    if(!(name in mappings))
        return name;

    return mappings[name];
}

function get_color(d)
{
    var node = get_metric(d); 
    if(node == null)
        return "lightgray";

    var val = node.metric;
    var color_index = 0;

    switch (true) {
        case (val < 0.5): color_index = 7; break;
        case (val < 0.667): color_index = 6; break;
        case (val < 0.833): color_index = 5; break;
        case (val < 1): color_index = 4; break;
        case (val < 1.333): color_index = 3; break;
        case (val < 1.667): color_index = 2; break;
        case (val < 2.0): color_index = 1; break;
        case (val >= 2.0): color_index = 0; break;
        default:
            return "lightgray";
    }


    return colors[color_index];
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

    AnnotateSource(svg, 780, innerHeight - 25);
}

function draw_timeline(data)
{
    timeline_metrics_data = data;
}

var isWorstTimelineShown = false;

function show_worst_timeline()
{
    if(isWorstTimelineShown)
        return;

    isWorstTimelineShown = true;
    
    var svg = d3.select(timeline_div)
        .select("svg");
    
    // Remove annotations
    svg.selectAll("g > text").filter(".timeline-annotation")
        .transition()
        .duration(animation_time/2)
        .style("opacity", 0);

    svg.selectAll("path")
        .transition()
        .duration(animation_time/2)
        .attr("stroke-opacity", 0);

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

    // Show legend
    var legend = svg.append("g");

    legend.append("text")
        .attr("class", "timeline-annotation")
        .style("fill", "#d8b365")
        .attr("x", x_timeline(new Date(1973,1,1)))
        .attr("y", y_timeline(2.3))
        .text("Footprint of Fiji")
        .transition()
        .duration(animation_time*3)
        .style("opacity", .7)

    legend.append("text")
        .attr("class", "timeline-annotation")
        .style("fill", "#5ab4ac")
        .attr("x", x_timeline(new Date(1977,1,1)))
        .attr("y", y_timeline(3.5))
        .text("Biocapacity of Fiji")
        .transition()
        .duration(animation_time*3)
        .style("opacity", .7);

    // Show Annotations
    const annotations =  [
        {
            note: {
                label: "The footprint rises from 2.1 ha to 3.6 h.a",
                title: "2008 - 2013"
            },
            data: { date: new Date(2011, 1, 1), value: 3.3 },
            dy: -80,
            dx: -80
        }, 
        {
            type: d3.annotationCalloutCircle,
            note: {
                label: "The British granted Fiji independence.",
                title: "1970"
            },
            data: { date: new Date(1970, 1, 1), value: 1.63 },
            dy: 50,
            dx: 80
        }, 
        {
            type: d3.annotationCalloutCircle,
            note: {
                label: "Fijian coup d'état.",
                title: "2006"
            },
            data: { date: new Date(2006, 1, 1), value: 2.8 },
            dy: -50,
            dx: -130
        }, 
        {
            type: d3.annotationCalloutCircle,
            note: {
                label: "Constitutional crysis in fiji.",
                title: "2006"
            },
            data: { date: new Date(2009, 1, 1), value: 2.3 },
            subject: { radius: 40, radiusPadding: 10 },
            dy: 80,
            dx: -70
        }, 
        {
            type: d3.annotationCalloutCircle,
            note: {
                label: "Interruption of democratic rule by military coups",
                title: "1987"
            },
            data: { date: new Date(1987, 1, 1), value: 2.0 },
            subject: { radius: 40, radiusPadding: 10 },
            dy: 80,
            dx: 0
        }].map(function(d){ d.color = "#E8336D"; return d})


    d3.select(timeline_div)
        .selectAll(".connector, .subject")
        .transition()
        .duration(animation_time/2)
        .style("stroke-opacity", 0)     

    var n = 0;
    d3.select(timeline_div)
        .selectAll(".annotation-note-label, .annotation-note-title")
        .each(function() { 
            n++;
        })
        .transition()
        .on("end", function() {
            n--;
            if (!n) 
            {
                
                RemoveTimelineAnnotations(timeline_div);

                const makeAnnotations = d3.annotation()
                .type(d3.annotationLabel)
                .accessors({
                    x: d => x_timeline(d.date),
                    y: d => y_timeline(d.value)
                })
                .accessorsInverse({
                    date: d => x.invert(d.x),
                    value: d => y.invert(d.y)
                })
                .annotations(annotations);
        
                d3.select(timeline_div)
                    .select("svg")
                    .append("g")
                    .attr("class", "annotation-group")
                    .call(makeAnnotations);
            
                d3.select(timeline_div).selectAll(".connector, .subject")
                    .transition()
                    .duration(animation_time * 3)
                    .style("stroke-opacity", .3)     
            
                d3.select(timeline_div).selectAll(".annotation-note-label, .annotation-note-title")
                    .transition()
                    .duration(animation_time * 3)
                    .style("opacity", .7)  
                }
            })
            .duration(animation_time/2)
            .style("opacity", 0) ;
}

function RemoveTimelineAnnotations(div_name)
{    
    d3.select(div_name)
    .selectAll(".connector, .subject")
    .remove();

    d3.select(timeline_div)
        .selectAll(".annotation-note-label, .annotation-note-title")
        .remove();
}

function show_best_timeline()
{
    var svg = d3.select(timeline_div)
        .select("svg");

    // Remove annotations
    svg.selectAll("g > text").filter(".timeline-annotation")
        .transition()
        .duration(animation_time/2)
        .style("opacity", 0);
    
    svg.selectAll("path")
        .transition()
        .duration(animation_time)
        .attr("stroke-opacity", 0);

    RemoveTimelineAnnotations(timeline_div);        

    var cyprus_biocap = timeline_metrics_data.filter(function (d){
        return d.record == "BiocapPerCap" &&
                d.country == "Cyprus";
    });

    var cyprus_footprint = timeline_metrics_data.filter(function (d){
        return d.record == "EFConsPerCap" &&
                d.country == "Cyprus";
    });

    // Show biocapacity of world
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
    
    // Show footprint of world
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

        // Show legend
        var legend = svg.append("g");

        legend.append("text")
            .attr("class", "timeline-annotation")
            .style("fill", "#d8b365")
            .attr("x", x_timeline(new Date(1990,1,1)))
            .attr("y", y_timeline(5.5))
            .text("Footprint of Cyprus")
            .transition()
            .duration(animation_time*3)
            .style("opacity", .7)

        legend.append("text")
            .attr("class", "timeline-annotation")
            .style("fill", "#5ab4ac")
            .attr("x", x_timeline(new Date(1990,1,1)))
            .attr("y", y_timeline(1))
            .text("Biocapacity of Cyprus")
            .transition()
            .duration(animation_time*3)
            .style("opacity", .7);

    // Show Annotations
    const annotations = [
        {
            note: {
                label: "The footprint of cyprus raises from 1.6 ha to 5.7 ha",
                title: "1961 - 2008"
            },
            data: { date: new Date(1983, 1, 1), value: 3.5 },
            dy: -60,
            dx: -60
        },
        {
            type: d3.annotationCalloutCircle,
            note: {
                label: "Coup d'état in cyprus. Turkish invasion and division",
                title: "1974"
            },
            data: { date: new Date(1974, 1, 1), value: 2.6 },
            dy: 50,
            dx: 40
        }, 
        {
            type: d3.annotationCalloutCircle,
            note: {
                label: "Cyprus joins the EU",
                title: "2004"
            },
            data: { date: new Date(2004, 1, 1), value: 5.47 },
            dy: -80,
            dx: -130
        }, 
        {
            note: {
                label: "Cyprus decreases its footprint from 5.7 ha to 3.3 ha. ",
                title: "2008 - 2013"
            },
            data: { date: new Date(2011, 1, 1), value: 4.7 },
            dy: 80,
            dx: -130
        },
        {
            type: d3.annotationCalloutCircle,
            note: {
                label: "Cyprus adopts the euro.",
                title: "2008"
            },
            data: { date: new Date(2008, 1, 1), value: 5.70 },
            dy: -40,
            dx: -10
        }
    ].map(function(d){ d.color = "#E8336D"; return d})

    const makeAnnotations = d3.annotation()
        .type(d3.annotationLabel)
        .accessors({
            x: d => x_timeline(d.date),
            y: d => y_timeline(d.value)
        })
        .accessorsInverse({
            date: d => x.invert(d.x),
            value: d => y.invert(d.y)
        })
        .annotations(annotations)

    d3.select(timeline_div)
        .select("svg")
        .append("g")
        .attr("class", "annotation-group")
        .call(makeAnnotations);

    d3.select(timeline_div).selectAll(".connector, .subject")
        .transition()
        .duration(animation_time * 5)
        .style("stroke-opacity", .3)     

    d3.select(timeline_div).selectAll(".annotation-note-label, .annotation-note-title")
        .transition()
        .duration(animation_time * 5)
        .style("opacity", .7)  
}

var isGlobalTimelineDefined = false;
function show_global_timeline()
{    
    var div_rect = d3.select(timeline_div).node().getBoundingClientRect();

    var cover = {
                    top: 20,
                    right: 50,
                    bottom: 40,
                    left: 600
                },
                width = div_rect.width - cover.left - cover.right,
                height = div_rect.height - cover.top - cover.bottom;
          
    if(!isGlobalTimelineDefined)
    {
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
            .attr("stroke-opacity", 0.2)
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
    }
    else
    {
        // Remove annotations
        var svg = d3.select(timeline_div).select("svg");

        svg.selectAll("g > text").filter(".timeline-annotation")
            .transition()
            .duration(animation_time/2)
            .style("opacity", 0);

        svg.selectAll("path")
            .transition()
            .duration(animation_time/2)
            .attr("stroke-opacity", 0);

        RemoveTimelineAnnotations(timeline_div);
    }

    var svg = d3.select(timeline_div).select("svg");

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

    if(!isGlobalTimelineDefined)
    {
        // draw axis labels    
        svg.append("text")
            .attr("class", "axis-label")
            .text("Year")                    
            .attr("x", 440)
            .attr("y", height + 38)
            .style("opacity", 0.1)
            .transition() 
            .duration(2000)
            .style("opacity", 0.8);

        svg.append("text")
            .attr("class", "axis-label")
            .text("Ecological Footprint (ha/capita)")  
            .attr("transform", "rotate(270, "+ (width + 40) +  " , 450)")
            .attr("x", width + 40)
            .attr("y", 450)
            .style("opacity", 0.1)
            .transition() 
            .duration(2000)
            .style("opacity", 0.8);
    }

    // Show legend
    var legend = svg.append("g");

    legend.append("text")
        .attr("class", "timeline-annotation")
        .style("fill", "#d8b365")
        .attr("x", x_timeline(new Date(1985,1,1)))
        .attr("y", y_timeline(2.9))
        .text("World Footprint")
        .transition()
        .duration(animation_time*3)
        .style("opacity", .7)

    legend.append("text")
        .attr("class", "timeline-annotation")
        .style("fill", "#5ab4ac")
        .attr("x", x_timeline(new Date(1990,1,1)))
        .attr("y", y_timeline(1.6))
        .text("World Biocapacity")
        .transition()
        .duration(animation_time*3)
        .style("opacity", .7);

    if(isGlobalTimelineDefined == false)
    {
        AnnotateSource(svg, 700 , 710);    
    }
    isGlobalTimelineDefined = true;
}

function start_worst()
{
    var svg = d3.select(bubble_chart_div)
        .select("svg")

    var svg_height = svg.node().getBoundingClientRect().height;

    // reposition the others circle to their default
    var filtered = get_all_but_best();
    var filtered_circles = svg.selectAll("circle")
                        .filter(function(d) 
                        { 
                            return d != undefined;
                        })
                        .data(filtered, key_func);

    var transitions = 0;
    filtered_circles.transition()
        .delay(function(d,i){ return 10 * (i)})
        .duration(2000) 
        .ease(d3.easePolyInOut)
        .attr("cy", function(d){
            return y_scale(d.EFConsPerCap);
        })
        .style("opacity", bubble_opacity)
        .attr("r", function(d){
            return r_scale(Math.sqrt(d.Population));
        });

    // show the worst bubbles. resp. hide others
    var filtered = get_all_but_worst();
    hide_bubbles(filtered);

        
    bubbleGroups.selectAll("text")
        .transition()
        .duration(1000)
        .style("opacity", 0)
        .remove();

    bubbleGroups
        .filter(function(d)
        {
            return !filterWorstFunc(d)
        })
        .append("text") 
        .attr("class", "bubble-annotation")                   
        .text(function (d) {
            
            console.log("showing country: " + d["Country Name"])
            return d["Country Name"];
        })
        .attr("dx", function(d, i){
            var xoffset = -45;
            if(d["Country Name"] == "Australia")
            {
                xoffset = -15;
            }
            return x_scale(d.HDI) + xoffset;
        })
        .attr("dy", function(d){
            return y_scale(d.EFConsPerCap) + 20;
        })
        .transition()
        .duration(3000)
        .style("opacity", .8);
}


function filterBestFunc(d)
{
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
}

function filterWorstFunc(d)
{
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
}

function get_all_but_best()
{
    return country_metrics_data.filter(function(d) {
        return filterBestFunc(d);
    });
}

function get_all_but_worst()
{
    return country_metrics_data.filter(function(d){
                        return filterWorstFunc(d);
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
                        .filter(function(d) 
                        { 
                            return d != undefined;
                        })
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



var isBestBubblesShown = false;

function start_best()
{
    if(isBestBubblesShown)
    {
        var svg = d3.select(bubble_chart_div)
                .select("svg");

        // reposition the others circle to their default
        var filtered = country_metrics_data;
        var filtered_circles = svg.selectAll("circle")
                            .filter(function(d) 
                            { 
                                return d != undefined;
                            })
                            .data(filtered, key_func);
    
        var transitions = 0;
        filtered_circles.transition()
            .delay(function(d,i){ return 10 * (i)})
            .duration(2000) 
            .ease(d3.easePolyInOut)
            .attr("cy", function(d){
                return y_scale(d.EFConsPerCap);
            })
            .style("opacity", bubble_opacity)
            .attr("r", function(d){
                return r_scale(Math.sqrt(d.Population));
            });
    }

    var filtered = get_all_but_best();

    hide_bubbles(filtered);

    bubbleGroups
        .selectAll("text")
        .remove();

    bubbleGroups
        .filter(function(d)
        {
            return !filterBestFunc(d)
        })
        .append("text") 
        .attr("class", "bubble-annotation")                   
        .text(function (d) {
            console.log("showing country: " + d["Country Name"])
            return d["Country Name"];
        })
        .attr("dx", function(d, i){
            var yoffset = 5;
            if(d["Country Name"] == "Burundi")
            {
                yoffset = -10;
            }
            return x_scale(d.HDI) + yoffset;
        })
        .attr("dy", function(d){
            var yoffset = -5;
            if(d["Country Name"] == "Burundi")
            {
                yoffset = -10;
            }
            return y_scale(d.EFConsPerCap) + yoffset;
        })        
        .transition()
        .duration(3000)
        .style("text-opacity", .8)
        .style("opacity", .8);

    isBestBubblesShown = true;
}

function start_overview()
{
    d3.csv('country_metrics.csv', draw_overview_bubble)
}


var isOverviewDrawn = false;

function draw_overview_bubble(data)
{
    country_metrics_data = data;

    if(isOverviewDrawn) return;
    isOverviewDrawn = true;

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
    x_scale = d3.scaleLinear()
                .range([0, width])
                .domain([0, 1.0]);

    var xAxis = d3.axisBottom()
        .scale(x_scale)
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
    bubbleGroups = svg.selectAll("bubble")
        .data(data.sort(function(x, y){
            return x.Population > y.Population; 
            }))
        .enter()
        .append("g");

    bubbleGroups.append("circle")
        .attr("class", "bubble")
        .attr("cx", function(d, i){
            return x_scale(d.HDI);
        })
        .attr("cy", function(d){
            return y_scale(0);
        })
        .on("mouseover", function(d) {
                    div.transition()		
                        .duration(300)		
                        .style("opacity", .8);		
                    div.html("<b>"+ d["Country Name"] + "</b><br/>EF: " 
                            + d.EFConsPerCap + "<br/>HDI: " 
                            + d.HDI+ "<br/>People: " 
                            + Number(d.Population).toLocaleString('en'))	
                        .style("left", (d3.event.pageX + 10) + "px")		
                        .style("top", (d3.event.pageY - 38) + "px")
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
            return x_scale(d.HDI);
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
        .attr("x1", x_scale(0.7))
        .attr("y1", height)
        .attr("x2", x_scale(0.7))
        .attr("y2", 0)
        .transition() 
        .duration(2000)
        .style("opacity", 0.3)
        .on("end", function() 
            {
                svg.append("text")
                    .attr("class", "annotation-text")
                    .text("High human development")
                    .attr("x", x_scale(0.7) + 10)
                    .attr("y", 100)
                    .style("opacity", 0)
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
                    .text("World biocapacity (1.7 h)")
                    .attr("x", 270)
                    .attr("y", y_scale(1.74) -9)
                    .style("opacity", 0)
                    .transition() 
                    .duration(2000)
                    .style("opacity", 0.8);
            });
    
    // draw axis labels    
    svg.append("text")
        .attr("class", "axis-label")
        .text("Human Development (HDI)")                    
        .attr("x", 530)
        .attr("y", height + 35)
        .style("opacity", 0.1)
        .transition() 
        .duration(2000)
        .style("opacity", 0.8);

    svg.append("text")
        .attr("class", "axis-label")
        .text("Ecological Footprint (ha/capita)")  
        .attr("transform", "rotate(270, "+ (width + 40) +  " , 450)")
        .attr("x", width + 40)
        .attr("y", 450)
        .style("opacity", 0.1)
        .transition() 
        .duration(2000)
        .style("opacity", 0.8);

    // Draw legend ------------------------------------------

    // Population size                
    var legendGroup = svg
        .append("g")
        .attr("transform", "translate(590, 140)")
        .style("opacity", 0);

    var biggest = 100000000;
    var medium = 10000000;

    legendGroup
        .append("text")
            .attr("class", "legend-title")
            .text("Population")                
            .attr("x", 2)
            .attr("y", 7);
    
    legendGroup
        .append("circle")
        .attr("cx", 20)
        .attr("cy", 30)
        .attr("r", r_scale(Math.sqrt(biggest)))
        .style("fill", "transparent")
        .style("stroke", "lightslategray")
        .style("opacity", .6);

    legendGroup
        .append("text")
        .attr("class", "legend-text")
        .text(Number(biggest/1000000).toLocaleString("en") + "M")
        .attr("x", 40)
        .attr("y", 34);
        
    legendGroup
        .append("circle")
        .attr("cx", 90)
        .attr("cy", 30)
        .attr("r", r_scale(Math.sqrt(medium)))
        .style("fill", "transparent")
        .style("stroke", "lightslategray")
        .style("opacity", .6);

    legendGroup
        .append("text")
        .attr("class", "legend-text")
        .text(Number(medium/1000000).toLocaleString("en") + "M")
        .attr("x", 100)
        .attr("y", 34);
        
    // Impact size
    var biggestImpact = 5000000000;
    var medianImpact = 50000000;
    var smallestImpact = 500000;

    var sizes = [500000, 5000000, 50000000, 500000000, 5000000000];

    var legendImpactGroup = svg
        .append("g")
        .attr("transform", "translate(600, 200)")
        .style("opacity", 0);;

    legendImpactGroup
        .append("text")
            .attr("class", "legend-title")
            .text("Impact (Footprint x People)")    
            .attr("x", -10)            
            .attr("y", 10);

    var legend_width = 0;
    legendImpactGroup
        .selectAll("rect")
        .data(sizes)
        .enter()
        .append("rect")
        .style("fill", function(d) {
            return colors[Math.round(colorScale(d))];
        })
        .attr("width", 20)
        .attr("height", 10)
        .attr("x", function(d,i) 
        {
            var current_x = legend_width;
            legend_width += 20; 
            return current_x; 
        })
        .attr("y", 20)
        .attr("opacity", .7);

    legendImpactGroup
        .append("text")
        .attr("class", "legend-text")
        .text(Number(sizes[0]/1000000).toLocaleString("en") + "Mha")
        .attr("x", -10)
        .attr("y", 40);

    legendImpactGroup
        .append("text")
        .attr("class", "legend-text")
        .text(Number(sizes[sizes.length-1]/1000000).toLocaleString("en") + "Mha")
        .attr("x",  legend_width - 15)
        .attr("y", 40);

    legendGroup
        .transition()
        .duration(animation_time*3)
        .style("opacity", 1);

    legendImpactGroup
        .transition()
        .duration(animation_time*3)
        .style("opacity", 1);

    AnnotateSource(svg, window.innerWidth - 480, window.innerHeight - 50)
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
            console.log("active: " + i);
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

    AnnotateSource(svg_worldmap, 780, innerHeight - 35);
}

function AnnotateSource(svg, left, top)
{
    svg
        .append("text")
        .text("Source: http://www.footprintnetwork.org")
        .attr("class", "source-citation")
        .attr("transform", "translate("+ left +","+ top +")")
}



render();

d3.select(window).on('resize', render)