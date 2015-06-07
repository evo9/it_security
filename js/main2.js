function getValue(offense, attribute) {
    if (attribute == "category_count")
        return offense.security_category_count + offense.policy_category_count;
    else if (attribute == "destination_count")
        return offense.local_destination_count + offense.remote_destination_count;
    else if (attribute == "start_time" || attribute == "last_updated_time")
        return offense[attribute];
    else
        return offense[attribute];
}

function mapInit() {
    map = new Datamap({
        element: document.getElementById("map2")
    });


    var width = 1000,
        height = 500,
        centered;

    var svg = d3.select("#map").append("svg")
        .attr("width", width)
        .attr("height", height);

    d3.select('#map').append('div').attr('class', 'data_hover_block');

    var projection = d3.geo.mercator()
        .center([0, 50])
        .scale(150)
        .rotate([0, 0, 0]);

    path = d3.geo.path()
        .projection(projection);

    g = svg.append("g");

    var worldGroup = g.append('g');

    d3.json("data_json/world_new.json", function (error, topology) {
        // draw world
        worldGroup.append("g")
            .attr("id", "world")
            .selectAll("path")
            .data(topojson.feature(topology, topology.objects.world).features)
            .enter().append("path")
            .attr("d", path)
            .attr("class", "datamaps_countries");

        /*worldGroup.append("path")
            .datum(topojson.mesh(topology, topology.objects.world, function (a, b) {
                return a !== b;
            }))
            .attr("id", "country-borders")
            .attr("d", path);*/

        reloadGraph(projection);

        // zoom and pan
        var zoom = d3.behavior.zoom()
            .on("zoom", function () {
                g.attr("transform", "translate(" +
                d3.event.translate.join(",") + ")scale(" + d3.event.scale + ")");
                g.selectAll("circle")
                    .attr("d", path.projection(projection));
                g.selectAll("path")
                    .attr("d", path.projection(projection));
            });

        svg.call(zoom);

    });


    /*svg.selectAll('.datamaps_countries')
     .on('mouseover', function() {
     var $this = d3.select(this);
     $this.style('fill', '#ff0000');
     })
     .on('mouseout', function() {

     });*/


}

function reloadGraph(projection) {

    var token = document.cookie.split("SEC=").pop().split(";").shift();
    var offence_limit = 50;

    var xhr = d3.xhr('/api/siem/offenses?limit=' + offence_limit, 'application/json')
        .header('Accept', 'application/json')
        .header('SEC', token)
        .header('Version', '2.0')
        .header('Allow-Experimental', 'true')
        .header('Allow-Provisional', 'true');

    xhr.get(
        function (error, response) {
            var offenses = JSON.parse(response.responseText);

            points = [];
            var ipArr = [];
            var destination_ip = '176.205.122.250';
            ipArr.push(destination_ip);

            d3.json('https://freegeoip.net/json/' + destination_ip,
                function (error, data) {
                    if (typeof data !== 'undefined') {
                        pointsSata.push(data);
                        addPointToMap(projection, points);
                        addPath(points);
                    }
                }
            );

            offenses.forEach(function(offence, key) {
                var ip = offence.offense_source;

                if (!inArray(ip, ipArr)) {
                    ipArr.push(ip);

                    if( ip.match(/\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/) ) {
                        d3.json('https://freegeoip.net/json/' + ip,
                            function (error,data) {
                                if (typeof data !== 'undefined') {
                                    points.push(data);
                                    addPointToMap(projection, points);
                                    addPath(points);
                                }
                            }
                        );
                    }
                }
            });
        }
    );
}

function inArray(data, array) {
    for (var i = 0; i < array.length; i++) {
        if (data == array[i]) {
            return true;
        }
    }
    return false;
}

function addPointToMap(projection, data) {
    g.append('g').selectAll("circle")
        .data(data)
        .enter()
        .append("circle")
        .attr("cx", function (d) {
            return projection([d.longitude, d.latitude])[0];
        })
        .attr("cy", function (d) {
            return projection([d.longitude, d.latitude])[1];
        })
        .attr("r", 5)
        .style("fill", "red");
}

function addPath(data) {
    var lineTransition = function lineTransition(path) {
        path.transition()
            //NOTE: Change this number (in ms) to make lines draw faster or slower
            .duration(5500)
            .attrTween("stroke-dasharray", tweenDash)
            .each("end", function (d, i) {
                //Uncomment following line to re-transition
                d3.select(this).call(lineTransition);

                //We might want to do stuff when the line reaches the target,
                //  like start the pulsating or add a new point or tell the
                //  NSA to listen to this guy's phone calls
                //doStuffWhenLineFinishes(d,i);
            });
    };
    var tweenDash = function tweenDash() {
        var len = this.getTotalLength(),
            interpolate = d3.interpolateString("0," + len, len + "," + len);

        return function (t) {
            return interpolate(t);
        };
    };

    var links = [];
    for (var i = 0, len = data.length - 1; i < len; i++) {
        // (note: loop until length - 1 since we're getting the next
        //  item with i+1)
        links.push({
            type: "LineString",
            coordinates: [
                [data[i].longitude, data[i].latitude],
                [54, 24]
            ]
        });
    }

    var arcGroup = g.append('g');

    // Standard enter / update
    var pathArcs = arcGroup.selectAll(".arc")
        .data(links);

    //enter
    pathArcs.enter()
        .append("path").attr({
            'class': 'arc'
        }).style({
            fill: 'none'
        });

    //update
    pathArcs.attr({
        d: path
    })
        .style({
            stroke: '#0000ff',
            'stroke-width': '1px'
        })
        .call(lineTransition);

    //exit
    pathArcs.exit().remove();
}