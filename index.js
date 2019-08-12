window.dataset = [];
window.tags = new Set();

window.onload = function () {
    document.getElementById('file-input').addEventListener('change', readFile, false);
}

function readFile(event) {
    var reader = new FileReader();

    reader.onloadend = function(e) {
	d3.csvParse(e.target.result, parse);
	console.log(window.tags);
	console.log(window.dataset);
	drawBrowser();
    }

    reader.readAsText(event.target.files[0]);
}

function parse(data) {

    {
	var start = new Date(data.start);
	var end   = new Date(data.end);
	var minutes = (end.getTime() - start.getTime()) / 1000 / 60;

	data.duration = Math.floor(minutes / 60) + ":" + minutes % 60;

	data.tags = new Set(data.tags.split(':'));
    }

    window.tags = Array.from(new Set([...data.tags, ...window.tags])).sort();

    var parents = new Array(data.category)
	.concat(data.parents.split('/').filter(function(value) { return 0 < value.length; } ))
	.concat(new Array(data.task));

    var tasks = window.dataset;
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

function drawBrowser() {

    function recurse(ul) {
	var li = ul.append('li').attr("ishabit", d => d.ishabit ? "true" : "false");

	li.append('span').attr("class", "headline").text(task => task.name);

	  li.filter(task => task.hasOwnProperty('tags') && 0 < task.tags.length)
	    .append('ul').attr("class", "tags").selectAll('ul')
	    .data(task => task.tags).enter()
	    .append('li').text(d => d);

	if(!li.empty()) {
	    ul = li.filter(task => 0 < task.subtasks.length)
		.append('ul').selectAll('ul')
		.data(task => task.subtasks, function(d) { return d; })
		.enter();

	    recurse(ul);
	}
    }

    d3.select("#browser").selectAll('ul')
	.data(window.dataset)
	.enter()
	.call(recurse);
}
