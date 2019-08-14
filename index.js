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

window.data = new Data();

window.onload = function () {
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

    task.entries.push({"start": data.start, "duration": data.duration, "end": data.end});
}

function draw() {
    drawTags();
    drawBrowser();
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
