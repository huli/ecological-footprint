 

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
            });


}


function draw_map(geo_data)
{
    var svg = d3.select("#graph-introduction")
                .append("svg")
                .attr("width", "100%")
                .attr("height", "100%")
                .append('g')
                .attr('class', 'map');

    var projection = d3.geoMercator()
                    .scale(220)
                    .translate([900 / 2.5, 700 / 3]);

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