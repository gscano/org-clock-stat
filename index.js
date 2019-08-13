class Data {
    constructor() {
	this.set = [];
	this.tags = new Set();
	var tags_color = [];
    }

    after_parse() {
	this.tags_color = ["#eeeeee"].concat(this.tags.map(tag => stringToColor(tag)));
    }

    get_color_of(tag) {
	return this.tags_color[1 + this.tags.indexOf(tag)];
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

	drawTags();
	drawBrowser();
    }

    reader.readAsText(event.target.files[0]);
}

function parse(data) {

    {
	var start   = new Date(data.start);
	var end     = new Date(data.end);
	var minutes = (end.getTime() - start.getTime()) / 1000 / 60;

	data.duration = Math.floor(minutes / 60) + ":" + minutes % 60;

	data.tags = new Set(data.tags.split(':'));
	data.tags.delete('');
    }

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

function drawTags() {
    d3.select('#tags').selectAll('ul')
	.data(window.data.tags).enter()
	.append('li').text(tag => tag == '' ? "&amp;emsp;": tag)
	.attr("tag-id", (_,id) => id)
	.attr("is-selected", "false")
	.style("color", tag => window.data.get_color_of(tag))
	.on("click", flipTags);
}

function drawBrowser() {

    function recurse(ul) {
	var li = ul.append('li');

	li.append('span')
	    .text(task => task.name)
	    .attr("class", "task")
	    .attr("is-selected", false)
	    .attr("is-habit", task => task.ishabit ? "true" : "false")
	    .attr("task-id", task => task.id)
	    .on("click", flipTask);

	li.filter(task => task.hasOwnProperty('tags') && 0 < task.tags.length)
	    .append('ul').attr("class", "tags").selectAll('ul')
	    .data(task => task.tags).enter()
	    .append('li').text(d => d)
	    .attr("tag-id", tag => window.data.tags.indexOf(tag))
	    .attr("is-selected", false)
	    .style("color", tag => window.data.get_color_of(tag))
	    .on("click", flipTag);

	if(!li.empty()) {
	    ul = li.filter(task => 0 < task.subtasks.length)
		.append('ul').selectAll('ul')
		.data(task => task.subtasks, _ => _)
		.enter();

	    recurse(ul);
	}
    }

    d3.select("#browser").selectAll('ul')
	.data(window.data.set).enter()
	.call(recurse);
}

function flip(bool) { return bool == "true" ? "false" : "true"; }

function flipTask(task) {

    this.setAttribute("is-selected", flip(this.getAttribute("is-selected")));
}

function flipTags(tag) {

    this.setAttribute("is-selected", flip(this.getAttribute("is-selected")));

    if(this.getAttribute("is-selected") == "true") {
	this.style.color = 'white';
	this.style.backgroundColor = window.data.get_color_of(tag);
    }
    else {
	this.style.color = window.data.get_color_of(tag);
	this.style.backgroundColor = '#eeeeee';
    }
}

function flipTag(tag) {

    this.setAttribute("is-selected", flip(this.getAttribute("is-selected")));

    if(this.getAttribute("is-selected") == "true") {
	this.style.color = 'white';
	this.style.backgroundColor = window.data.get_color_of(tag);
    }
    else {
	this.style.color = window.data.get_color_of(tag);
	this.style.backgroundColor = '#eeeeee';
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
