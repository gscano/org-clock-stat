class Data {
    constructor() {
	this.max_task_id = 0;

	this.tasks = [];
	this.tasks_selection = new Set();

	this.tags = new Set();
	this.tags_count = new Map();
	this.tags_color = new Map();
    }

    collect_tags() {
	function explore_tasks_for_tags(map, task) {
	    if(task.hasOwnProperty('tags')) {
		function explore_tags(tags, tag) {
		    var count = tags.get(tag);

		    if(count === undefined)
			count = 0;
		    else
			count = count.max;

		    tags.set(tag, {"current": 0, "max": count + 1});

		    return tags;
		}

		Array.from(task.tags).reduce(explore_tags, map);
	    }

	    return task.subtasks.reduce(explore_tasks_for_tags, map);
	}

	this.tasks.reduce(explore_tasks_for_tags, this.tags_count);

	Array.from(this.tags_count).sort((lhs,rhs) => lhs[0] > rhs[0]).forEach(([tag,_]) => this.tags.add(tag));
	this.tags.forEach(tag => this.tags_color.set(tag, stringToColor(tag)));
    }

    flip_tasks() {
	var fill = this.tasks_selection.size == 0;
	if(fill)
	    d3.range(0, this.max_task_id + 1).forEach(task_id => this.tasks_selection.add(task_id));
	else
	    this.tasks_selection.clear();
	return fill;
    }

    flip_tags() {
	var clear = this.is_any_tag_selected();
	this.tags.forEach(tag => this.flip_tag(tag, !clear));
	return clear;
    }

    flip_tag(tag, on_off) {
	var count = this.tags_count.get(tag);
	count.current = on_off ? count.max : 0;
	this.tags_count.set(tag, count);
    }

    after_parse() {
	this.collect_tags();

	this.flip_tasks();
	this.flip_tags();
    }

    is_tag_selected(tag) {
	var count = this.tags_count.get(tag);
	return count.current == count.max;
    }

    is_any_tag_selected() {
	var any = false;
	this.tags_count.forEach((count, tag) => any |= count.current == count.max);
	return any;
    }

    toggle_tag(tag, on_off) {
	var count = this.tags_count.get(tag);
	if(on_off)
	    count.current = Math.min(count.current + 1, count.max);
	else
	    count.current = Math.max(count.current - 1, 0);
    }

    get_color_of_(tag) {
	if(this.tags_color.has(tag))
	   return this.tags_color.get(tag);
	else
	    return '#eeeeee';
    }

    get_color_of(tag, force = false) {
	return this.is_tag_selected(tag) || force ? '#eeeeee' : this.get_color_of_(tag);
    }

    get_background_color_of(tag, force = false) {
	return this.is_tag_selected(tag) || force ? this.get_color_of_(tag) : '#eeeeee';
    }
}

window.onload = function () {

    window.data = new Data();

    document.getElementById('file-input').addEventListener('change', readFile, false);

    window.starting_date_picker = new Pikaday({ field: document.getElementById('starting-date') });
    window.ending_date_picker = new Pikaday({ field: document.getElementById('ending-date')});

    d3.select('#average-hours').selectAll('option').data(d3.range(0,24)).enter()
	.append('option').attr("value", hour => hour).text(hour => displayTwoDigits(hour));
    document.getElementById('average-hours').value = "7";
    document.getElementById('average-hours').addEventListener('change', draw);
    d3.select('#average-minutes').selectAll('option').data(d3.range(0,60)).enter()
	.append('option').attr("value", minutes => minutes).text(minutes => displayTwoDigits(minutes));
    document.getElementById('average-minutes').value = "0";
    document.getElementById('average-minutes').addEventListener('change', draw);

    document.getElementById('display-weekends').addEventListener('change', draw);
    document.getElementById('weekends-as-bonus').addEventListener('change', draw);

    document.getElementById('first-glance-weekdays').addEventListener('change', draw);
    document.getElementById('first-glance-months').addEventListener('change', draw);
    document.getElementById('first-glance-years').addEventListener('change', draw);

    draw();
}

function readFile(event) {
    var reader = new FileReader();

    reader.onloadend = function(e) {
	parse.ID = 0;
	d3.csvParse(e.target.result, parse);

	window.data.after_parse();

	draw();
    }

    reader.readAsText(event.target.files[0]);
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
	    tasks.push({"name": parent, "subtasks": []});

	    tasks.sort((a,b) => a.hasOwnProperty('name') && b.hasOwnProperty('name') ? a.name.localeCompare(b.name) : true);

	    task = tasks.find(element => element.name == parent);
	    task.id = parse.ID++;
	    window.data.max_task_id = Math.max(window.data.max_task_id, task.id);
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

    if(!task.hasOwnProperty('entries'))
	task.entries = []

    task.entries.push([data.start, data.end]);
}

function draw() {

    //Update issue
    document.getElementById('tags').innerHTML = '';
    document.getElementById('browser').innerHTML = '';
    document.getElementById('calendar').innerHTML = '';

    console.log(window.data);

    var target = parseInt(document.getElementById('average-hours').value) * 60
	+ parseInt(document.getElementById('average-minutes').value);

    var displayWeekends = document.querySelector('#display-weekends').checked;
    var weekendsAsBonus = document.querySelector('#weekends-as-bonus').checked;

    var hasFirstGlanceWeekdays = document.querySelector('#first-glance-weekdays').checked;
    var hasFirstGlanceMonths = document.querySelector('#first-glance-months').checked;
    var hasFirstGlanceYears = document.querySelector('#first-glance-years').checked;

    var data = reduceTasks(window.data.tasks)
    console.log(data)

    drawTags();
    drawBrowser();

    // drawCalendar(data, target,
    //		 displayWeekends, weekendsAsBonus,
    //		 hasFirstGlanceWeekdays, hasFirstGlanceMonths, hasFirstGlanceYears);
}

function drawTags() {

    d3.select('#tags').selectAll('ul')
	.data(Array.from(window.data.tags).sort())
	.enter()
	.append('li')
	.text(tag => tag)
	.attr("is-selected", tag => window.data.is_tag_selected(tag))
	.style("color", tag => window.data.get_color_of(tag))
	.style("background-color", tag => window.data.get_background_color_of(tag))
	.on("click", flipTag);

    d3.select('#tags')
	.insert("li", ":first-child")
	.attr("toggled", !window.data.is_any_tag_selected())
	.text("None")
	.on("click", flipTags);
}

function drawBrowser() {

    function recurse(ul) {
	var li = ul.append('li');

	li.append('span')
	    .text(task => task.name)
	    .attr("class", "task")
	    .attr("task-id", task => task.id)
	    .attr("is-selected", task => window.data.tasks_selection.has(task.id))
	    .attr("is-habit", task => task.ishabit ? "true" : "false")
	    .on("click", flipTask);

	li.filter(task => task.hasOwnProperty('tags') && 0 < task.tags.size)
	    .append('ul').attr("class", "tags").selectAll('ul')
	    .data(task => Array.from(task.tags).sort().map(tag => [window.data.tasks_selection.has(task.id), tag]))
	    .enter()
	    .append('li')
	    .text(([_,tag]) => tag)
	    .attr("is-selected", ([selected,tag]) => selected)
	    .style("color", ([selected,tag]) => window.data.get_color_of(tag, selected))
	    .style("background-color", ([selected,tag]) => window.data.get_background_color_of(tag, selected));

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
	.attr("is-selected", window.data.tasks_selection.size == 0)
	.on("click", flipTasks);
}

//const content = d3.nest().key(d => moment(d[0]).year()).key(d => moment(d[0]).month()).entries(data).reverse();
//console.log(content)

function drawCalendar(data, target,
		      displayWeekends, weekendsAsBonus,
		      hasFirstGlanceWeekdays, hasFirstGlanceMonths, hasFirstGlanceYears) {

    const weekdaysFormat = 'dddd';
    const monthFormat = 'MMM';

    const isWeekday = day => day != 6 && day != 7;
    const dayFilter = day => displayWeekends ? true : isWeekday(day);

    const weekdaysShift = day => displayWeekends ? 0 : weekdayShift(day);

    const cellSize = 16;
    const textScale = 1.5;
    const interMonthSpace = 0.5;
    const interDaySpace = 1;

    const sumDay = ([date,value]) => (displayWeekends || weekendsAsBonus) ? value : (isWeekday(moment(date).isoWeekday()) ? value : 0);
    const countDays = days => days.reduce((accu, day) => accu + dayFilter(moment(day[0]).isoWeekday()), 0);

    const color = d3.scaleLinear().domain([0,target]).range(["white", "green"]);

    const meanPerDay = days => d3.sum(days, day => sumDay(day)) / countDays(days);
    const sigmForDay = days => d3.deviation(days, day => sumDay(day));
    const ellipseRadix = (days, radix, max) => Math.min(radix  * meanPerDay(days) / sigmForDay(days), max);

    //Data
    const years = d3.nest().key(d => moment(d[0]).year()).entries(data).reverse();

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
	.attr("fill", ({values:days}) => color(meanPerDay(days)));

    const weekday = year.append("g").attr("class", "calendar-weekday").attr("transform", `translate(-30,${textScale * cellSize})`);

    function weekdayGridY(weekday) { return (weekday - weekdaysShift(weekday)) * 1.05 * cellSize; }

    const weekday_ = weekday.selectAll("g")
	  .data(({values:days}) => d3.nest().key(([date,_]) => moment(date).weekday()).entries(days).filter(({key:weekday}) => dayFilter(moment().weekday(weekday).isoWeekday())))
	  .join("g")
	  .attr("transform", ({key:weekday}) => `translate(3, ${weekdayGridY(weekday)})`);

    weekday_.append("text").text(({key:weekday}) => moment.weekdays(true)[weekday]);
    if(hasFirstGlanceWeekdays)
	weekday_.append("ellipse").attr("cx", -10).attr("cy", -6).attr("ry", 4)
	.attr("rx", ({values:days}) => ellipseRadix(days, 4, 8))
	.attr("fill", ({values:days}) => color(meanPerDay(days)));

    const month = year.append("g").attr("class", "calendar-month").attr("transform", "translate(70,0)");

    const month_ = month.selectAll("g")
	  .data(({values:days}) => d3.nest().key(([date,_]) => moment(date).month() + 1).entries(days).reverse())
	  .join('g')
	  .attr("transform", ({values:days}) => `translate(${dayGridX(moment(days[0][0]).startOf('month'))},0)`);

    month_.append("text")
	.text(({key:month}) => moment().month(month - 1).format(monthFormat))
    if(hasFirstGlanceMonths)
	month_.append("ellipse").attr("cx", 45).attr("cy", -5).attr("ry", 5)
	.attr("rx", ({values:days}) => ellipseRadix(days, 5, 10))
	.attr("fill", ({values:days}) => color(meanPerDay(days)));

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
	.data(({values:days}) => days.filter(([date,_]) => dayFilter(moment(date).isoWeekday())))
	.join("rect")
	.attr("width", cellSize).attr("height",  cellSize)
	.attr("transform", ([date,_]) => `translate(${dayGridX(date)},${dayGridY(date)})`)
	.attr("fill", ([_,duration]) => color(duration))
	.append("title").text(([date,duration]) => date + " " + displayDuration(duration));
}

function selectAllSubTasks(task) {
    window.data.tasks_selection.add(task.id);
    if(task.hasOwnProperty('tags'))
	task.tags.forEach(tag => window.data.toggle_tag(tag, true));
    task.subtasks.forEach(subtask => selectAllSubTasks(subtask));
}

function unselectAllSubTasks(task) {
    window.data.tasks_selection.delete(task.id);
    if(task.hasOwnProperty('tags'))
	task.tags.forEach(tag => window.data.toggle_tag(tag, false));
    task.subtasks.forEach(subtask => unselectAllSubTasks(subtask));
}

function flipTask(task) {
    if(window.data.tasks_selection.has(task.id))
	unselectAllSubTasks(task);
    else
	selectAllSubTasks(task);

    draw();
}

function flipTasks() {
    if(window.data.flip_tasks() ^ window.data.is_any_tag_selected())
	window.data.flip_tags();

    draw();
}

function forAllTasksWithTagDo(task, tag, action) {
    if(task.hasOwnProperty('tags')
       && task.tags.has(tag))
	action(task.id);
    task.subtasks.forEach(task => forAllTasksWithTagDo(task, tag, action));
}

function selectAllTasksWithTag(task, tag) {
    return forAllTasksWithTagDo(task, tag, task_id => window.data.tasks_selection.add(task_id));
}

function unselectAllTasksWithTag(task, tag) {
    return forAllTasksWithTagDo(task, tag, task_id => window.data.tasks_selection.delete(task_id));
}

function flipTag(tag) {
    if(window.data.is_tag_selected(tag)) {
	window.data.flip_tag(tag, false);
	window.data.tasks.forEach(task => unselectAllTasksWithTag(task, tag));
    }
    else {
	window.data.flip_tag(tag, true);
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
    if(window.data.flip_tags())
	window.data.tasks.forEach(task => forAllTasksWithATagDo(task, task_id => window.data.tasks_selection.delete(task_id)));
    else
	window.data.tasks.forEach(task => forAllTasksWithATagDo(task, task_id => window.data.tasks_selection.add(task_id)));

    draw();
}
