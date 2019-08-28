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
	    console.log(current)
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

// Date => Date => [interval:Int, weight:Int]]
function extractDaysInterval(start_, end_, minutes = 15) {

    const start = moment(start_);
    const end = moment(end_);

    var time = Math.floor(end.diff(start, 'minutes'));

    const firstInterval = start.hours() * 60 + start.minutes();
    const maxInterval = Math.floor(24 * 60 / minutes);

    var interval = Math.floor(firstInterval / minutes);
    var weight = minutes - firstInterval % minutes;

    var result = [{interval: interval, weight: weight}];
    ++interval;
    time -= weight;

    while(minutes < time) {
	result.push({interval: interval, weight: minutes});
	time -= minutes;
	if(interval == maxInterval) interval = 0;
	else ++interval;
    }

    if(0 < time)
	result.push({interval: interval, weight: time});

    return result;
}

// [{start:Date,end:Date}] => {interval:Integer,weight:Integer}
function reduceInterval(clocks, minutes = 15) {

    function reduce(result, {start:start, end:end}) {

	extractDaysInterval(start, end, minutes)
	    .forEach(({interval:i,weight:weight}) => result[i] += weight);

	return result;
    }

    return clocks.reduce(reduce, Array(Math.floor(24*60/minutes) + 1).fill(0));
}

// Integer => String([0-9][0-9])
function displayTwoDigits(number) {
    return (number < 10 ? "0" : "") + number;
}

// Integer => String([0-2][0-9]:[0-5][0-9])
function displayDuration(minutes) {
    return displayTwoDigits(Math.floor(minutes / 60)) + ':' + displayTwoDigits(minutes % 60);
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
