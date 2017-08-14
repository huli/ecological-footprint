 

"use strict";


var bubble_opacity = .7;
var bubble_chart_div = "#graph-bubble-chart";

var country_metrics_data;
var y_scale;
var r_scale;


// Rendering of page
var oldWidth = 0;
function render(){
    if (oldWidth == innerWidth) return
    oldWidth = innerWidth;

    d3.graphScroll()
        .sections(d3.selectAll('#sections > div'))
        .on('active', function(i)
            { 
                console.log(i + 'th section active') ;
                switch(i)
                {
                    case 3:
                        start_overview();
                        break;
                    case 4:
                        fix_bubble();
                        break;
                    case 7:
                        start_best();
                        break;
                    case 10:
                        start_worst();
                    default:
                }
            });
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

    //var index = filtered_circles.length;

    filtered_circles.transition()
        .delay(function(d,i){ return 10 * (i)})
        .duration(1000) 
        .ease(d3.easePolyInOut)
        .attr("cy", function(d){
            return y_scale(d.EFConsPerCap);
        })
        .style("opacity", bubble_opacity)
        .attr("r", function(d){
            return r_scale(Math.sqrt(d.Population));
        })
        .on("end", function() {

       //     // show the worsts bubbles. resp. hide others
       //     var filtered = get_all_but_worst();

       //     hide_bubbles(filtered);
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

function fix_bubble()
{
    var div_top = d3.select(bubble_chart_div).node().getBoundingClientRect();
    
    d3.select(bubble_chart_div)
        .style("top", div_top.top + "px")        
        .style("left", div_top.left + "px")
        .style("position", "fixed");

    hideOthers(bubble_chart_div);
}

function start_overview()
{
    d3.csv('country_metrics.csv', draw_overview_bubble)
}

function draw_overview_bubble(data)
{
    country_metrics_data = data;

    var div_rect = d3.select(bubble_chart_div).node().getBoundingClientRect();

    var cover = {
                    top: 20,
                    right: 20,
                    bottom: 20,
                    left: 40
                },
                width = div_rect.width - cover.left - cover.right,
                height = div_rect.height - cover.top - cover.bottom;

    var div = d3.select("body").append("div")	
        .attr("class", "tooltip")				
        .style("opacity", 0);


    d3.select(bubble_chart_div)
            .select("svg")
            .remove();

    var svg = d3.select(bubble_chart_div)
        .append("svg")
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
}


function hideOthers(nottohide)
{
    
}


function draw_map(geo_data)
{
    var margin = 75,
            width = 1920 -margin,
            height = 800 -margin;
            
    var svg = d3.select("#graph-introduction")
                .append("svg")
                .attr("width", width + margin)
                .attr("height", height + margin)
                .append('g')
                .attr('class', 'map');


    var projection = d3.geoMercator()
                    .scale(220)
                    .translate([width / 2.5, height / 2]);

    var path = d3.geoPath().projection(projection);

    var map = svg.selectAll('path')
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