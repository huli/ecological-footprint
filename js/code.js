 

"use strict";


var bubble_opacity = .8;
var bubble_chart_div = ".container-bubble #graph";
var timeline_div = ".container-timeline #graph";
var closing_div = ".container-closing #graph";
var timeline_opacity = 1;
var timeline_stroke = 4;
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

    var countryOfInterest = svg.selectAll("path")
                                .filter(function(d){
                                    return selectedCountry.indexOf(d.properties.name) !== -1;
                                });

    var repeated = 0;
    (function repeat(){
        countryOfInterest 
            .transition()
            .duration(700)
            .ease(d3.easeSinIn)
            .style("fill", "darkred")
            .transition()
            .duration(1200)
            .ease(d3.easeSinOut)
            .style("fill", function(d){
                return get_color(d.properties.name);
            })
            .on("end", function() {
                repeated++;
                if(repeated < 3)
                    return repeat();
                return () => {};
            });
    })();

    change_text(selectedCountry);
}

var isLegendDrawn = false;
function draw_legend()
{
    if(isLegendDrawn) return;

    isLegendDrawn = true;

    var svg_worldmap = d3.select(closing_div)
        .select("svg");
    
        
    var div_rect = svg_worldmap.node().getBoundingClientRect();

    // draw legend
    var legendGroup = svg_worldmap.append("g");
    var legend_width = 0;
    legendGroup
        .attr("transform", "translate(" + (div_rect.left + (div_rect.width/2) + 100) 
                    +","+ (div_rect.bottom - 110) +")")
        .selectAll("rect")
        .data(colors)
        .enter()
        .append("rect")
        .style("fill", function(d) {return d;})
        .attr("width", 35)
        .attr("height", 10)
        .attr("x", function(d,i) 
        {
            var current_x = legend_width;
            legend_width += 35; 
            return current_x; 
        })
        .attr("y", 0)
        .attr("opacity", .7);
    legendGroup
        .append("text")
        .attr("y", 20)
        .attr("x",  - 5)
        .attr("class", "legend-text-map")
        .text("0.5x");
    legendGroup
        .append("text")
        .attr("y", 20)
        .attr("x",  legend_width/2 - 10)
        .attr("class", "legend-text-map")
        .text("1.0x");
    legendGroup
        .append("text")
        .attr("y", 20)
        .attr("x", legend_width - 10)
        .attr("class", "legend-text-map")
        .text("2.0x");
    legendGroup
        .append("text")
        .attr("y", -5)
        .attr("x", legend_width/2 - 80)
        .attr("class", "legend-title-map")
        .text("Sustainability (Footp./Biocap.)")
}

function show_choropleth()
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
                                metric: 0,
                                details : {
                                    crop_land: 0,
                                    carbon: 0,
                                    fish_ground: 0,
                                    built_land: 0,
                                    forest_land: 0,
                                    grazing_land: 0
                                }
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
                                metric: result,
                                details : {
                                    crop_land: footprint_entry[0].crop_land,
                                    carbon: footprint_entry[0].carbon,
                                    fish_ground: footprint_entry[0].fishing_ground,
                                    built_land: footprint_entry[0].built_up_land,
                                    forest_land: footprint_entry[0].forest_land,
                                    grazing_land: footprint_entry[0].grazing_land
                                }
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
                        + "<tr><td>Sustainability: </td><td>" + Number(1/value.metric).toFixed(2).toLocaleString("en") + "</td></tr>"
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
        .on("click", function(d)
        {
            // first hide tooltip
            div.transition()		
                .duration(500)		
                .style("opacity", 0);
                
            // then show details
            var div_infos = d3
                    .select("body")
                    .select(".info");

            if(div_infos.empty())
            {
                div_infos = d3.select("body")
                    .append("div")	
                    .attr("class", "info")				
                    .style("opacity", 0);
            }
                
            div_infos.transition()		
                .duration(500)		
                .style("opacity", 1);		
            div_infos	
                .style("left", (innerWidth/2 - 350) + "px")		
                .style("top", (innerHeight/2 - 275 + scrollY) + "px")
                .style("pointer-events", "all");
            div_infos.on("click", function(d) {
                    hideInfos(div_infos);
                });

            DrawLightbox(div_infos);                     
            DrawHistogram(div_infos, d);
            DrawDougnut(div_infos, d);
        })
        .transition()
        .duration(600)
        .style("opacity", .7)
        .style('fill', function (d)
            {
                return get_color(d.properties.name);
            });
}

function hideInfos(div)
{
    div.style("opacity", 0)
        .transition()
        .duration(300)
        .style("pointer-events", "none");
    
    d3.select("#lightbox")
        .transition()
        .duration(300)
        .style("opacity", 0)
        .style("pointer-events", "none");
}

function DrawLightbox(div_infos)
{
    var div = d3.select("#lightbox");
    if(div.empty())
    {
        d3.select("body")
            .append("div")        
            .on("click", function(d){
                hideInfos(div_infos);
            })
            .attr("id", "lightbox")
            .style("opacity", 0);
    }

    d3.select('#lightbox')       
        .style("width", innerWidth + "px")
        .style("height", innerHeight + "px")
        .style("left", "0px")
        .style("top", (scrollY)+ "px")
        .transition()
        .duration(300)
        .style("opacity", .75);
}

var histogramm_explanation_html = "<div id='histogram-text'>"
        + "{emphasis}<span class='percentage'>{percentage}%</span> of the countries have a bigger footprint than {country}."
        + "</div>";
var pie_explanation_html = "<div id='pie-text'>"
        + "<span class='percentage'>{percentage}%</span>  of its footprint is the demand on {land type}."
        + "</div>";

function DrawDougnut(div_infos, node)
{
    var svg = div_infos.select("#pie");
    var width = 460,
        height = 200,
        radius = Math.min(width, height) / 2;

    var metric = GetCountryData(node.properties.name);

    var landData = {
        "carbon": Number(metric.details.carbon),
        "fishing ground": Number(metric.details.fish_ground),
        "grazing land": Number(metric.details.grazing_land),
        "crop land": Number(metric.details.crop_land),
        "built-up land": Number(metric.details.built_land),
        "forest land": Number(metric.details.forest_land)
    };

    var items = Object.keys(landData).map(function(key) {
        return [key, landData[key]];
    });

    var sumOfAll = 0;
    Object.keys(landData).map(function(key) {
        return sumOfAll+=landData[key];
    });

    var aggregateValue = 0;
    var items = Object.keys(landData).map(function(key) {
        var part = (landData[key]/sumOfAll*100);
        if(part > 5)
            return [key, landData[key]];
        {
            aggregateValue+= landData[key];
        }
    });

    if(aggregateValue>0)
    {
        items.push(["others", aggregateValue]);
    }

    items = items.filter(function(n){ return n != undefined });

    items = items.sort(function(first, second) {
        return second[1] - first[1];
    });
        
    if(svg.empty())
    {
        div_infos.append("div")
            .attr("class", "info-sub-title")
            .html("Composition of footprint by resource type");
            
        svg = div_infos
            .append("svg")
            .attr("id", "pie")
            .attr("width", 460)
            .attr("height", 300)
            .attr("class", "pie")
            .append("g");

        svg.attr("transform", "translate(" + width / 2 + "," + height / 1.8 + ")");

        div_infos.append("div")
            .attr("class", "pie-explanation");
    }

    var maxLand = items[0];
    div_infos.selectAll("div")
        .filter(".pie-explanation")
        .html(pie_explanation_html
            .replace("{percentage}", 
                (maxLand[1]/sumOfAll*100).toFixed(0).toLocaleString("en"))
            .replace("{land type}", maxLand[0]));

    svg.append("g")
        .attr("class", "slices");
    svg.append("g")
        .attr("class", "labels");
    svg.append("g")
        .attr("class", "lines");

    var pie = d3.pie()
        .sort(null)
        .value(function(d) {
            return d.value;
        });

    var arc = d3.arc()
        .outerRadius(radius * 0.8)
        .innerRadius(radius * 0.4);

    var outerArc = d3.arc()
        .innerRadius(radius * 0.9)
        .outerRadius(radius * 0.9);


    var key = function(d){ return d.data.label; };


    function change() {

        var color = d3.scaleOrdinal()
        .domain(items.map((item) => {
            return item[0]
        }))
        .range(['#bf812d','#dfc27d','#f6e8c3','#c7eae5','#80cdc1','#35978f']);


        function getData (){
            var i = 0;
            return items.map(function(d){
                return { label: d[0], value: d[1] }
            });
        }

        var data = getData();

        var svg = d3.select("body")
            .selectAll("svg")
            .filter(".pie");
        
        var slice = svg.select(".slices").selectAll("path.slice")
            .data(pie(data), key);

        var colored = false;
        slice.enter()
            .insert("path")
            .style("fill", function(d) 
                { 
                    colored = true;
                    return color(d.data.label); 
                })
            .attr("class", "slice");

        svg.select(".slices")
            .selectAll("path.slice")
            .style("fill", function(d) 
            { 
                return color(d.data.label); 
            });

        slice		
            .transition().duration(1000)
            .attrTween("d", function(d) {
                this._current = this._current || d;
                var interpolate = d3.interpolate(this._current, d);
                this._current = interpolate(0);
                return function(t) {
                    return arc(interpolate(t));
                };
            })

        slice.exit()
            .remove();

        var text = svg.select(".labels").selectAll("text")
            .data(pie(data), key);

        text.enter()
            .append("text")
            .attr("dy", ".15em")
            .text(function(d) {
                return d.data.label;
            });
        
        function midAngle(d){
            return d.startAngle + (d.endAngle - d.startAngle)/2;
        }

        text.transition().duration(1000)
            .attrTween("transform", function(d) {
                this._current = this._current || d;
                var interpolate = d3.interpolate(this._current, d);
                this._current = interpolate(0);
                return function(t) {
                    var d2 = interpolate(t);
                    var pos = outerArc.centroid(d2);
                    pos[0] = radius * (midAngle(d2) < Math.PI ? 1 : -1);
                    return "translate("+ pos +")";
                };
            })
            .styleTween("text-anchor", function(d){
                this._current = this._current || d;
                var interpolate = d3.interpolate(this._current, d);
                this._current = interpolate(0);
                return function(t) {
                    var d2 = interpolate(t);
                    return midAngle(d2) < Math.PI ? "start":"end";
                };
            });

        text.exit()
            .remove();

        var polyline = svg.select(".lines").selectAll("polyline")
            .data(pie(data), key);
        
        polyline.enter()
            .append("polyline");

        polyline.transition().duration(1000)
            .attrTween("points", function(d){
                this._current = this._current || d;
                var interpolate = d3.interpolate(this._current, d);
                this._current = interpolate(0);
                return function(t) {
                    var d2 = interpolate(t);
                    var pos = outerArc.centroid(d2);
                    pos[0] = radius * 0.95 * (midAngle(d2) < Math.PI ? 1 : -1);
                    return [arc.centroid(d2), outerArc.centroid(d2), pos];
                };			
            });
        
        polyline.exit()
            .remove();
    }

    change();
    change();
}

function DrawHistogram(div_infos, node)
{
    var country_name = node.properties.name;   
    var value = GetCountryData(country_name);

    var svg = div_infos.select("#histogram");
    var currentFootprint = value.footprint;
    var data = country_metrics_data.map(function(d) {return d.EFConsPerCap;});
    var formatCount = d3.format(",.0f");

    var div_width = div_infos.node().getBoundingClientRect().width;
    var div_height = div_infos.node().getBoundingClientRect().height;
    
    var margin = {top: 10, right: 30, bottom: 40, left: 30},
        width = div_width - margin.left - margin.right,
        height = (250 - margin.top - margin.bottom);
        
    var x = d3.scaleLinear()
        .domain([0,13.5])
        .range([0, width]);

    if(svg.empty())
    {
        div_infos.append("div")
            .attr("class", "info-title")
            .html("Details of " + country_name);

        div_infos.append("div")
            .attr("class", "info-sub-title")
            .html("Distribution of the countries and their footprints");

        div_infos.append("div")
            .attr("class", "histogram-explanation");

        svg = div_infos
            .append("svg")
            .attr("id", "histogram");

        var g = svg.append("g");

        svg.style("width", div_width + "px")
            .style("height", height + margin.top + margin.bottom + "px")
            
        g.attr("transform", "translate(" + margin.left + ", 10)");
    
        var bins = d3.histogram()
            .domain([0, 13.5])
            .thresholds(d3.ticks(0, 13.5, 60))
                (data);
    
        var y = d3.scaleLinear()
            .domain([0, d3.max(bins, function(d) { return d.length; })])
            .range([height, 0]);
    
        var bar = g.selectAll(".bar")
            .data(bins)
            .enter().append("g")
                .attr("class", "bar")
                .attr("transform", function(d) { return "translate(" + x(d.x0) + "," + y(d.length) + ")"; })
                .attr("fill", function(d)
                {
                    var val = d.x0;
                    var max = 13.4;
                    var part = 13.4 / 8;
                    var color_index;
                    switch (true) {
                        case (val < (part)): color_index = 7; break;
                        case (val < (2*part)): color_index = 6; break;
                        case (val < (3*part)): color_index = 5; break;
                        case (val < (4*part)): color_index = 4; break;
                        case (val < (5*part)): color_index = 3; break;
                        case (val < (6*part)): color_index = 2; break;
                        case (val < (7*part)): color_index = 1; break;
                        default:
                            color_index = 0; break;
                    
                    }
                    return colors[color_index];
                })
                .style("opacity", .8);
    
        bar.append("rect")
            .attr("x", 1)
            .attr("width", x(bins[0].x1) - x(bins[0].x0) - 1)
            .attr("height", function(d) { return height - y(d.length); });
    
        g.append("g")
            .attr("class", "axis axis--x")
            .attr("transform", "translate(0," + height + ")")
            .style("font-size", 8)
            .style("stroke-opacity", .5)
            .style("opacity", .4)
            .call(d3.axisBottom(x));
    }

    var biggerPercentage = calcPercentage(country_metrics_data, currentFootprint);

    div_infos.selectAll("div")
        .filter(".histogram-explanation")
        .html(histogramm_explanation_html
            .replace("{percentage}", 
                biggerPercentage.toFixed(0).toLocaleString("en"))
            .replace("{country}", country_name)
            .replace("{emphasis}", biggerPercentage > 50 ? "":"Only "));
        
    div_infos.select("div")
        .filter(".info-title")
        .html("Details of " + country_name);

    svg.selectAll("g")
        .selectAll("line")
        .remove();

    // mark country
    svg.append("g")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")")
        .append("line")
        .attr("x1", x(currentFootprint)+2)
        .attr("y1", 0)
        .attr("x2", x(currentFootprint)+2)
        .attr("y2", height + 40)
        .attr("stroke-width", .5)
        .attr("stroke-dasharray",  [3, 2])
        .attr("stroke", "black");
}


function calcPercentage(data, fp)
{
    var numberOfCountries = data.length;
    var countiesWithSmallerFp = data.filter(function(d){
            return d.EFConsPerCap > fp;
    }).length;
    
    return countiesWithSmallerFp / numberOfCountries * 100;
}

var creditor_text = "{country} has a per capita footprint of<br/><span class='footprint'>{fp}</span> ha<br/>"+
                    "&nbsp;&nbsp;&nbsp;&nbsp;and a biocapacity of <br/>"+
                    "<span class='biocapacity'>{bc}</span> ha.<br/> "+
                    "The country is one of the worlds "+ 
                    "<span class='biocapacity-color'>creditors</span><br/>" +
                    "and builds more ressource than it "+
                    "uses."
                    
var debitor_text = "{country} has a per capita footprint of<br/><span class='footprint'>{fp}</span> ha<br/>" +
                    "&nbsp;&nbsp;&nbsp;&nbsp;and only a biocapacity of <br/><span class='biocapacity'>{bc}</span> ha.<br/> "+
                    "The country is one of the worlds "+ 
                    "<span class='footprint-color'>debtors</span><br/> and is using more resources than it "+
                    "can build."

var even_text = "{country} has a per capita footprint of <br/><span class='footprint'>{fp}</span> ha<br/>"+
                    "&nbsp;&nbsp;&nbsp;&nbsp;and a biocapacity of <br/>"+ 
                    "<span class='biocapacity'>{bc}</span> ha.<br/> "+
                    "Its use of ressources is "+ 
                    "in harmony with its build up."

var no_information_text = "This country has provided no information<br/>" +
                          " to the Global Footprint Network. <br/>" +
                          "<p/>Sorry."

var no_information_tooltip = "No information available";

function roundToOne(num) {    
    return +(Math.round(num + "e+1")  + "e-1");
}

function change_text(selectedCountry)
{
    var value = get_metric(selectedCountry);
    var text = "";
    console.log(value);
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
        country: metric_record.country,
        details: metric_record.details
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
    return d3.geoMercator()
        .scale(230)
        .translate([innerWidth/2, innerHeight/1.8]);
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

    AnnotateSource(svg, width - 200, innerHeight - 25);
}

function draw_timeline(data)
{
    timeline_metrics_data = data;
}

function show_worst_timeline()
{
    
    var svg = d3.select(timeline_div)
        .select("svg");
    
    // Remove annotations
    svg.selectAll("g > text").filter(".timeline-annotation")
        .transition()
        .duration(animation_time/2)
        .style("opacity", 0);

    svg.selectAll("path")
        .filter(".reference")
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
        .attr("class", "reference")
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
        .attr("class", "reference")
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
                label: "The footprint rises from 2.1 ha to 3.6 ha",
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
            subject: { radius: 20, radiusPadding: 3 },
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
            subject: { radius: 20, radiusPadding: 3 },
            dy: -50,
            dx: -130
        }, 
        {
            type: d3.annotationCalloutCircle,
            note: {
                label: "Constitutional crysis in fiji.",
                title: "2009"
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
        .filter(".reference")
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
        .attr("class", "reference")
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
        .attr("class", "reference")
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
            subject: { radius: 20, radiusPadding: 3 },
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
            subject: { radius: 20, radiusPadding: 3 },
            dy: -90,
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
            subject: { radius: 20, radiusPadding: 3 },
            dy: -40,
            dx: -20
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
                    right: 60,
                    bottom: 40,
                    left: 650
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
            .attr("transform", "translate(" + cover.left + ", "+cover.top+")")       
            .attr("width", width + cover.left + cover.right)
            .attr("height", height + cover.top + cover.bottom);
            x_timeline = d3.scaleTime()
            .domain([new Date(1959, 1, 1), new Date(2017, 1, 1)])
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
            .style("opacity", .3)
            .attr("stroke-opacity", 0.3)
            .select(".domain");
    
        svg.append("g")
            .attr("transform", "translate(" + width + ", 0)")
            .call(d3.axisRight(y_timeline))
            .style("opacity", .3)
            .attr("stroke-opacity", 0.3)
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
            .filter(".reference")
            .transition()
            .duration(animation_time/2)
            .attr("stroke-opacity", 0);

        RemoveTimelineAnnotations(timeline_div);
    }

    var svg = d3.select(timeline_div).select("svg");

    // Show biocapacity of world and country
    svg.append("path")
        .datum(world_biocap)
        .attr("class", "reference")
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
        .attr("class", "reference")
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

     // Show Annotations
     const annotations = [
        {
            type: d3.annotationCalloutCircle,
            note: {
                label: "In 1970 we already hit the break even of demand and supply",
                title: "1970"
            },
            data: { date: new Date(1970, 1, 1), value: 2.7 },            
            subject: { radius: 50, radiusPadding: 10 },
            dy: -100,
            dx: 50
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
        AnnotateSource(svg, width - 200 , height + 55);    
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

function RedrawOverview()
{
    bubbleGroups
        .selectAll("text")
        .remove();

     var allCircles = d3.select(bubble_chart_div)
                        .select("svg")
                        .selectAll("circle")
                         .filter(function(d) 
                         { 
                             return d != undefined;
                         })
                         .data(country_metrics_data, key_func);
 
     var transitions = 0;
     allCircles.transition()
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

function draw_overview_bubble(data)
{
    country_metrics_data = data;

    if(isOverviewDrawn) 
    {
        RedrawOverview();
        return;
    };

    isOverviewDrawn = true;

    var div_rect = d3.select(bubble_chart_div).node().getBoundingClientRect();

    var cover = {
                    top: 20,
                    right: 60,
                    bottom: 35,
                    left: 300
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
        .attr("transform", "translate(" + cover.left + ", "+cover.top+")")
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
        .attr("transform", "translate("+ (width) +", 0)")
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
                    div.html("<table>"
                        + "<tr><td colspan=2><b>"+ d["Country Name"] 
                                +"</b></td></tr>"
                        + "<tr><td>HDI: </td><td>" + Number(d.HDI).toFixed(2).toLocaleString("en") + "</td></tr>"
                        + "<tr><td>Footprint: </td><td>" + Number(d.EFConsPerCap).toFixed(2).toLocaleString("en") 
                                + " ha (pc)</td></tr>"
                        + "<tr><td>People: </td><td>" + Number(d.Population).toLocaleString("en") 
                                + "</td></tr>"
                        + "<tr><td>Impact: </td><td>" + Number((Number(+d.Population * d.EFConsPerCap)/1000000).toFixed(2)).toLocaleString('en') 
                                + " M ha</td></tr>"
                        +"</table>"
                    )	
                    .style("left", (d3.event.pageX + 10) + "px")		
                    .style("top", (d3.event.pageY - 10) + "px")
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
        .duration(1000)
        .style("opacity", 0.3)
        .on("end", function() 
            {
                svg.append("text")
                    .attr("class", "annotation-text")
                    .text("High human development")
                    .attr("x", x_scale(0.79))
                    .attr("y", y_scale(10.44))
                    .style("opacity", 0)
                    .transition() 
                    .duration(2000)
                    .style("opacity", 0.8);
            });
    // ... with range marker
    svg.append("line")
        .attr("class", "high-development-border-line")
        .style("stroke-opacity", 0)
        .attr("x1", x_scale(0.705))
        .attr("y1", y_scale(10.5))
        .attr("x2", x_scale(0.78))
        .attr("y2",  y_scale(10.5))
        .transition() 
        .duration(3000)
        .style("stroke-opacity", 0.7)
    svg.append("line")
        .attr("class", "high-development-border-line")
        .style("stroke-opacity", 0)
        .attr("x1", x_scale(0.92))
        .attr("y1", y_scale(10.5))
        .attr("x2", x_scale(0.995))
        .attr("y2",  y_scale(10.5))
        .transition() 
        .duration(3000)
        .style("stroke-opacity", 0.7)
    svg.append("line")
        .attr("class", "high-development-border-limit")
        .style("stroke-opacity", 0)
        .attr("x1", x_scale(0.702))
        .attr("y1", y_scale(10.6))
        .attr("x2", x_scale(0.702))
        .attr("y2",  y_scale(10.4))
        .transition() 
        .duration(3000)
        .style("stroke-opacity", 0.7)

    svg.append("line")
        .attr("class", "high-development-border-limit")
        .style("stroke-opacity", 0)
        .attr("x1", x_scale(0.998))
        .attr("y1", y_scale(10.6))
        .attr("x2", x_scale(0.998))
        .attr("y2",  y_scale(10.4))
        .transition() 
        .duration(3000)
        .style("stroke-opacity", 0.7)
    

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
        .text("Human Development Index")                    
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
        .attr("transform", "translate(590, 60)")
        .style("opacity", 0);

    var biggest = 100000000;
    var medium = 10000000;

    legendGroup
        .append("text")
            .attr("class", "legend-title")
            .text("Population")                
            .attr("x", 10)
            .attr("y", 115);
    
    legendGroup
        .append("circle")
        .attr("cx", 30)
        .attr("cy", 140)
        .attr("r", r_scale(Math.sqrt(biggest)))
        .style("fill", "transparent")
        .style("stroke", "lightslategray")
        .style("opacity", .6);

    legendGroup
        .append("text")
        .attr("class", "legend-text")
        .text(Number(biggest/1000000).toLocaleString("en") + "M")
        .attr("x", 50)
        .attr("y", 145);
        
    legendGroup
        .append("circle")
        .attr("cx", 90)
        .attr("cy", 140)
        .attr("r", r_scale(Math.sqrt(medium)))
        .style("fill", "transparent")
        .style("stroke", "lightslategray")
        .style("opacity", .6);

    legendGroup
        .append("text")
        .attr("class", "legend-text")
        .text(Number(medium/1000000).toLocaleString("en") + "M")
        .attr("x", 100)
        .attr("y", 145);
        
    // Impact size
    var biggestImpact = 5000000000;
    var medianImpact = 50000000;
    var smallestImpact = 500000;

    var sizes = [100000, 500000, 5000000, 50000000, 500000000, 5000000000];

    var legendImpactGroup = svg
        .append("g")
        .attr("transform", "translate(600, 120)")
        .style("opacity", 0);;

    legendImpactGroup
        .append("text")
            .attr("class", "legend-title")
            .text("Impact (Footprint x People)")    
            .attr("x", 0)            
            .attr("y", 0);

    var legend_width = 0;
    legendImpactGroup
        .selectAll("rect")
        .data(sizes)
        .enter()
        .append("rect")
        .style("fill", function(d) {
            return colors[Math.round(colorScale(d))];
        })
        .attr("width", 30)
        .attr("height", 10)
        .attr("x", function(d,i) 
        {
            var current_x = legend_width;
            legend_width += 30; 
            return current_x; 
        })
        .attr("y", 10)
        .attr("opacity", .7);

    legendImpactGroup
        .append("text")
        .attr("class", "legend-text")
        .text(Number(sizes[0]/1000000).toLocaleString("en") + " M ha")
        .attr("x", -2)
        .attr("y", 30);

    legendImpactGroup
        .append("text")
        .attr("class", "legend-text")
        .text(Number(sizes[sizes.length-1]/1000000000).toLocaleString("en") + " B ha")
        .attr("x",  legend_width - 15)
        .attr("y", 30);

    legendGroup
        .transition()
        .duration(animation_time*3)
        .style("opacity", 1);

    legendImpactGroup
        .transition()
        .duration(animation_time*3)
        .style("opacity", 1);

    AnnotateSource(svg, width - 200, innerHeight - 40)
}


var lastScrollValue = 0;
function intialize_graph_scroll()
{   
    var margin = 30,
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
                .attr("height", height + margin)
                .append('g')
                .attr('class', 'map');

    // Container Bubble
    var svg2 = d3.select('.container-bubble #graph').html('')
    .append('svg')
        .attrs({width: innerWidth - margin, height: height})

    var gs2 = d3.graphScroll()
        .container(d3.select('.container-bubble'))
        .graph(d3.selectAll('.container-bubble #graph'))
        .eventId('uniqueId1')
        .sections(d3.selectAll('.container-bubble #sections > div'))
        .on('active', function(i){
            console.log("active: " + i);
            switch(i)
            {
                case 3:
                    start_overview();
                    break;
                case 5:
                    start_best();
                    break;
                case 7:
                    start_worst();
                    break;
            }
            lastScrollValue = i;
        })
  
    // Container Timeline
    var svg3 = d3.select('.container-timeline #graph').html('')
    .append('svg')
        .attrs({width: width, height: height-30})

    var gs3 = d3.graphScroll()
        .container(d3.select('.container-timeline'))
        .graph(d3.selectAll('.container-timeline #graph'))
        .eventId('uniqueId1')
        .sections(d3.selectAll('.container-timeline #sections > div'))
        .on('active', function(i){
            console.log("active timeline: " + i);
            switch(i)
            {
                case 2:
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
            console.log("closing: " + i );
            switch(i)
            {                
                case 1:
                    show_closing();
                    break
            }
        })
          
}




function draw_map(data)
{
    geo_data = data;
    
    var margin = 30,
        width = innerWidth -margin,
        height = innerHeight -margin;

    intialize_graph_scroll();

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

    AnnotateSource(svg_worldmap, width -200, innerHeight - 25);
}

function AnnotateSource(svg, left, top)
{
    svg
        .append("text")
        .text("Source: http://www.footprintnetwork.org")
        .attr("class", "source-citation")
        .attr("transform", "translate("+ left +","+ top +")")
}

var choroplethShown = false;

function scrollVertical(e){
    if (!choroplethShown && (window.innerHeight + window.pageYOffset) >= document.body.offsetHeight) {
        //alert("you're at the bottom of the page");        
        show_choropleth();
        choroplethShown = true;
    }

    if(pageYOffset > 700) return;

    var scrollingValue = 100 - (window.pageYOffset/6);
    if(!isFadingOut)
    {
        fadeOutMap(scrollingValue);
    }

}

var isFadingOut = false;
function fadeOutMap(alpha)
{
    if(alpha < 0)
    {
        alpha = 0;
    }

    svg_worldmap.selectAll("path")
        .style("opacity", alpha/100);
    
    svg_worldmap.selectAll("text")
        .style("opacity", alpha/100);
}

window.onscroll=scrollVertical

render();

d3.select(window).on('resize', render)