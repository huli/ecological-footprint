 

"use strict";

var bubble_chart_div = "#graph-bubble-chart";

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
                if(i == 3)
                {
                    start_overview();
                }
                if(i == 4)
                {
                    fix_bubble();
                }
            });
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
    var div = d3.select("body").append("div")	
        .attr("class", "tooltip")				
        .style("opacity", 0);

    var div_rect = d3.select(bubble_chart_div).node().getBoundingClientRect();

    var svg = d3.select(bubble_chart_div)
        .append("svg")
        .attr("width", div_rect.width)
        .attr("height", div_rect.height);

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
                .range([0, div_rect.width])
                .domain([0, 1.0]);

    var xAxis = d3.axisBottom()
        .scale(xScale)
        .ticks(5);

    svg.append("g")
        .attr("class", "x axis")
        .attr("transform", "translate(0, "+div_rect.height+")")
        .call(xAxis);

    // display y-axis
    var yScale = d3.scaleLinear()
                    .range([div_rect.height, 0])
                    .domain([0, 15]);
    var yAxis = d3.axisLeft()
                    .scale(yScale)
                    .ticks(5);
    
    svg.append("g")
        .attr("class", "y axis")
        .call(yAxis);

    // create scale for radius/population
    var rScale = d3.scaleLinear()
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
            return yScale(0);
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
            return yScale(d.EFConsPerCap);
        })
        .attr("r", function(d){
            return rScale(Math.sqrt(d.Population));
        })
        .style("opacity", .7);

    // draw hight development line 
    svg.append("line")
        .attr("class", "high-development-border")
        .attr("x1", xScale(0.7))
        .attr("y1", div_rect.height)
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
        .attr("y1", yScale(1.74))
        .attr("x2", div_rect.width)
        .attr("y2", yScale(1.74))
        .transition() 
        .duration(2000)
        .style("opacity", 0.3)        
        .on("end", function() 
            {
                svg.append("text")
                    .attr("class", "annotation-text")
                    .text("World Biocapacity per Person (1.7 hectares)")
                    .attr("x", 100)
                    .attr("y", yScale(1.74) -5)
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