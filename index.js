window.onload = async function () {

    window.color = "green";
    window.defaultStep = 15;

    load('./license.html')
	.then(content => {
	    document.getElementById('license-content').innerHTML = content;
	    document.getElementById('license').addEventListener('click', displayLicense);
	    document.getElementById('license').removeAttribute("href");
	})
	.catch(reason => console.log(reason));

    load('./help.html')
	.then(content => {
	    document.getElementById('help-content').innerHTML = content;
	    document.getElementById('help').addEventListener('click', displayHelp);
	    document.getElementById('help').removeAttribute("href");
	})
	.catch(reason => console.log(reason));

    document.getElementById('color').style.color = window.color;
    document.getElementById('color').addEventListener('click', pickColor);
    document.getElementById('color-picker').addEventListener("focusout", colorPicked);

    d3.select('#average-hours').selectAll('option').data(d3.range(0,24)).enter()
	.append('option').attr("value", hour => hour).text(hour => displayTwoDigits(hour));
    document.getElementById('average-hours').value = "7";
    document.getElementById('average-hours').addEventListener('change', drawOnAverageChange);
    d3.select('#average-minutes').selectAll('option').data(d3.range(0,60)).enter()
	.append('option').attr("value", minutes => minutes).text(minutes => displayTwoDigits(minutes));
    document.getElementById('average-minutes').value = "0";
    document.getElementById('average-minutes').addEventListener('change', drawOnAverageChange);

    document.getElementById('day-pace').value = window.defaultStep;
    document.getElementById('day-pace').addEventListener('change', drawOnDayPaceChange);

    document.getElementById('display-weekends').addEventListener('change', drawAll);
    document.getElementById('weekends-as-bonus').addEventListener('change', drawAll);

    document.getElementById('first-glance').addEventListener('click', toggleFirstGlance);
    document.getElementById('first-glance-weekdays').addEventListener('change', drawOnFirstGlanceChange);
    document.getElementById('first-glance-months').addEventListener('change', drawOnFirstGlanceChange);
    document.getElementById('first-glance-years').addEventListener('change', drawOnFirstGlanceChange);

    document.getElementById('file-input').addEventListener('change', readFile, false);

    window.startingDatePicker = new Pikaday({ field: document.getElementById('starting-date') });
    window.endingDatePicker = new Pikaday({ field: document.getElementById('ending-date') });

    /* DEMO AND TESTS ONLY */
    if(true) {
	var projects = randomProjects({headlines:20,
				       maxDepth: 4, maxChildren: 4,
				       tagsProbability: 0.35, maxTags: 4,
				       effortProbability: 0.25, maxEffort: 30 * 60,
				       isHabitProbability: 0.2});

	var activityRandomizer = createActivityRandomizer({beforeWorkProbability: 0.005,
							   morning: 8, morningProbability: 0.8,
							   lunch: 12, lunchProbability: 0.2,
							   afternoon: 13, afternoonProbability: 0.7,
							   evening: 17, eveningProbability: 0.1,
							   weekendShift: 5});

	var data = randomData(projects, "2016-01-01", "2019-08-31", activityRandomizer, 100);

	if(false) { console.log(projects); console.log(data); }

	readData(data.join('\n'));
    }
    /* DEMO AND TESTS ONLY */

    //TODO Workers
    //window.isLocal = window.location.href.startsWith('file:///');
    //console.log(isLocal)
}

function displayLicense() {
    document.getElementById("license-container").setAttribute("visibility", "true");
    document.getElementsByTagName("body")[0].setAttribute("visibility", "soft");
    window.onclick = hideLicense;
}

function hideLicense(event) {
    if(event.target == document.getElementById("license-container")) {
	document.getElementById("license-container").setAttribute("visibility", "false");
	document.getElementsByTagName("body")[0].setAttribute("visibility", "hard");
	window.onclick = null;
    }
}

function displayHelp() {
    document.getElementById("help-container").setAttribute("visibility", "true");
    document.getElementById("content").setAttribute("visibility", "hidden");
    document.getElementById("help-close").addEventListener("click", hideHelp);
}

function hideHelp() {
    document.getElementById("help-container").setAttribute("visibility", "false");
    document.getElementById("content").removeAttribute("visibility");
}

function pickColor() {
    var picker = document.getElementById('color-picker');
    picker.value = window.color;
    picker.setAttribute("visibility", "visible");

    document.getElementById("color").removeEventListener('click', pickColor);
    document.getElementById("color").addEventListener('click', colorPicked);
}

function colorPicked(event) {
    var picker = document.getElementById("color-picker");
    var color = document.getElementById("color");

    if(event.target == picker || event.target == color) {
	picker.setAttribute("visibility", "none");

	color.removeEventListener('click', colorPicked);
	color.addEventListener('click', pickColor);
	color.style.color = picker.value;
	if(color.style.color == picker.value && window.color != picker.value) {
	    window.color = picker.value;
	    draw();
	}
	else
	    color.style.color = window.color;
    }
}

class Data {
    constructor(entries) {
	this.maxHeadlineId = this.setId(entries);
	entries.forEach(entry => this.setParent(entry, null));

	this.tagsCount = this.collectTags(entries);
	this.tags = Array.from(this.tagsCount).sort((lhs,rhs) => lhs > rhs).reduce((tags, [tag,_]) => tags.add(tag), new Set());
	this.tagsColor = Array.from(this.tags).reduce((colors, tag) => colors.set(tag, stringToColor(tag)), new Map());

	this.headlines = flattenHeadlines(entries);

	this.headlines.desc.forEach((headline,id) => {if(headline.parent != null) this.headlines.desc[headline.parent].children.push(id)});

	([this.firstDate, this.lastDate] =
	 this.headlines.data.reduce(([first, last], {entries}) =>
				    entries.reduce(([first, last], {start, end}) => [first.isBefore(moment(start)) ? first : moment(start),
										     last.isAfter(moment(end)) ? last : moment(end)],
						   [first, last]),
				    [moment(), moment(0)])
	 .map(moment => moment.toDate()));

	this.selectedHeadlines = new Set();
	this.foldedHeadlines = new Set();

	this.current = {
	    filter: null,
	    day: [],
	    calendar: [],
	    totalTime: 0,
	    daysCount: {days:0, weekdays: 0}
	}

	this.selectAll();

	console.log(this);
    }

    setId(entries) {
	const reduce = (id, entry) => entry.subentries.reduce(reduce, (entry.id = id) + 1);

	return entries.reduce(reduce, 0);
    }

    setParent(entry, parentId) {
	var self = this;
	entry.parentId = parentId;
	entry.subentries.forEach(subentry => self.setParent(subentry, entry.id));
    }

    collectTags(entries) {
	function searchTags(map, entry) {
	    if(entry.hasOwnProperty('tags')) {
		function countTags(tags, tag) {
		    var count = tags.get(tag);

		    if(count === undefined)
			count = 0;
		    else
			count = count.max;

		    tags.set(tag, {current: 0, max: count + 1});

		    return tags;
		}

		Array.from(entry.tags).reduce(countTags, map);
	    }

	    return entry.subentries.reduce(searchTags, map);
	}

	return entries.reduce(searchTags, new Map());
    }

    selectAll() {
	this.flipHeadlines();
	this.flipTags();
    }

    flipHeadlines(onOff) {
	var fill = onOff == null ? this.selectedHeadlines.size == 0 : onOff;
	if(fill)
	    d3.range(0, this.maxHeadlineId).forEach(task_id => this.selectedHeadlines.add(task_id));
	else
	    this.selectedHeadlines.clear();
	return fill;
    }

    foldHeadline(headline) {
	if(this.foldedHeadlines.has(headline.id))
	    this.foldedHeadlines.delete(headline.id);
	else
	    this.foldedHeadlines.add(headline.id);
    }

    isAnyAncestorFolded(headline) {
	return headline.parent != null
	    && (this.foldedHeadlines.has(this.headlines.desc[headline.id].parent)
		|| this.isAnyAncestorFolded(this.headlines.desc[headline.parent]));
    }

    areAllChildrenSelected(headline) {
	return headline.children.reduce((selected, id) =>
					selected
					&& this.selectedHeadlines.has(id)
					&& this.areAllChildrenSelected(this.headlines.desc[id]),
					true);
    }

    flipTags() {
	var clear = this.isAnyTagSelected();
	this.tags.forEach(tag => this.flipTag(tag, !clear));
	return clear;
    }

    flipTag(tag, onOff) {
	var count = this.tagsCount.get(tag);
	count.current = onOff ? count.max : 0;
	this.tagsCount.set(tag, count);
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

    toggleTag(tag, onOff) {
	var count = this.tagsCount.get(tag);
	if(onOff)
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
	if(tag == null) {
	    return this.isAnyTagSelected() ? 'black' : 'white';
	}
	else
	    return this.isTagSelected(tag) || force ? '#eeeeee' : this.getColorOfTag(tag);
    }

    getBackgroundColorOf(tag, force = false) {
	if(tag == null) {
	    return this.isAnyTagSelected() ? '#eeeeee' : 'black';
	}
	return this.isTagSelected(tag) || force ? this.getColorOfTag(tag) : '#eeeeee';
    }
}

function readFile(event) {
    var reader = new FileReader();

    reader.onloadend = e => readData(e.target.result);
    reader.readAsText(event.target.files[0]);
}

function readData(input) {
    // Prevent the 'setDate' from triggering a 'select' when reloading a file
    window.startingDatePicker.config({ onSelect: null });
    window.endingDatePicker.config({ onSelect: null });

    parse.entries = [];
    d3.csvParse(input, parse);

    window.data = new Data(parse.entries);

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

    drawOnFirstGlanceChange();
}

function parse(data) {

    ['task', 'parents', 'category', 'start', 'end'].forEach(column => {
	if(!data.hasOwnProperty(column)) {
	    alert("Cannot find '" + column + "' column.");
	    throw "Cannot find '" + column + "' column.";
	}
    });

    var parents = new Array(data.category)
	.concat(data.parents.split('/').filter(value => 0 < value.length))
	.concat(new Array(data.task));

    var entries = parse.entries;
    var entry;

    for(let i = 0; i < parents.length; i++) {
	var parent = parents[i];

	entry = entries.find(element => element.name == parent);

	if(entry === undefined) {
	    entries.push({name: parent, depth: i, subentries: [], entries: []});

	    entries.sort((a,b) => a.hasOwnProperty('name') && b.hasOwnProperty('name') ? a.name.localeCompare(b.name) : true);

	    entry = entries.find(element => element.name == parent);
	}

	if(i + 1 < parents.length)
	    entries = entry.subentries;
    }

    if(data.hasOwnProperty('tags')) {
	data.tags = new Set(data.tags.split(':').filter(tag => 0 < tag.length));

	if(!entry.hasOwnProperty('tags'))
	    entry.tags = data.tags;
	else
	    data.tags.forEach(tag => entry.tags.add(tag));
    }

    if(!entry.hasOwnProperty('effort') && data.hasOwnProperty('effort'))
	entry.effort = data.effort;

    if(!entry.hasOwnProperty('ishabit') && data.hasOwnProperty('ishabit'))
	entry.ishabit = data.ishabit;

    const start = new Date(data.start);
    const end = new Date(data.end);

    if(!moment(start).isBefore(end))
	alert("Not adding '" + entry.name + "'[" + start + " => " + end + "].");

    entry.entries.push({start:start, end:end});
}

function drawOnAverageChange() {
    draw(['headlines', 'calendar']);
}

function drawOnDayPaceChange() {
    var dayPace = parseInt(document.getElementById('day-pace').value);

    if(dayPace <= 0 || 120 < dayPace) {
	document.getElementById('day-pace').value = window.defaultStep;
	dayPace = window.defaultStep;
    }

    draw(['day']);
}

function drawOnFirstGlanceChange() {
    draw(['calendar']);
}

function filterTasks(flattenedTasks, filter) {
    return flattenedTasks.reduce((result, entry) => {
	Array.prototype.push.apply(result, filter(entry));
	return result;
    }, []);
}

function drawAll() {
    draw();
}

function draw(elements = ['day', 'headlines', 'calendar']) {

    var averagePerDay = parseInt(document.getElementById('average-hours').value) * 60
	+ parseInt(document.getElementById('average-minutes').value);

    var dayPace = parseInt(document.getElementById('day-pace').value);

    var displayWeekends = document.querySelector('#display-weekends').checked;
    var weekendsAsBonus = document.querySelector('#weekends-as-bonus').checked;

    var hasFirstGlanceWeekdays = document.querySelector('#first-glance-weekdays').checked;
    var hasFirstGlanceMonths = document.querySelector('#first-glance-months').checked;
    var hasFirstGlanceYears = document.querySelector('#first-glance-years').checked;

    var startingDate = window.startingDatePicker.getMoment().format('YYYY-MM-DD');
    var endingDate = window.endingDatePicker.getMoment().format('YYYY-MM-DD');

    window.data.current.filter = createSplittingFilter(startingDate, endingDate);

    if(elements.includes('calendar')) {
	window.data.current.calendar = computeCalendarDurations(window.data.headlines.data, window.data.selectedHeadlines, window.data.current.filter);

	window.data.current.daysCount = extractDaysInfo(window.data.current.calendar);
    }

    if(elements.includes('day')) {
	window.data.current.day = computeDayDurations(window.data.headlines.data, dayPace, window.data.selectedHeadlines, window.data.current.filter);
    }

    [window.data.current.totalTime, window.data.current.headlines] = computeHeadlinesDurations(window.data.headlines.data, window.data.selectedHeadlines, window.data.current.filter);

    console.log(window.data);

    drawSelection(window.data.current.totalTime, displayWeekends ? window.data.current.daysCount.days : window.data.current.daysCount.weekdays, averagePerDay, displayWeekends ? window.data.current.daysCount.days - window.data.current.daysCount.weekdays : 0);

    if(elements.includes('day'))
	drawDay(window.data.current.day, dayPace,
		weekendsAsBonus ? window.data.current.daysCount.weekdays : window.data.current.daysCount.days,
		window.data.current.totalTime,
		window.color);

    if(elements.includes('headlines'))
	drawHeadlines(window.data.current.headlines, window.data.current.totalTime, averagePerDay);

    if(elements.includes('calendar'))
	drawCalendar(window.data.current.calendar, averagePerDay,
		     displayWeekends, weekendsAsBonus,
		     hasFirstGlanceWeekdays, hasFirstGlanceMonths, hasFirstGlanceYears,
		     window.color);
}

function drawSelection(totalTime, days, averagePerDay, weekends) {
    const percentage = Math.floor(totalTime / days / averagePerDay * 100);

    d3.select('span#days').text(days).attr("title", weekends + " weekend days (" + Math.floor(weekends / (days + weekends) * 100).toFixed(0) + "%)");
    d3.select('span#hours').text(displayDuration(Math.floor(totalTime / days))).attr("title", percentage.toFixed(0) + "% of the targeted average");

    document.getElementById('days' ).style.color = window.color;
    document.getElementById('hours').style.color = window.color;
}

function drawDay(data, step, numberOfDays, totalTime, color) {
    document.getElementById('day').innerHTML = '';

    var sameMinuteDeviation = d3.sum(data) - totalTime;

    var cellSize = 16;
    if(step < window.defaultStep)
	cellSize /= (window.defaultStep / step);

    const interSize = 1;

    const palette = d3.scaleLinear().domain([0, step]).range(["white", color]);

    const day = d3.select("div#day").append("svg");

    day.attr('width', 120 + data.length * (cellSize + interSize))
	.attr('height', 40 + cellSize)
	.attr("transform", `translate(0,5)`);

    const days = day.append("g");

    const shift = 2;

    day.append("g").selectAll("rect")
	.data(data)
	.join("rect")
	.attr("width", cellSize).attr("height", cellSize)
	.attr("transform", (_,i) => `translate(${shift + i * (cellSize + interSize) + 20}, 0)`)
	.attr("fill", duration => palette(Math.floor(duration/numberOfDays)))
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

function drawHeadlines(desc, data, total, averagePerDay) {
    drawTags();
    drawBrowser(desc, data, total, averagePerDay);
}

function drawTags() {
    document.getElementById('tags').innerHTML = '';

    const xRadix = 15;
    const yRadix = 12;

    const characters = 4;//Cannot be less than 4 for 'None'

    const width = 15 * characters;
    const height = 30;

    const svg = d3.select('svg#tags')
	  .attr("width", 600).attr("height", height);

    const tag = svg.selectAll("g")
	  .data([null].concat(Array.from(window.data.tags).sort((lhs,rhs) => lhs[0] > rhs[0])))
	  .join("g")
	  .attr("transform", (_,i) => `translate(${i * width}, 0)`)
	  .on("click", tag => tag == null ? flipTags() : flipTag(tag));

    tag.append("rect")
	.attr("width", width).attr("height", height)
	.attr("rx", xRadix).attr("ry", yRadix)
	.attr("fill", tag => window.data.getBackgroundColorOf(tag));

    tag.append("text")
	.attr("transform", `translate(${width / 2}, 20)`)
	.text(tag => tag == null ? 'None' : tag.slice(0, characters))
	.attr("text-anchor", "middle")
	.attr("fill", tag => window.data.getColorOf(tag));
}

function drawBrowser(data, total, averagePerDay) {
    document.getElementById('browser').innerHTML = '';

    const xShift = 20;
    const yShift = 33;
    const yOffset = 20;

    const svg = d3.select("svg#browser")
	  .attr("width", 600).attr("height", yOffset + (window.data.headlines.desc.length + 1) * yShift)

    const unfolded = window.data.headlines.desc.filter(headline => !window.data.isAnyAncestorFolded(headline));

    const g = svg.selectAll('g')
	  .data(unfolded)
	  .join('g')
	  .attr("transform", ({depth}, i) =>
		`translate(${depth * xShift},${yOffset + (i + 1) * yShift})`)

    const text = g.append("text")

    text.append("tspan")
	.text(headline => headline.children.length == 0 ? ""
	      : (window.data.areAllChildrenSelected(headline) ?
		 (window.data.foldedHeadlines.has(headline.id) ? "▸" : "▾")
		 : (window.data.foldedHeadlines.has(headline.id) ? "▹" : "▿")))
	.attr("class", "folder")
	.on("click", foldHeadline);

    text.append("tspan")
	.attr("dx", 5)
	.attr("dy", 1)
	.text(({name}) => name)
	.attr("class", "headline")
	.attr("headline-id", ({id}) => id)
	.attr("is-selected", ({id}) => window.data.selectedHeadlines.has(id))
	.attr("is-habit", ({ishabit}) => ishabit ? "true" : "false")
	.on("click", flipHeadline);

    text.append("tspan")
	.attr("dx", 10)
	.text(({id}) => displayLongDuration(data[id].total))
	.append("title").text(({id}) => data[id].percentage.toFixed(1) + "%");

    const xRadix = 15;
    const yRadix = 12;

    const characters = 4;

    const width = 15 * characters;
    const height = 30;

    const tags = g.filter(headline => 0 < headline.tags.size)
	  .append("g")
	  .attr("transform", `translate(300, -21)`)
	  .selectAll("g")
	  .data(headline => Array.from(headline.tags).sort((lhs, rhs) => lhs > rhs)
		.map(tag => [window.data.selectedHeadlines.has(headline.id), tag]))
	  .enter();

    tags.append("rect")
	.attr("transform", (_, i) => `translate(${i * width}, 0)`)
	.attr("width", width).attr("height", height)
	.attr("ry", xRadix).attr("rx", yRadix)
	.attr("fill", ([selected, tag]) => window.data.getBackgroundColorOf(tag, selected));

    tags.append("text")
	.attr("transform", (_, i) => `translate(${i * width + width / 2}, 20)`)
	.text(([_,tag]) => tag)
	.attr("text-anchor", "middle")
	.attr("fill", ([selected, tag]) => window.data.getColorOf(tag, selected));

    const none = d3.select("svg#browser")
	  .insert("g", ":first-child")
	  .attr("transform", `translate(0,${yOffset})`)
	  .insert("text");

    none.insert("tspan")
	.text("None")
	.attr("class", "headline")
	.attr("is-selected", window.data.selectedHeadlines.size == 0)
	.on("click", headlinesOff);

    none.insert("tspan")
	.attr("dx", 10)
	.text("/");

    none.insert("tspan")
	.attr("dx", 10)
	.text("All")
	.attr("class", "headline")
	.attr("is-selected", window.data.selectedHeadlines.size == window.data.headlines.desc.length)
	.on("click", headlinesOn);

    none.insert("tspan")
	.attr("dx", 10)
	.text(displayLongDuration(total))
}

function drawCalendar(data, averagePerDay,
		      displayWeekends, weekendsAsBonus,
		      hasFirstGlanceWeekdays, hasFirstGlanceMonths, hasFirstGlanceYears,
		      color) {
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

    const palette = d3.scaleLinear().domain([0,averagePerDay]).range(["white", color]);

    const meanPerDay = days => d3.sum(days, day => sumDay(day)) / countDays(days);
    const sigmForDay = days => d3.deviation(days, day => sumDay(day));
    const ellipseRadix = (days, radix, max) => {
	const sigma = sigmForDay(days);
	return Math.min(radix  * (sigma == 0 ? 1 : meanPerDay(days) / sigma), max);
    }

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
	.attr("fill", ({values:days}) => palette(meanPerDay(days)))
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
	.attr("fill", ({values:days}) => palette(meanPerDay(days)))
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
	.attr("fill", ({values:days}) => palette(meanPerDay(days)))
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
	.attr("fill", ({"duration":duration}) => palette(duration))
	.append("title").text(({"date":date,"duration":duration}) => moment(date).format('YYYY-MM-DD') + " " + displayDuration(duration));
}

function selectHeadline(headline) {
    window.data.selectedHeadlines.add(headline.id);
    headline.tags.forEach(tag => window.data.toggleTag(tag, true));
    headline.children.forEach(id => selectHeadline(window.data.headlines.desc[id]));
}

function unselectHeadline(headline) {
    window.data.selectedHeadlines.delete(headline.id);
    headline.tags.forEach(tag => window.data.toggleTag(tag, false));
    headline.children.forEach(id => unselectHeadline(window.data.headlines.desc[id]));
}

function flipHeadline(headline) {
    if(window.data.selectedHeadlines.has(headline.id))
	unselectHeadline(headline);
    else
	selectHeadline(headline);

    draw();
}

function headlinesOff() {
    flipHeadlines(false);
}

function headlinesOn() {
    flipHeadlines(true);
}

function flipHeadlines(onOff) {
    if(window.data.flipHeadlines(onOff) ^ window.data.isAnyTagSelected())
	window.data.flipTags();

    draw();
}

function foldHeadline(headline) {
    window.data.foldHeadline(headline);

    draw();
}

function forAllHeadlinesWithTagDo(tag, action) {
    window.data.headlines.desc.forEach(headline => headline.tags.has(tag) ? action(headline.id) : null);
}

function flipTag(tag) {
    if(window.data.isTagSelected(tag)) {
	window.data.flipTag(tag, false);
	forAllHeadlinesWithTagDo(tag, id => window.data.selectedHeadlines.delete(id));
    }
    else {
	window.data.flipTag(tag, true);
	forAllHeadlinesWithTagDo(tag, id => window.data.selectedHeadlines.add(id));
    }

    draw();
}

function forAllHeadlinesWithATagDo(action) {
    window.data.headlines.desc.forEach(headline => 0 < headline.tags.size ? action(headline.id) : null);
}

function flipTags() {
    if(window.data.flipTags())
	forAllHeadlinesWithATagDo(id => window.data.selectedHeadlines.delete(id));
    else
	forAllHeadlinesWithATagDo(id => window.data.selectedHeadlines.add(id));

    draw();
}
