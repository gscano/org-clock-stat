const defaultStep = 15;

class Data {
    constructor() {
	this.maxTaskId = 0;
	this.headlines = 0;

	this.firstDate = null;
	this.lastDate = null;

	this.tasks = [];
	this.flattenedTasks = [];
	this.selectedTasks = new Set();

	this.tags = new Set();
	this.tagsCount = new Map();
	this.tagsColor = new Map();

	this.current = {
	    filter: null,
	    tasks:  [],
	    day: [],
	    calendar: [],
	    totalTime: 0,
	    daysCount: {days:0, weekdays: 0}
	}
    }

    collectTags() {
	function exploreTasksForTags(map, task) {
	    if(task.hasOwnProperty('tags')) {
		function exploreTags(tags, tag) {
		    var count = tags.get(tag);

		    if(count === undefined)
			count = 0;
		    else
			count = count.max;

		    tags.set(tag, {"current": 0, "max": count + 1});

		    return tags;
		}

		Array.from(task.tags).reduce(exploreTags, map);
	    }

	    return task.subtasks.reduce(exploreTasksForTags, map);
	}

	this.tasks.reduce(exploreTasksForTags, this.tagsCount);

	Array.from(this.tagsCount).sort((lhs,rhs) => lhs[0] > rhs[0]).forEach(([tag,_]) => this.tags.add(tag));
	this.tags.forEach(tag => this.tagsColor.set(tag, stringToColor(tag)));
    }

    countHeadlines() {
	function count(accu, task) {
	    return task.subtasks.reduce(count, 1 + (task.headlines = accu));
	}

	return this.tasks.reduce(count, 0);
    }

    setID() {
	function reduce(id, task) {
	    return task.subtasks.reduce(reduce, (task.id = id) + 1);
	}

	return this.tasks.reduce(reduce, 0);
    }

    flipTasks() {
	var fill = this.selectedTasks.size == 0;
	if(fill)
	    d3.range(0, this.maxTaskId + 1).forEach(task_id => this.selectedTasks.add(task_id));
	else
	    this.selectedTasks.clear();
	return fill;
    }

    flipTags() {
	var clear = this.isAnyTagSelected();
	this.tags.forEach(tag => this.flipTag(tag, !clear));
	return clear;
    }

    flipTag(tag, on_off) {
	var count = this.tagsCount.get(tag);
	count.current = on_off ? count.max : 0;
	this.tagsCount.set(tag, count);
    }

    afterParse() {
	this.headlines = this.countHeadlines();
	this.maxTaskId = this.setID();

	this.flattenedTasks = flattenTasks(this.tasks);

	this.firstDate = this.flattenedTasks.reduce((accu, {start:start}) => accu.isBefore(moment(start)) ? accu : moment(start), moment()).toDate();
	this.lastDate = this.flattenedTasks.reduce((accu, {end:end}) => accu.isAfter(moment(end)) ? accu : moment(end), moment()).toDate();

	this.collectTags();

	this.flipTasks();
	this.flipTags();
    }

    isTagSelected(tag) {
	var count = this.tagsCount.get(tag);
	return count.current == count.max;
    }

    isAnyTagSelected() {
	var any = false;
	this.tagsCount.forEach((count, tag) => any |= count.current == count.max);
	return any;
    }

    toggleTag(tag, on_off) {
	var count = this.tagsCount.get(tag);
	if(on_off)
	    count.current = Math.min(count.current + 1, count.max);
	else
	    count.current = Math.max(count.current - 1, 0);
    }

    getColorOfTag(tag) {
	if(this.tagsColor.has(tag))
	   return this.tagsColor.get(tag);
	else
	    return '#eeeeee';
    }

    getColorOf(tag, force = false) {
	return this.isTagSelected(tag) || force ? '#eeeeee' : this.getColorOfTag(tag);
    }

    getBackgroundColorOf(tag, force = false) {
	return this.isTagSelected(tag) || force ? this.getColorOfTag(tag) : '#eeeeee';
    }
}

window.onload = function () {

    d3.select('#average-hours').selectAll('option').data(d3.range(0,24)).enter()
	.append('option').attr("value", hour => hour).text(hour => displayTwoDigits(hour));
    document.getElementById('average-hours').value = "7";
    document.getElementById('average-hours').addEventListener('change', draw);
    d3.select('#average-minutes').selectAll('option').data(d3.range(0,60)).enter()
	.append('option').attr("value", minutes => minutes).text(minutes => displayTwoDigits(minutes));
    document.getElementById('average-minutes').value = "0";
    document.getElementById('average-minutes').addEventListener('change', draw);

    document.getElementById('day-pace').value = defaultStep;
    document.getElementById('day-pace').addEventListener('change', drawDayAfterPaceChange);

    document.getElementById('display-weekends').addEventListener('change', draw);
    document.getElementById('weekends-as-bonus').addEventListener('change', draw);

    document.getElementById('first-glance').addEventListener('click', toggleFirstGlance);
    document.getElementById('first-glance-weekdays').addEventListener('change', draw);
    document.getElementById('first-glance-months').addEventListener('change', draw);
    document.getElementById('first-glance-years').addEventListener('change', draw);

    document.getElementById('file-input').addEventListener('change', readFile, false);

    window.startingDatePicker = new Pikaday({ field: document.getElementById('starting-date') });
    window.endingDatePicker = new Pikaday({ field: document.getElementById('ending-date') });

    /* DEMO AND TESTS ONLY */
    if(true) {
	var projects = randomProjects({headlines:20,
				       maxDepth: 4, maxChildren: 4,
				       tagsProbability: 0.35, maxTags: 4,
				       effortProbability: 0.25, maxEffort: 30 * 60,
				       isHabitProbability: 0.5});

	var activityRandomizer = createActivityRandomizer({beforeWorkProbability: 0.005,
							   morning: 8, morningProbability: 0.8,
							   lunch: 12.5, lunchProbability: 0.2,
							   afternoon: 13.5, afternoonProbability: 0.7,
							   evening: 17, eveningProbability: 0.1,
							   weekendShift: 5});

	var data = randomData(projects, "2016-01-01", "2019-09-01", activityRandomizer, 100);

	console.log(projects); console.log(data);

	readData(data.join('\n'));
    }
    /* DEMO AND TESTS ONLY */
}

function readFile(event) {
    var reader = new FileReader();

    reader.onloadend = e => readData(e.target.result);
    reader.readAsText(event.target.files[0]);
}

function readData(input) {

    window.startingDatePicker.config({ onSelect: null });
    window.endingDatePicker.config({ onSelect: null });

    window.data = new Data();

    d3.csvParse(input, parse, 2);

    window.data.afterParse();

    window.startingDatePicker.setDate(window.data.firstDate);
    window.endingDatePicker.setDate(window.data.lastDate);

    window.startingDatePicker.config({ minDate: window.data.firstDate,
				       maxDate: window.data.lastDate,
				       onSelect: changeStartingDate });

    window.endingDatePicker.config({ minDate: window.data.firstDate,
				     maxDate: window.data.lastDate,
				     onSelect: changeEndingDate });

    draw();
}

function changeStartingDate() {
    window.endingDatePicker.config({minDate: window.startingDatePicker.getDate()});
    draw();
}

function changeEndingDate() {
    window.startingDatePicker.config({maxDate: window.endingDatePicker.getDate()});
    draw();
}

function toggleFirstGlance() {
    var value = document.querySelector('#first-glance-weekdays').checked
       || document.querySelector('#first-glance-months').checked
	|| document.querySelector('#first-glance-years').checked;


    document.querySelector('#first-glance-weekdays').checked = !value;
    document.querySelector('#first-glance-months').checked = !value;
    document.querySelector('#first-glance-years').checked = !value;

    draw();
}

function parse(data) {

    var parents = new Array(data.category)
	.concat(data.parents.split('/').filter(value => 0 < value.length))
	.concat(new Array(data.task));

    var tasks = window.data.tasks;
    var task;

    for(let i = 0; i < parents.length; i++) {
	var parent = parents[i];

	task = tasks.find(element => element.name == parent);

	if(task === undefined) {
	    tasks.push({name: parent, depth: i, subtasks: [], entries: []});

	    tasks.sort((a,b) => a.hasOwnProperty('name') && b.hasOwnProperty('name') ? a.name.localeCompare(b.name) : true);

	    task = tasks.find(element => element.name == parent);
	}

	if(i + 1 < parents.length)
	    tasks = task.subtasks;
    }

    data.tags = new Set(data.tags.split(':').filter(tag => 0 < tag.length));
    if(!task.hasOwnProperty('tags'))
	task.tags = data.tags;
    else
	data.tags.forEach(tag => task.tags.add(tag));

    if(!task.hasOwnProperty('effort'))
	task.effort = data.effort;

    if(!task.hasOwnProperty('ishabit'))
	task.ishabit = data.ishabit;

    const start = new Date(data.start);
    const end = new Date(data.end);

    if(!moment(start).isBefore(end))
	alert("Not adding '" + task.name + "'[" + start + " => " + end + "].");

    task.entries.push([start, end]);
}

function drawDayAfterPaceChange() {
    var dayPace = parseInt(document.getElementById('day-pace').value);

    if(dayPace <= 0 || 120 < dayPace) {
	document.getElementById('day-pace').value = defaultStep;
	dayPace = defaultStep;
    }

    var weekendsAsBonus = document.querySelector('#weekends-as-bonus').checked;

    window.data.current.day = reduceInterval(window.data.current.tasks, dayPace);
    console.log(window.data);

    drawDay(window.data.current.day, dayPace,
	    weekendsAsBonus ? window.data.current.daysCount.weekdays : window.data.current.daysCount.days,
	    window.data.current.totalTime);
}

async function draw(plot) {

    var target = parseInt(document.getElementById('average-hours').value) * 60
	+ parseInt(document.getElementById('average-minutes').value);

    var dayPace = parseInt(document.getElementById('day-pace').value);

    var displayWeekends = document.querySelector('#display-weekends').checked;
    var weekendsAsBonus = document.querySelector('#weekends-as-bonus').checked;

    var hasFirstGlanceWeekdays = document.querySelector('#first-glance-weekdays').checked;
    var hasFirstGlanceMonths = document.querySelector('#first-glance-months').checked;
    var hasFirstGlanceYears = document.querySelector('#first-glance-years').checked;

    var startingDate = window.startingDatePicker.getDate();
    var endingDate = window.endingDatePicker.getDate();

    window.data.current.filter = createSplittingFilter(window.data.selectedTasks,
						       startingDate, endingDate);
    window.data.current.tasks = [];
    window.data.flattenedTasks.reduce((result, entry) => {
	Array.prototype.push.apply(result, window.data.current.filter(entry));
	return result;
    }, window.data.current.tasks);

    window.data.current.day = reduceInterval(window.data.current.tasks, dayPace);
    window.data.current.calendar = reduceDuration(window.data.current.tasks)

    window.data.current.totalTime = d3.sum(window.data.current.calendar, day => day.duration);
    window.data.current.daysCount = extractDaysInfo(window.data.current.calendar);

    console.log(window.data);

    drawDay(window.data.current.day, dayPace,
	    weekendsAsBonus ? window.data.current.daysCount.weekdays : window.data.current.daysCount.days,
	    window.data.current.totalTime);

    drawHeadlines();

    drawCalendar(window.data.current.calendar, target,
		 displayWeekends, weekendsAsBonus,
		 hasFirstGlanceWeekdays, hasFirstGlanceMonths, hasFirstGlanceYears);
}

function drawDay(data, step, numberOfDays, totalTime) {
    document.getElementById('day').innerHTML = '';

    var sameMinuteDeviation = d3.sum(data) - totalTime;

    var cellSize = 16;
    if(step < defaultStep)
	cellSize /= (defaultStep / step);

    const interSize = 1;

    const color = d3.scaleLinear().domain([0,step]).range(["white", "green"]);

    const day = d3.select("div#day").append("svg");

    day.attr('width', 100 + data.length * (cellSize + interSize))
	.attr('height', 40 + cellSize)
	.attr("transform", `translate(0,10)`);

    day.append("g")
	.append("text").text(numberOfDays + " x")
	.attr("transform", `translate(10,12.5)`)
	.append("title")
	.text("Minutes counted twice a day: " + Math.floor(sameMinuteDeviation / numberOfDays) + "  " + (100 * sameMinuteDeviation / totalTime).toFixed(2) + "%");

    const shift = 50;

    day.append("g").selectAll("rect")
	.data(data)
	.join("rect")
	.attr("width", cellSize).attr("height", cellSize)
	.attr("transform", (_,i) => `translate(${shift + i * (cellSize + interSize) + 20}, 0)`)
	.attr("fill", duration => color(Math.floor(duration/numberOfDays)))
	.append("title")
	.text((duration,i) => displayMinutesAsHour(i * step) + "-"
	      + displayMinutesAsHour(i == data.length - 1 ? 0 : (i + 1) * step) + " "
	      + displayLongDuration(Math.floor(duration/numberOfDays)) + " "
	      + Math.floor(duration/numberOfDays/(i == data.length - 1 ? 24 * 60 % step : step)*100) + "%");

    const hours = [...Array(25).keys()].filter(index => step <= 20 ? true : index % Math.ceil(4 * step / 60) == 0);

    day.append("g")
	.selectAll("line")
	.data(hours)
	.join("line")
	.attr("transform", i => `translate(${shift + (i == 24 ? data.length : i * 60 / step) * (cellSize + interSize) + 20}, 30)`)
	.attr("stroke", "black")
	.attr("x1", 0).attr("x2", 0)
	.attr("y1", 0).attr("y2", -10);

    day.append("g").attr("class", "hours")
	.selectAll("text")
	.data(hours)
	.join("text")
	.attr("transform", i => `translate(${shift + (i == 24 ? data.length : i * 60 /step) * (cellSize + interSize) - 3}, 40)`)
	.text(hours => moment().startOf('day').hours(hours).format('HH:mm'));
}

function drawHeadlines() {
    drawTags();
    drawBrowser();
}

function drawTags() {
    document.getElementById('tags').innerHTML = '';

    d3.select('ul#tags').selectAll('ul')
	.data(Array.from(window.data.tags).sort())
	.enter()
	.append('li')
	.text(tag => tag)
	.attr("is-selected", tag => window.data.isTagSelected(tag))
	.style("color", tag => window.data.getColorOf(tag))
	.style("background-color", tag => window.data.getBackgroundColorOf(tag))
	.on("click", flipTag);

    d3.select('ul#tags')
	.insert("li", ":first-child")
	.attr("toggled", !window.data.isAnyTagSelected())
	.text("None")
	.on("click", flipTags);
}

function drawBrowser() {
    document.getElementById('browser').innerHTML = '';

    function recurse(ul) {
	var li = ul.append('li');

	li.append('span')
	    .text(task => task.name)
	    .attr("class", "task")
	    .attr("task-id", task => task.id)
	    .attr("is-selected", task => window.data.selectedTasks.has(task.id))
	    .attr("is-habit", task => task.ishabit ? "true" : "false")
	    .on("click", flipTask);

	li.filter(task => task.hasOwnProperty('tags') && 0 < task.tags.size)
	    .append('ul').attr("class", "tags").selectAll('ul')
	    .data(task => Array.from(task.tags).sort().map(tag => [window.data.selectedTasks.has(task.id), tag]))
	    .enter()
	    .append('li')
	    .text(([_,tag]) => tag)
	    .attr("is-selected", ([selected,tag]) => selected)
	    .style("color", ([selected,tag]) => window.data.getColorOf(tag, selected))
	    .style("background-color", ([selected,tag]) => window.data.getBackgroundColorOf(tag, selected));

	if(!li.empty()) {
	    ul = li.filter(task => 0 < task.subtasks.length)
		.append('ul').selectAll('ul')
		.data(task => task.subtasks, _ => _)
		.enter();

	    recurse(ul);

	}

    }

    d3.select("#browser").selectAll('ul')
	.data(window.data.tasks)
	.enter()
	.call(recurse);

    d3.select("#browser")
	.insert("li", ":first-child")
	.text("None")
	.attr("class", "task")
	.attr("is-selected", window.data.selectedTasks.size == 0)
	.on("click", flipTasks);
}

function drawCalendar(data, target,
		      displayWeekends, weekendsAsBonus,
		      hasFirstGlanceWeekdays, hasFirstGlanceMonths, hasFirstGlanceYears) {
    document.getElementById('calendar').innerHTML = '';

    const weekdaysFormat = 'dddd';
    const monthFormat = 'MMM';

    const isWeekday = day => day != 6 && day != 7;
    const dayFilter = day => displayWeekends ? true : isWeekday(day);

    const weekdaysShift = day => displayWeekends ? 0 : weekdayShift(day);

    const cellSize = 16;
    const textScale = 1.5;
    const interMonthSpace = 0.5;
    const interDaySpace = 1;

    const sumDay = ({"date":date,"duration":duration}) => (displayWeekends || weekendsAsBonus) ? duration : (isWeekday(moment(date).isoWeekday()) ? duration : 0);
    const countDays = days => days.reduce((accu, day) => accu + dayFilter(moment(day.date).isoWeekday()), 0);

    const color = d3.scaleLinear().domain([0,target]).range(["white", "green"]);

    const meanPerDay = days => d3.sum(days, day => sumDay(day)) / countDays(days);
    const sigmForDay = days => d3.deviation(days, day => sumDay(day));
    const ellipseRadix = (days, radix, max) => Math.min(radix  * meanPerDay(days) / sigmForDay(days), max);

    //Data
    const years = d3.nest().key(d => moment(d.date).year()).entries(data).reverse();

    //Drawings
    const svg = d3.selectAll('div#calendar').append('svg');

    svg.attr('width', 200 + 54 * (cellSize + interDaySpace) + 12 * interMonthSpace)
	.attr('height', years.length * (30 + 10 * (cellSize + interDaySpace)))

    const year = svg.selectAll("g").data(years).join("g");

    year.attr("transform", (_,i) => `translate(50,${40 + i * (5 + 2 * displayWeekends) * textScale * cellSize})`);

    const year_ = year.append("g").attr("class", "calendar-year");

    year_.append("text").text(({key:year}) => year);
    if(hasFirstGlanceYears)
	year_.append("ellipse").attr("cx", 20).attr("cy", -6).attr("ry", 8)
	.attr("rx", ({values:days}) => ellipseRadix(days, 8, 16))
	.attr("fill", ({values:days}) => color(meanPerDay(days)))
	.append("title").text(({values:values}) => displayDuration(Math.floor(d3.sum(values, ({duration:duration}) => duration) / values.length)));

    const weekday = year.append("g").attr("class", "calendar-weekday").attr("transform", `translate(-30,${textScale * cellSize})`);

    function weekdayGridY(weekday) { return (weekday - weekdaysShift(weekday)) * 1.05 * cellSize; }

    const weekday_ = weekday.selectAll("g")
	  .data(({values:days}) => d3.nest().key(({"date":date}) => moment(date).weekday()).entries(days).filter(({key:weekday}) => dayFilter(moment().weekday(weekday).isoWeekday())))
	  .join("g")
	  .attr("transform", ({key:weekday}) => `translate(3, ${weekdayGridY(weekday)})`);

    weekday_.append("text").text(({key:weekday}) => moment.weekdays(true)[weekday]);
    if(hasFirstGlanceWeekdays)
	weekday_.append("ellipse").attr("cx", -10).attr("cy", -6).attr("ry", 4)
	.attr("rx", ({values:days}) => ellipseRadix(days, 4, 8))
	.attr("fill", ({values:days}) => color(meanPerDay(days)))
	.append("title").text(({values:values}) => displayDuration(Math.floor(d3.sum(values, ({duration:duration}) => duration) / values.length)));

    const month = year.append("g").attr("class", "calendar-month").attr("transform", "translate(70,0)");

    const month_ = month.selectAll("g")
	  .data(({values:days}) => d3.nest().key(({"date":date}) => moment(date).month() + 1).entries(days).reverse())
	  .join('g')
	  .attr("transform", ({values:days}) => `translate(${dayGridX(moment(days[0].date).startOf('month'))},0)`);

    month_.append("text")
	.text(({key:month}) => moment().month(month - 1).format(monthFormat))
    if(hasFirstGlanceMonths)
	month_.append("ellipse").attr("cx", 45).attr("cy", -5).attr("ry", 5)
	.attr("rx", ({values:days}) => ellipseRadix(days, 5, 10))
	.attr("fill", ({values:days}) => color(meanPerDay(days)))
	.append("title").text(({values:values}) => displayLongDuration(Math.floor(d3.sum(values, ({duration:duration}) => duration) / values.length)));

    const days = year.append("g")
	  .attr("class", "calendar-day")
	  .attr("transform", "translate(70,10)");

    function dayGridX(day) {
	day = moment(day);
	week = (day.month() == 0 && 50 < day.week()) ? 0 : day.week();
	week = (day.month() == 11 && week <= 1) ? week = day.subtract(7, 'days').week() + 1 : week;
	return week * (cellSize + interDaySpace) + day.month() * interMonthSpace * cellSize;
    }

    function dayGridY(day) {
	var weekday = moment(day).weekday();
	return (weekday - weekdaysShift(weekday)) * (cellSize + interDaySpace);
    }

    days.selectAll("rect")
	.data(({values:days}) => days.filter(({"date":date}) => dayFilter(moment(date).isoWeekday())))
	.join("rect")
	.attr("width", cellSize).attr("height",  cellSize)
	.attr("transform", ({"date":date}) => `translate(${dayGridX(date)},${dayGridY(date)})`)
	.attr("fill", ({"duration":duration}) => color(duration))
	.append("title").text(({"date":date,"duration":duration}) => moment(date).format('YYYY-MM-DD') + " " + displayDuration(duration));
}

function selectAllSubTasks(task) {
    window.data.selectedTasks.add(task.id);
    if(task.hasOwnProperty('tags'))
	task.tags.forEach(tag => window.data.toggleTag(tag, true));
    task.subtasks.forEach(subtask => selectAllSubTasks(subtask));
}

function unselectAllSubTasks(task) {
    window.data.selectedTasks.delete(task.id);
    if(task.hasOwnProperty('tags'))
	task.tags.forEach(tag => window.data.toggleTag(tag, false));
    task.subtasks.forEach(subtask => unselectAllSubTasks(subtask));
}

function flipTask(task) {
    if(window.data.selectedTasks.has(task.id))
	unselectAllSubTasks(task);
    else
	selectAllSubTasks(task);

    draw();
}

function flipTasks() {
    if(window.data.flipTasks() ^ window.data.isAnyTagSelected())
	window.data.flipTags();

    draw();
}

function forAllTasksWithTagDo(task, tag, action) {
    if(task.hasOwnProperty('tags')
       && task.tags.has(tag))
	action(task.id);
    task.subtasks.forEach(task => forAllTasksWithTagDo(task, tag, action));
}

function selectAllTasksWithTag(task, tag) {
    return forAllTasksWithTagDo(task, tag, task_id => window.data.selectedTasks.add(task_id));
}

function unselectAllTasksWithTag(task, tag) {
    return forAllTasksWithTagDo(task, tag, task_id => window.data.selectedTasks.delete(task_id));
}

function flipTag(tag) {
    if(window.data.isTagSelected(tag)) {
	window.data.flipTag(tag, false);
	window.data.tasks.forEach(task => unselectAllTasksWithTag(task, tag));
    }
    else {
	window.data.flipTag(tag, true);
	window.data.tasks.forEach(task => selectAllTasksWithTag(task, tag));
    }

    draw();
}

function forAllTasksWithATagDo(task, action) {
    if(task.hasOwnProperty('tags') && 0 < task.tags.size)
	action(task.id);
    task.subtasks.forEach(task => forAllTasksWithATagDo(task, action));
}

function flipTags() {
    if(window.data.flipTags())
	window.data.tasks.forEach(task => forAllTasksWithATagDo(task, task_id => window.data.selectedTasks.delete(task_id)));
    else
	window.data.tasks.forEach(task => forAllTasksWithATagDo(task, task_id => window.data.selectedTasks.add(task_id)));

    draw();
}
