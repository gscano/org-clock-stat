function flattenHeadlines(tasks, result = {desc: [], data: []}) {
    return tasks.reduce(flattenHeadline, result);
}

function flattenHeadline({desc, data}, task) {

    desc.push({ id: task.id,
		parent: task.parentId,
		depth: task.depth,
		children: [],
		name: task.name,
		tags: task.hasOwnProperty('tags') ? task.tags : new Set(),
		effort: task.effort,
		ishabit: task.ishabit });

    data.push({ parent: task.parentId,
		entries: task.entries });

    return task.subentries.reduce(flattenHeadline, {desc, data});
}

// Date => Date => Date => String[year month week isoWeek day] => ({start:Date, end:Date} => [{start:Date, end:Date}])
function createSplittingFilter(from, to, specific = null, moment_ = 'date') {
    from = moment(from);
    to = moment(to);
    specific = specific == null ? null : moment(specific);

    if(to.hours() == 0 && to.minutes() == 0) to.add(1, 'days').startOf('day');

    const format = 'YYYY-MM-DD HH:mm';

    // {start:Date, end:Date} => [{start:Date, end:Date}]
    return function ({start, end}) {
	var result = [];

	start = moment(start);
	end = moment(end);

	if(start.isAfter(to) || end.isBefore(from)) return result;

	result.push({start,end});

	return result;

	// start = moment.max(start, from);
	// end = moment.min(end, to);

	// var current = moment.min(start.clone().add(1, 'days').startOf('day'), end);

	// if(specific == null || (specific != null && start.isSame(specific, moment_)))
	//     result.push({start: start.format(format), end: current.format(format)});

	// while(!current.isSame(end, 'day')) {
	//     if(specific == null || (specific != null && current.isSame(specific, moment_)))
	//	result.push({start: current.format(format),
	//		     end: current.add(1, 'days').format(format)});
	//     else
	//	current.add(1, 'days');
	// }

	// if(!current.isSame(end)
	//    && specific == null || (specific != null && end.isSame(specific, moment_)))
	//     result.push({start: current.format(format), end: end.format(format)});

	// return result;
    }
}

// Date => Date => [[Date, Int]]
function extractDaysDuration(start_, end_) {
    var start = moment(start_);
    var end = moment(end_);

    var result = [];
    const format = "YYYY-MM-DD";

    if(start.isSame(end, 'day'))
	result.push([new Date(start.format(format)), moment.duration(end.diff(start)).asMinutes()]);
    else {
	var current = start.clone().endOf('day');
	result.push([new Date(current.format(format)),
		     moment.duration(current.diff(start)).add(1, 'milliseconds').asMinutes()]);
	current.add(1, 'days').startOf('day');

	while(current.isBefore(end) && !current.isSame(end, 'day')) {
	    result.push([new Date(current.format(format)), moment.duration(1, 'day').asMinutes()]);
	    current.add(1, 'days');
	}

	result.push([new Date(current.format(format)), moment.duration(end.diff(current)).asMinutes()]);
    }

    return result;
}

// [{start:Date, end:Date}] => Map(Date => Int)
function reduceDuration(entries, result = new Map()) {

    function reduce(result, {start: start, end: end}) {

	function reduce(result, [date, duration]) {

	    var current = result.get(date.getTime());

	    if(current !== undefined)
		duration += current;

	    result.set(date.getTime(), duration);

	    return result;
	}

	return extractDaysDuration(start, end).reduce(reduce, result);
    }

    return entries.reduce(reduce, result);
}

// [{date: Date}] => {'days': Integer, 'weekdays': Integer}
function extractDaysInfo(data) {
    return data.reduce((accu, {date}) => {
	accu.days += 1;
	accu.weekdays += (1 <= moment(date).isoWeekday() && moment(date).isoWeekday() <= 5);

	return accu;
    },
		       ({days: 0, weekdays: 0}));
}

// => [{date: Date, duration: Int}]
function computeCalendarDurations(headlines, filter) {

    const filterFunc = createSplittingFilter(filter.startingDate, filter.endingDate);

    const map = headlines.reduce((days, {entries}, id) =>
			       filter.headlines.has(id) ?
			       entries.reduce((days, entry) => reduceDuration(filterFunc(entry), days),
					      days)
			       : days,
			       new Map());

    const calendar = Array.from(map).map(([date, duration]) => ({date: new Date(date), duration: duration}));

    const daysCount = extractDaysInfo(calendar);

    return [calendar, daysCount];
}

// Date => Date => Integer => [Integer]
function extractDaysInterval(start_, end_, minutes, result) {

    const start = moment(start_);
    const end = moment(end_);

    var time = Math.floor(end.diff(start, 'minutes'));

    const firstInterval = start.hours() * 60 + start.minutes();

    var interval = Math.floor(firstInterval / minutes);
    var weight = minutes - firstInterval % minutes;

    result[interval] += weight;
    time -= weight;

    const lastInterval = 24 * 60 % minutes;

    while(minutes < time) {
	++interval;

	if(lastInterval != 0 && interval == result.length - 1) {
	    result[interval] += lastInterval;
	    time -= lastInterval;
	}
	else {
	    if(interval == result.length) interval = 0;

	    result[interval] += minutes;
	    time -= minutes;
	}
    }

    if(0 < time) {
	if(interval == result.length - 1) interval = 0;
	result[interval + 1] += time;
    }

    return result;
}

// [{start:Date,end:Date}] => [Integer]
function reduceInterval(entries, pace, result = Array(Math.ceil(24 * 60 / pace)).fill(0)) {
    return entries.reduce((result, {start: start, end: end}) =>
			  extractDaysInterval(start, end, pace, result),
			  result);
}

function computeDayDurations(headlines, pace, filter) {

    const filterFunc = createSplittingFilter(filter.startingDate, filter.endingDate);

    return headlines.reduce((intervals,{entries},id) =>
			    filter.headlines.has(id) ?
			    entries.reduce((intervals, entry) => reduceInterval(filterFunc(entry), pace, intervals),
					   intervals)
			    : intervals,
			    Array(Math.ceil(24 * 60 / pace)).fill(0));
}

function reduceTotal(entries) {
    return entries.reduce((total, {start:start, end:end}) => moment(end).diff(start, 'minutes'), 0);
}

function computeHeadlinesDurations(headlines, filter) {
    var result = Array(headlines.length).fill().map(_ => ({total: 0, percentage: 0}));
    var total_ = 0;

    const filterFunc = createSplittingFilter(filter.startingDate, filter.endingDate);

    headlines.forEach((headline, id) => {
	if(filter.headlines.has(id)) {
	    const total = headline.entries.reduce((total, entry) => total + reduceTotal(filterFunc(entry)), 0);
	    var current = id;
	    do {
		result[current].total += total;
		current = headlines[current].parent;
	    } while(current != null);

	    total_ += total;
	}
    });

    if(total_ != 0)
	headlines.forEach((headline, id) => {
	    if(headline.parent != null) {
		if(result[headline.parent].total != 0)
		    result[id].percentage = 100 * result[id].total / result[headline.parent].total;
	    }
	    else
		result[id].percentage = 100 * result[id].total / total_;
	});

    return [total_, result];
}

// Integer => String([0-9][0-9])
function displayTwoDigits(number) {
    return (number < 10 ? "0" : "") + number;
}

function displayMinutesAsHour(minutes) {
    return moment().startOf('day').minutes(minutes).format('HH:mm')
}

// Integer => String([0-2][0-9]:[0-5][0-9])
function displayDuration(minutes, sep = ':') {
    return displayTwoDigits(Math.floor(minutes / 60)) + sep + displayTwoDigits(minutes % 60);
}

function splitDuration(minutes, minutesOfDay = 24 * 60) {
    return {days: Math.floor(minutes / minutesOfDay),
	    hours: Math.floor((minutes % minutesOfDay) / 60),
	    minutes: (minutes % minutesOfDay) % 60};
}

// Interger => String
function displayLongDuration(minutes, minutesOfDay = 24 * 60) {
    var result = "";

    const days = Math.floor(minutes / minutesOfDay);
    if(0 < days)
	result += days + "d ";

    return result + displayDuration(minutes % minutesOfDay);
}

// Integer => Integer
function weekdayShift(weekday) {
    const firstIsoWeekday = moment().isoWeekday(moment.weekdays(true)[0]).isoWeekday();

    if(!(weekday < firstIsoWeekday)) return 0;

    switch(firstIsoWeekday) {
    case 1: return 0;
    case 7: return 1;
    default: return 2;
    }
}

// String => 'rgb(Int(0,255),Int(0,255),Int(0,255))'
function stringToColor(str) {
    var R = 0, G = 0, B = 0;
    const variability = Math.ceil(255 / str.length);

    for(var i = 0; i < str.length; i++) {
	var code = str.charCodeAt(i);
	var value = variability * code;
	switch(i % 3) {
	case 0: R += value;
	case 1: G += value;
	case 2: B += value;
	}
    }

    R = R % 255;
    G = G % 255;
    B = B % 255;

    return `rgb(${R}, ${G}, ${B})`;
}

// String => Promise
function load(path) {
    return new Promise((resolve, reject) => {

	if(window.location.href.startsWith("file:///"))
	    return reject("Cannot load '" + path + "' (file:///).");

	var xhr = new XMLHttpRequest();

	xhr.open('GET', path, true);

	xhr.onload = function() {
	    if (xhr.status === 200)
		resolve(xhr.responseText);
	    else
		reject("Cannot load '" + path + "' (" + xhr.statusText + ")");
	}

	xhr.send();
    });
}
