// [{id:Integer, substasks:[Self], entries:[[Date, Date]]}] => [{id:Integer, start:String, end:String}] => [{id:Integer, start:String, end:String}]
function flattenTasks(tasks, result = []) {
    return tasks.reduce(flattenTask_, result);
}

// {substasks:[Self], entries:[[Date, Date]]} => [[Date, Date]] => [{id:Integer, start:String, end:String}]
function flattenTask(task, result = []) {
    return flattenTask_(result, task);
}

function flattenTask_(result, task) {

    if(task.hasOwnProperty('entries'))
	result.push(...task.entries.map(entry => ({id: task.id,
						   start: entry[0],
						   end: entry[1]})));

    if(task.hasOwnProperty('subtasks'))
	task.subtasks.reduce(flattenTask_, result);

    return result;
}

// Set(Integer) => Date => Date => Date => String => (Integer => Date => Boolean)
function createFilter(ids, from, to, specific = null, moment_ = 'date') {
    from = moment(from);
    to = moment(to);
    specific = specific == null ? null : moment(specific);

    function filter(id, date) {
	date = moment(date);
	return ids.has(id)
	    && date.isSameOrAfter(from)
	    && date.isSameOrBefore(to)
	    && (specific == null ? true : date.isSame(specific, moment_));
    }

    return filter;
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

	while(!current.isSame(end, 'day')) {
	    result.push([new Date(current.format(format)), moment.duration(1, 'day').asMinutes()]);
	    current.add(1, 'days');
	}

	result.push([new Date(current.format(format)), moment.duration(end.diff(current)).asMinutes()]);
    }

    return result;
}

// [{start:Date, end:Date}] => {date:Date, duration:Int}
function reduceDuration(clocks) {

    function reduce(result, {start:start, end:end}) {

	function reduce(result, [date, duration]) {

	    var current = result.get(date.getTime());

	    if(current !== undefined)
		duration += current;

	    result.set(date.getTime(), duration);

	    return result;
	}

	return extractDaysDuration(start, end).reduce(reduce, result);
    }

    return Array.from(clocks.reduce(reduce, new Map()))
	.map(([date,duration]) => ({date: new Date(date), duration: duration}));
}

// Date => Date => Integer => [] => [Integer]
function extractDaysInterval(start_, end_, minutes = 15, result = Array(minutes).fill(0)) {

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
function reduceInterval(clocks, minutes = 15) {
    return clocks.reduce((result, {start:start, end:end}) => extractDaysInterval(start, end, minutes, result),
			 Array(Math.ceil(24 * 60 / minutes)).fill(0));
}

// [{date:Date}] => {'days':Integer,'weekdays':Integer}
function extractDaysInfo(data) {
    return data.reduce((accu, {date: date}) => {
	accu.days += 1;
	accu.weekdays += (1 <= moment(date).isoWeekday() && moment(date).isoWeekday() <= 5);

	return accu;
    },
		       ({days: 0, weekdays:0}));
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

// Interger => String
function displayLongDuration(minutes, minutesOfDay = 24 * 60) {
    var result = "";

    const days = Math.floor(minutes / minutesOfDay);
    if(0 < days)
	result += days + "d";

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

function load(path) {
    var xhr = new XMLHttpRequest();

    xhr.open('GET', path);

    xhr.onload = function() {
	if (xhr.status === 200)
	    document.getElementById(id).innerHTML = xhr.responseText;
	else
	    document.getElementById(id).innerHTML = "Cannot load '" + path + "' (" + xhr.status + ").";
    };

    xhr.send();
}
