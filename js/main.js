function reloadGraph() {

    var token = document.cookie.split("SEC=").pop().split(";").shift();
    var offence_limit = 100;

    var xhr = d3.xhr('/api/siem/offenses?limit=' + offence_limit, 'application/json')
        .header('Accept', 'application/json')
        .header('SEC', token)
        .header('Version', '2.0')
        .header('Allow-Experimental', 'true')
        .header('Allow-Provisional', 'true');

    xhr.get(
        function (error, response) {
            if (response) {
                var offenses = JSON.parse(response.responseText);

                var offensesIpsData = {};
                offenses.forEach(function(offense, key) {
                    offensesIpsData[offense.offense_source] = offense;
                });

                var destination_ip = '176.205.122.250';

                destination = {};
                arcsArr = [];
                bubblesArr = [];

                d3.json('https://freegeoip.net/json/' + destination_ip,
                    function (error, data) {
                        if (typeof data !== 'undefined') {
                            var bubble = {
                                latitude: data.latitude,
                                longitude: data.longitude,
                                bubblesRadius: 6,
                                borderWidth: 0,
                                fillKey: 10
                            }
                            bubblesArr.push(bubble);
                            map.bubbles(bubblesArr);

                            destination['latitude'] = data.latitude;
                            destination['longitude'] = data.longitude;
                        }
                    }
                );

                var i = 0;
                loadEvent(i, offenses, offensesIpsData);
            }
        }
    );
}

function loadEvent(i, offenses, offensesIpsData) {
    var ipArr = [];

    //if (i <= offenses.length) {

        while (i < offenses.length) {
            var ip = offenses[i].offense_source;

            if (!inArray(ip, ipArr)) {
                ipArr.push(ip);
                if (ip.match(/\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/)) {
                    d3.json('https://freegeoip.net/json/' + ip,
                        function (error, data) {
                            if (typeof data !== 'undefined') {
                                if (offensesIpsData[ip].severity > 0) {
                                    var bubble = {
                                        latitude: data.latitude,
                                        longitude: data.longitude,
                                        bubblesRadius: offensesIpsData[ip].event_count / 10,
                                        borderWidth: 0,
                                        fillKey: offensesIpsData[ip].severity,
                                        level: offensesIpsData[ip].severity
                                    }
                                    bubblesArr.push(bubble);
                                    map.bubbles(bubblesArr, {
                                        popupTemplate: function (geo, data) {
                                            return generatePopupTemplate(offensesIpsData[ip]);
                                        }
                                    });

                                    var arcs = {
                                        origin: {
                                            latitude: data.latitude,
                                            longitude: data.longitude
                                        },
                                        destination: destination,
                                        options: {
                                            strokeColor: offensesIpsData[ip].severity,
                                            level: offensesIpsData[ip].severity
                                        }
                                    };
                                    arcsArr.push(arcs);

                                    map.arc(arcsArr);
                                }
                            }
                            else {
                                console.log(data);
                            }
                        }
                    );
                }
            }
            i ++;
            if (i == offenses.length) {
                setTimeout(function() {
                    reloadGraph();
                }, 60000);
            }
            if (i % 10 == 0) {
                setTimeout(function() {
                    loadEvent(i, offenses, offensesIpsData);
                }, 3000);
                break;
            }
        }
    //}



}

/**
 *
 * @param data
 * @param array
 * @returns {boolean}
 */
function inArray(data, array) {
    for (var i = 0; i < array.length; i++) {
        if (data == array[i]) {
            return true;
        }
    }
    return false;
}

function generatePopupTemplate(data) {
    var link = '/console/do/sem/offensesummary?summaryId=' + data.id + '&appName=SEM&pageId=OffenseSummary';
    var html = '<div id="tooltip_container" >' +
        '<div class="inner">'+
        '<a class="close_tooltip_button" href="javascript:void(0)">×</a>' +
        '<div class="tooltip_content">' +
        '<h2>Offense <a href="' + link + '" target="_blank">' + data.id + '</a> - ' + data.description + '</h2>' +
        '<table><tbody>' +
        '<tr>' +
        '<td>Magnitude:</td>' +
        '<td>' + data.magnitude + '</td>' +
        '</tr><tr>' +
        '<td>Credibility:</td>' +
        '<td>' + data.credibility + '</td>' +
        '</tr><tr>' +
        '<td>Severity:</td>' +
        '<td>' + data.severity + '</td>' +
        '</tr><tr>' +
        '<td>Relevance:</td>' +
        '<td>' + data.relevance + '</td>' +
        '</tr>' +
        '</tbody></table>' +
        '</div></div>' +
        '<div class="tail_container"><div class="tail"></div></div></div>';

    return html;
}

function updater() {
    setTimeout(function() {
        reloadGraph();
        updater();
    }, 300000);
}