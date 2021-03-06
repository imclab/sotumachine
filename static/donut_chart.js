$(function (){
// EVENT DISPATCHER

window.dispatch = d3.dispatch("load", "generated", "highlight", "unhighlight");

// DONUT CHART

var presidents = {
  "01": {"name": "George Washington"},
  "03": {"name": "Thomas Jefferson"},
  "40": {"name": "Ronald Reagan"},
  "41": {"name": "George Bush"},
  "42": {"name": "William J. Clinton"},
  "43": {"name": "George W. Bush"},
  "44": {"name": "Barack Obama"},
  "16": {"name": "Abraham Lincoln"},
  "26": {"name": "Theodore Roosevelt"}
};

var tooltip = d3.select("body").append("div")
    .attr("class", "tooltip")
    .style("opacity", 0);

var testvar;

var parseIdWeightString = function(idWeightString){
    var parsedIdWeights = [];
    _.each( _.range(0, idWeightString.length, 3), function(e,i,ls){
                                                    parsedIdWeights.push({
                                                        'id': idWeightString.substring(e,e+2),
                                                        'weight': idWeightString.substring(e+2,e+3)
                                                    });});
    parsedIdWeights.forEach(function(d) {
              d.id = d.id;
              d.weight = +d.weight;
              d.name = presidents[d.id]['name'];
              // for reference in annotations, tooltips, etc
              presidents[d.id]['weight'] = +d.weight;
            });
    return parsedIdWeights;
};

var testIWS = '412433441264164423012403031';

var chartDiv = d3.select('#sotu-chart');

var width = parseInt(chartDiv.style("width")),
    height = parseInt(chartDiv.style("height")),
    radius = Math.min(width, height) / 2,
    pieInnerRadius = radius - 30,
    pieOuterRadius = radius - 10,
    pictureRadius = radius - 40;

var color_classes = [];
_.each( _.keys(presidents),
       function(e, i, ls) {
         color_classes.push('q' + i + '-' + _.keys(presidents).length);
            });

var color = d3.scale.ordinal()
        .range(color_classes)
        .domain(_.keys(presidents));

var arc = d3.svg.arc()
        .outerRadius(pieInnerRadius)
            .innerRadius(pieOuterRadius);

var pie = d3.layout.pie()
        //.sort(function(a, b){ return b.weight - a.weight;})
        .sort(function(a,b){ return d3.ascending(a.id, b.id);})
            .value(function(d) { return d.weight; });

var svg = d3.select("#sotu-chart").append("svg")
            .attr("width", width)
            .attr("height", height);

var defs = svg.append("defs");

var clipPath = svg.append("clipPath")
       .attr("id", "clipCircle")
       .append("circle")
       .attr("r", pictureRadius)
       .attr("cx", 60)
       .attr("cy", 60);

var prezPicture = svg.append("g")
            .attr("transform", "translate(" + ((width / 2) - pictureRadius) + "," + ((height / 2) - pictureRadius) + ")")
            .append("image")
            .attr("width", function(){ return pictureRadius * 2;})
            .attr("height", function(){ return pictureRadius * 2;})
            .attr("clip-path", "url(#clipCircle)");

var updatePicture = function(id) {
  var ext = (id == null) ? "png" : "jpg";
  prezPicture.attr("xlink:href", "/static/"+id+"." + ext);
};

function key(d) {
  return d.data.id;
}

function type(d) {
  d.weight = +d.weight;
  return d;
}

function findNeighborArc(i, data0, data1, key) {
  var d;
  return (d = findPreceding(i, data0, data1, key)) ? {startAngle: d.endAngle, endAngle: d.endAngle}
      : (d = findFollowing(i, data0, data1, key)) ? {startAngle: d.startAngle, endAngle: d.startAngle}
      : null;
}

// Find the element in data0 that joins the highest preceding element in data1.
function findPreceding(i, data0, data1, key) {
  var m = data0.length;
  while (--i >= 0) {
    var k = key(data1[i]);
    for (var j = 0; j < m; ++j) {
      if (key(data0[j]) === k) return data0[j];
    }
  }
}

// Find the element in data0 that joins the lowest following element in data1.
function findFollowing(i, data0, data1, key) {
  var n = data1.length, m = data0.length;
  while (++i < n) {
    var k = key(data1[i]);
    for (var j = 0; j < m; ++j) {
      if (key(data0[j]) === k) return data0[j];
    }
  }
}

function arcTween(d) {
  var i = d3.interpolate(this._current, d);
  this._current = i(0);
  return function(t) { return arc(i(t)); };
}

var donutChart = svg.append("g")
            .classed("prezColors", true)
            .attr("transform", "translate(" + width / 2 + "," + height / 2 + ")");

var path = donutChart.selectAll("path");

var firstPrezID;

var sentenceHighlighting = function() {
    d3.selectAll('.sentence')
            .on('mouseover', function(d) {
                var prez_id = String(d3.select(this).attr('data-prez-id'));
                dispatch.highlight(prez_id);
            })
            .on('mouseout', function(d) {
                var prez_id = String(d3.select(this).attr('data-prez-id'));
                dispatch.unhighlight(prez_id);
            });
};

dispatch.on("generated", function (id_weight_string) {
    console.log('called dispatch.generated')
    new_data = parseIdWeightString(id_weight_string);

    sentenceHighlighting();

    testvar = new_data;

    firstPrezID = d3.select('.the-speech p:first-of-type span:first-of-type').attr('data-prez-id');

    weight_total = d3.sum(new_data, function(d){ return d.weight; });

    updatePicture(firstPrezID);

    var data0 = path.data(),
        data1 = pie(new_data);

    path = path.data(data1, key);

    path.enter().append("path")
        .each(function(d, i) { this._current = findNeighborArc(i, data0, data1, key) || d; })
        .attr("class", function(d){ return color(d.data.id);})
        .attr("id", function(d){ return "slice-"+d.data.id; })
      //.append("title")
        //.text(function(d) { return d.data.id; })
        .on("mouseover", function(d) {
            dispatch.highlight(d.data.id);
        })
        .on("mouseout", function(d) {
            dispatch.unhighlight(d.data.id);
        });

    path.exit()
        .datum(function(d, i) { return findNeighborArc(i, data1, data0, key) || d; })
      .transition()
        .duration(750)
        .attrTween("d", arcTween)
        .remove();

    // TODO: Try to implement the weird unfurl thing on the first load
    path.transition()
        .duration(750)
        .attrTween("d", arcTween);

});

dispatch.on("highlight", function(prez_id) {
    // Make tooltip visible, put info into it and have it follow the cursor
    tooltip.transition()
           .duration(200)
           .style("opacity", .9);

    tooltip.html(  '<strong>'+ presidents[prez_id]['name']+'</strong>' + ":" +
                   '<br>' +
                   d3.round((presidents[prez_id]['weight']/weight_total) * 100) + "%")
                .style("left", (d3.event.pageX) +7 + "px")
                .style("top", (d3.event.pageY) + "px");

    // TODO: Change center picture to one of that prez

    updatePicture(prez_id);

    // TODO: Color-highlight spans with text from that prez

    c = color(prez_id);

    d3.selectAll('.sentence')
            .classed(c, function() {
                pid = String(d3.select(this).attr("data-prez-id"));
                if (pid == prez_id) {
                    return true;
                } else {
                    return false;
                }});

    // TODO: Grow pie slice

    donutChart.append('use')
        .style('pointer-events', 'none')
        .attr('xlink:href','#slice-'+prez_id)
        .attr('transform', 'scale(0.85)');

    donutChart.append('use')
        .style('pointer-events', 'none')
        .attr('xlink:href','#slice-'+prez_id)
        .attr('transform', 'scale(1.10)');

});

dispatch.on("unhighlight", function(prez_id) {
    // Make tooltip invisible
    tooltip.transition()
        .duration(500)
        .style("opacity", 0);

    // TODO: Change center picture back to firstPrez

    updatePicture(firstPrezID);

    // TODO: Remove color-highlight from spans with text from that prez

    c = color(prez_id);

    d3.selectAll('.sentence')
            .classed(c, false);

    // TODO: Grow pie slice

    donutChart.selectAll('use').remove();
    //d3.selectAll('path[data-slice="'+prez_id+'"]')
    //    .attr('transform', 'scale(1)');

});


dispatch.generated(testIWS);

});
