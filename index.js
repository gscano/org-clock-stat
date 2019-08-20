class Data {
    constructor() {
	this.set = [];
	this.tags = new Set();
	var tags_color = [];

	this.task_selection = new Set();
	this.tag_selection = new Set();
    }

    after_parse() {
	this.tags_color = ["#eeeeee"].concat(this.tags.map(tag => stringToColor(tag)));
    }

    get_color_of_(tag) {
	return this.tags_color[1 + this.tags.indexOf(tag)];
    }

    get_color_of(tag) {
	return this.tag_selection.has(tag) ? this.get_color_of_(tag) : '#eeeeee';
    }

    get_background_color_of(tag) {
	return this.tag_selection.has(tag) ? '#eeeeee' : this.get_color_of_(tag);
    }
}

window.onload = function () {

    window.data = new Data();
    
    drawCalendar()

    document.getElementById('file-input').addEventListener('change', readFile, false);    
}

function readFile(event) {
    var reader = new FileReader();

    reader.onloadend = function(e) {
	parse.ID = 0;
	d3.csvParse(e.target.result, parse);

	window.data.after_parse();

	console.log(window.data);

	draw();
    }

    reader.readAsText(event.target.files[0]);
}

function parse(data) {

    data.tags = new Set(data.tags.split(':'));
    data.tags.delete('');

    window.data.tags = Array.from(new Set([...data.tags, ...window.data.tags])).sort();

    var parents = new Array(data.category)
	.concat(data.parents.split('/').filter(function(value) { return 0 < value.length; } ))
	.concat(new Array(data.task));

    var tasks = window.data.set;
    var task;

    for(let i = 0; i < parents.length; i++) {
	var parent = parents[i];

	task = tasks.find(function (e) { return e.name == parent; });

	if(task === undefined) {
	    tasks.push({"name": parent, "subtasks": []});

	    tasks.sort(function (a,b) {
		return a.hasOwnProperty('name') && b.hasOwnProperty('name') ?
		    a.name.localeCompare(b.name) : true;
	    });

	    task = tasks.find(function (e) { return e.name == parent; });
	    task.id = parse.ID++;
	}

	if(i + 1 < parents.length)
	    tasks = task.subtasks;
    }

    if(!task.hasOwnProperty('tags'))
	task.tags = Array.from(data.tags).sort();
    else
	task.tags = Array.from(new Set([...task.tags, ...data.tags])).sort();

    if(!task.hasOwnProperty('effort'))
	task.effort = data.effort;

    if(!task.hasOwnProperty('ishabit'))
	task.ishabit = data.ishabit;

    if(!task.hasOwnProperty('entries'))
	task.entries = []

    task.entries.push([data.start, data.end]);
}

function draw() {
    //drawTags();
    //drawBrowser();
    
    drawCalendar(reduceTasks(window.data.set));
}

function drawTags() {

    document.getElementById('tags').innerHTML = '';//Update issue

    var toto = d3.select('#tags').selectAll('ul')
	.data(window.data.tags).enter()
	.append('li')
	.text(tag => tag)
	.attr("tag-id", (_,id) => id)
	.attr("is-selected", tag => window.data.tag_selection.has(tag))
	.style("color", tag => window.data.get_color_of(tag))
	.style("background-color", tag => window.data.get_background_color_of(tag))
	.on("click", flipTags);
}

function drawBrowser() {

    function recurse(ul) {
	var li = ul.append('li');

	li.append('span')
	    .text(task => task.name)
	    .attr("class", "task")
	    .attr("task-id", task => task.id)
	    .attr("is-selected", task => window.data.task_selection.has(task.id))
	    .attr("is-habit", task => task.ishabit ? "true" : "false")
	    .on("click", flipTask);

	li.filter(task => task.hasOwnProperty('tags') && 0 < task.tags.length)
	    .append('ul').attr("class", "tags").selectAll('ul')
	    .data(task => task.tags).enter()
	    .append('li')
	    .text(d => d)
	    .attr("tag-id", tag => window.data.tags.indexOf(tag))
	    .attr("is-selected", tag => window.data.tag_selection.has(window.data.tags.indexOf(tag)))
	    .style("color", tag => window.data.get_color_of(tag))
	    .style("background-color", tag => window.data.get_background_color_of(tag))
	    .on("click", flipTag);

	if(!li.empty()) {
	    ul = li.filter(task => 0 < task.subtasks.length)
		.append('ul').selectAll('ul')
		.data(task => task.subtasks, _ => _)
		.enter();

	    recurse(ul);
	}
    }

    document.getElementById('browser').innerHTML = '';//Update issue

    d3.select("#browser").selectAll('ul')
	.data(window.data.set).enter()
	.call(recurse);
}

//const content = d3.nest().key(d => moment(d[0]).year()).key(d => moment(d[0]).month()).entries(data).reverse();
//console.log(content)

function drawCalendar(data) {

    const weekdaysFormat = 'dddd';
    const monthFormat = 'MMM';

    var target = 10 * 60;

    const displayWeekends = true;
    const countWeekendsIfNotDisplayed = true;

    var dayFilter = displayWeekends ? (day => day) : (day => day != 0 && day != 6);
    var countDayFilter = countWeekendsIfNotDisplayed ? (day => day) : (day => day != 0 && day != 6);
    
    const cellSize = 16;
    const textScale = 1.5;
    const interMonthSpace = 0.5;
    const interDaySpace = 1;

    function daysInRange(days) {
	return days.length;
    }

    function color(target) {
	return d3.scaleLinear().domain([0,target]).range(["white", "green"]);
    }
    const dayColor = d3.scaleLinear().domain([0,target]).range(["white", "green"]);

    function meanPerDay(days) { return d3.sum(days, day => day[1]) / daysInRange(days); }
    function sigmForDay(days) { return d3.deviation(days, day => day[1]); }
    function ellipseRadix(days, radix) { return radix + 3 * sigmForDay(days) / meanPerDay(days); }
    
    data = randomCalendarData("2016-07-24", target);
    console.log(data);
    
    const years = d3.nest().key(d => moment(d[0]).year()).entries(data).reverse();
    
    const svg = d3.selectAll('div#calendar').append('svg');
    
    svg.attr('width', 200 + 54 * (cellSize + interDaySpace) + 12 * interMonthSpace)
	.attr('height', years.length * (30 + 10 * (cellSize + interDaySpace)))
    
    const year = svg.selectAll("g").data(years).join("g");
    
    year.attr("transform", (_,i) => `translate(50,${40 + i * (5 + 2 * displayWeekends) * textScale * cellSize})`);

    const year_ = year.append("g").attr("class", "calendar-year");
    
    year_.append("text").text(({key:year}) => year);
    year_.append("ellipse").attr("cx", 15).attr("cy", -6).attr("ry", 8)
	.attr("rx", ({values:days}) => ellipseRadix(days, 8))
	.attr("fill", ({values:days}) => dayColor(meanPerDay(days)));
    
    const weekday = year.append("g").attr("class", "calendar-weekday").attr("transform", `translate(-30,${textScale * cellSize})`);

    function weekdayGridY(day) { return day * 1.05 * cellSize; }
    
    const weekday_ = weekday.selectAll("g")
	  .data(({values:days}) => d3.nest().key(([date,_]) => moment(date).weekday()).entries(days).reverse())
	  .join("g")
	  .attr("transform", d => `translate(3, ${weekdayGridY(d.key)})`)
	  //.filter(({key:day}) => dayFilter(day));

    weekday_.append("text").text(({key:weekday}) => moment.weekdays()[weekday]);
    weekday_.append("ellipse").attr("cx", -10).attr("cy", -6).attr("ry", 5)
	.attr("rx", ({values:days}) => ellipseRadix(days, 5))
	.attr("fill", ({values:days}) => dayColor(meanPerDay(days)));
    
    const month = year.append("g").attr("class", "calendar-month").attr("transform", "translate(70,0)");

    const month_ = month.selectAll("g")
	  .data(({values:days}) => d3.nest().key(([date,_]) => moment(date).month() + 1).entries(days).reverse())
          .join('g')
     	  .attr("transform", ({values:days}) => `translate(${dayGridX(moment(days[0][0]).startOf('month'))},0)`);
    
    month_.append("text")
	.text(({key:month}) => moment().month(month - 1).format(monthFormat))
    month_.append("ellipse").attr("cx", 40).attr("cy", -5).attr("ry", 5)
     	.attr("rx", ({values:days}) => ellipseRadix(days, 5))
	.attr("fill", ({values:days}) => dayColor(meanPerDay(days)));
    
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
	return moment(day).weekday() * (cellSize + interDaySpace);
    }
    
    days.selectAll("rect")
	.data(year => year.values)
	.join("rect")
	//.filter(([date,_]) => dayFilter(date))
    	.attr("width", cellSize).attr("height",  cellSize)
	.attr("transform", ([date,_]) => `translate(${dayGridX(date)},${dayGridY(date)})`)
	.attr("fill", ([_,duration]) => dayColor(duration))
	.append("title").text(([date,duration]) => date + " " + displayDuration(duration));
}

function selectAllSubTasks(task) {
    window.data.task_selection.add(task.id);
    task.subtasks.forEach(function(task) { selectAllSubTasks(task); });
}

function unselectAllSubTasks(task) {
    window.data.task_selection.delete(task.id);
    task.subtasks.forEach(function(task) { unselectAllSubTasks(task); });
}

function flipTask(task) {
    if(window.data.task_selection.has(task.id))
	unselectAllSubTasks(task);
    else
	selectAllSubTasks(task);

    draw();
}

function flipTags(tag) {
    if(this.getAttribute("is-selected") == "true") {
	this.setAttribute("is-selected", "false");
	this.style.color = window.data.get_color_of(tag);
	this.style.backgroundColor = '#eeeeee';
    }
    else {
	this.setAttribute("is-selected", "true");
	this.style.color = 'white';
	this.style.backgroundColor = window.data.get_color_of(tag);
    }

    draw();
}

function flipTag(tag) {
    if(window.data.tag_selection.has(tag.id))
	window.data.tag_selection.delete(tag.id);
    else
	window.data.tag_selection.add(tag.id);

    draw();
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
