 

"use strict";

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
                if(i == 4)
                {
                    fixBubble();
                }
            });
}

function fixBubble()
{
    var div_element = "#graph-bubble-chart";
    var div_top = d3.select(div_element).node().getBoundingClientRect();
    
    d3.select(div_element)
        .style("top", div_top.top + "px")        
        .style("left", div_top.left + "px")
        .style("position", "fixed");

    hideOthers(div_element);
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
                    .style('fill',"lightblue")
                    .style('stroke', "white")
                    .style('stroke-width',"0.3");
}


render();

d3.select(window).on('resize', render)