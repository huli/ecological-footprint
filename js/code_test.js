 

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
                switch(i)
                {
                    case 4:
                        fix_bubble();
                        break;
                    case 7:
                        unfix_bubble();
                   
                    default:
                }
            });
}


d3.select(bubble_chart_div)
    .style("background", "black")

function fix_bubble()
{
    var div_top = d3.select(bubble_chart_div).node().getBoundingClientRect();
    
    d3.select(bubble_chart_div)
        .style("top", div_top.top + "px")        
        .style("left", div_top.left + "px")
        .style("position", "fixed");

}

function unfix_bubble()
{
    var div_top = d3.select(bubble_chart_div).node().getBoundingClientRect();

    d3.select(bubble_chart_div)    
        //.style("top", div_top.top +  "px")
        //.style("top", (window.pageYOffset) +  "px")
        //.style("top", (div_top) +  "px")
        .style("top", (pageYOffset + div_top.top) +  "px")
        .style("position", "absolute");

}

render();

d3.select(window).on('resize', render)