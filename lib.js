// String => String => [[String, Int]]
function extractDuration(start_, end_) {
    var start = moment(start_);
    var end = moment(end_);
    
    var result = [];
    const format = "YYYY-MM-DD";
    
    if(start.isSame(end, 'day'))
	result.push([start.format(format), moment.duration(end.diff(start)).asMinutes()]);
    else {
	var current = start.clone().endOf('day');
	result.push([current.format(format),
		     moment.duration(current.diff(start)).add(1, 'milliseconds').asMinutes()]);
	current.add(1, 'days').startOf('day');

	while(!current.isSame(end, 'day')) {
	    result.push([current.format(format), moment.duration(1, 'day').asMinutes()]);
	    current.add(1, 'days');
	    console.log(current)
	}

	result.push([current.format(format), moment.duration(end.diff(current)).asMinutes()]);
    }

    return result;
}

// [[String, String]] => Map(String => Int)
function reduceDurationSub(clocks) {

    function reduce(result, clock) {
	var durations = extractDuration(clock[0], clock[1]);
	
	for(var i = 0; i < durations.length; ++i) {
	    var [date, duration] = durations[i];
	 
	    var current = result.get(date);

	    if(current !== undefined)
		duration += current;
	    
	    result.set(date, duration);
	}

	return result;
    }
    
    return clocks.reduce(reduce, new Map());
}

// [[String, String]] => [[String, Int]]
function reduceDuration(clocks) {
    return new Array(...reduceDurationSub(clocks));
}

// [[String, String]] => {'substasks': [`Self`], 'entries': [[String, String]]} => [[String, String]]
function flattenTask(task, result = []) {
    return flattenTask_(result, task);
}

function flattenTask_(result, task) {

    if(task.hasOwnProperty('entries'))
	result.push(...task.entries);

    if(task.hasOwnProperty('subtasks'))
	task.subtasks.reduce(flattenTask_, result);

    return result;
}

// [{'substasks': [`Self`], 'entries': [[String, String]]}] => [[String, String]] => [[String, String]]
function flattenTasks(tasks, result = []) {
    return tasks.reduce(flattenTask_, result);
}

// [{'substasks': [`Self`], 'entries': [[String, String]]}] => [[String, String]] => [[String, String]]
function reduceTasks(tasks) {
    return reduceDuration(flattenTasks(tasks));
}
