try {
    importScripts('lib.js');
    importScripts(location.search.substring(1));
}
catch(reason) {
    console.log("Worker failed: " + reason);
}

var data;

onmessage = function(event) {

    if(event.data.hasOwnProperty('data'))
	data = event.data.data;

    if(event.data.hasOwnProperty('config')) {
	const config = event.data.config;

	if(name == 'day') postMessage(computeDayDurations(data, config.dayPace, config.filter));
	else if(name == 'headlines') postMessage(computeHeadlinesDurations(data, config.filter));
	else if(name == 'calendar') postMessage(computeCalendarDurations(data, config.filter));
    }
}
