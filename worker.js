importScripts('lib.js');
importScripts('https://cdnjs.cloudflare.com/ajax/libs/moment.js/2.24.0/moment-with-locales.js');

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
