const tryUsingWorkers = true;
const debugOn = false;
const demoOn = true;

window.onload = async function () {

    window.color = "green";
    window.defaultDayPace = 15;
    window.maxPerDay = 10 * 60;
    window.maxHeadlineLength = 40;

    window.toDraw = new Set();

    // Loading local files will fail! so we use a default _blank target
    // to open them locally and remove the href when fetched from a server
    // using an onclick handler to display the downloaded content.
    load('./license.html')
	.then(content => {
	    document.getElementById('license-content').innerHTML = content;
	    document.getElementById('license').addEventListener('click', displayLicense);
	    document.getElementById('license').removeAttribute('href');
	})
	.catch(reason => console.log(reason));

    load('./help.html')
	.then(content => {
	    document.getElementById('help-content').innerHTML = content;
	    document.getElementById('help').addEventListener('click', displayHelp);
	    document.getElementById('help').removeAttribute('href');
	})
	.catch(reason => console.log(reason));

    document.getElementById('color').style.color = window.color;
    document.getElementById('color').addEventListener('click', pickColor);
    document.getElementById('color-picker').addEventListener('focusout', colorPicked);

    d3.select('#average-hours').selectAll('option').data(d3.range(0,24)).enter()
	.append('option').attr('value', hour => hour).text(hour => displayTwoDigits(hour));
    document.getElementById('average-hours').value = "7";
    document.getElementById('average-hours').addEventListener('change', onAverageChange);
    d3.select('#average-minutes').selectAll('option').data(d3.range(0,60)).enter()
	.append('option').attr('value', minutes => minutes).text(minutes => displayTwoDigits(minutes));
    document.getElementById('average-minutes').value = "0";
    document.getElementById('average-minutes').addEventListener('change', onAverageChange);

    document.getElementById('day-pace').value = window.defaultDayPace;
    document.getElementById('day-pace').addEventListener('change', onDayPaceChange);

    document.getElementById('display-weekends').addEventListener('change', onWeekendsChange);
    document.getElementById('weekends-as-bonus').addEventListener('change', onWeekendsAsBonusChange);

    document.getElementById('first-glance').addEventListener('click', onToggleFirstGlance);
    document.getElementById('first-glance-weekdays').addEventListener('change', onFirstGlanceChange);
    document.getElementById('first-glance-months').addEventListener('change', onFirstGlanceChange);
    document.getElementById('first-glance-years').addEventListener('change', onFirstGlanceChange);

    document.getElementById('file-input').addEventListener('change', readFile, false);

    window.startingDatePicker = new Pikaday({ field: document.getElementById('starting-date') });
    window.endingDatePicker = new Pikaday({ field: document.getElementById('ending-date') });

    /* WORKERS */
    if(tryUsingWorkers && typeof(Worker) !== undefined && !window.location.href.startsWith('file:///')) {
	const url = Array.from(document.getElementsByTagName('script')).reduce(
	    (url, element) =>
		element.attributes.getNamedItem('src') != null
		&& element.attributes.getNamedItem('src').value.search('moment.js') != -1 ?
		element.attributes.getNamedItem('src').value :
		url,
		'');

	if(debugOn) console.log("Worker loading: " + url);

	const from = 'worker.js' + '?' + encodeURI(url);

	window.worker = { day:       new Worker(from, {name: 'day'}),
			  headlines: new Worker(from, {name: 'headlines'}),
			  calendar:  new Worker(from, {name: 'calendar'}) };

	var abort = false;

	window.worker.day.onerror = _ => abort = true;
	window.worker.headlines.onerror = _ => abort = true;
	window.worker.calendar.onerror = _ => abort = true;

	if(abort == true)
	    window.worker = null;
	else {
	    if(debugOn) console.log("Worker loaded.");

	    window.worker.day.      onmessage = event => collectWorkThenDisplay(event.data, 'day');
	    window.worker.headlines.onmessage = event => collectWorkThenDisplay(event.data, 'headlines');
	    window.worker.calendar. onmessage = event => collectWorkThenDisplay(event.data, 'calendar');
	}
    }
    else
	window.worker = null;
    /* WORKERS */

    /* DEMO */
    if(demoOn) {
	const projects = randomProjects({headlines:20,
					 maxDepth: 4, maxChildren: 4,
					 tagsProbability: 0.35, maxTags: 4,
					 effortProbability: 0.25, maxEffort: 1000 * 60,
					 isHabitProbability: 0.2});

	const activityRandomizer = createActivityRandomizer({beforeWorkProbability: 0.005,
							     morning: 8, morningProbability: 0.8,
							     lunch: 12, lunchProbability: 0.2,
							     afternoon: 13, afternoonProbability: 0.7,
							     evening: 17, eveningProbability: 0.1,
							     weekendShift: 5});

	const data = randomData(
	    projects,
	    moment().subtract(3, 'years').format('YYYY-MM-DD'), moment().format('YYYY-MM-DD'),
	    activityRandomizer, 100);

	readData(data.join('\n'));
    }
    /* DEMO */
}

function pickColor() {
    const picker = document.getElementById('color-picker');
    picker.value = window.color;
    picker.setAttribute('visibility', "visible");

    const color = document.getElementById('color');
    color.removeEventListener('click', pickColor);
    color.addEventListener('click', colorPicked);
}

function colorPicked(event) {
    var picker = document.getElementById('color-picker');
    var color = document.getElementById('color');

    if(event.target == picker || event.target == color) {
	picker.setAttribute('visibility', "none");

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

function displayLicense() {
    document.getElementById('license-container').setAttribute('visibility', "true");
    document.getElementsByTagName('body')[0].setAttribute('visibility', "soft");
    window.onclick = hideLicense;
}

function hideLicense(event) {
    const container = document.getElementById('license-container');

    if(event.target == container) {
	container.setAttribute('visibility', "false");
	document.getElementsByTagName('body')[0].setAttribute('visibility', "hard");
	window.onclick = null;
    }
}

function displayHelp() {
    document.getElementById('help-container').setAttribute('visibility', "true");
    document.getElementById('content').setAttribute('visibility', "hidden");
    document.getElementById('help-close').addEventListener('click', hideHelp);
}

function hideHelp() {
    document.getElementById('help-container').setAttribute('visibility', "false");
    document.getElementById('content').removeAttribute('visibility');
}

class Data {
    constructor(entries) {
	this.setId(entries);
	entries.forEach(entry => this.setParent(entry, null));

	this.tags = {};
	this.tags.count = this.collectTags(entries);
	this.tags.list = Array.from(this.tags.count).sort((lhs, rhs) => lhs > rhs).reduce((tags, [tag,_]) => tags.add(tag), new Set());
	this.tags.color = Array.from(this.tags.list).reduce((colors, tag) => colors.set(tag, stringToColor(tag)), new Map());

	this.headlines = flattenHeadlines(entries);// => {desc,data}

	this.headlines.desc.filter(headline => headline.parent != null)
	    .forEach(headline => this.headlines.desc[headline.parent].children.push(headline.id));

	([this.firstDate, this.lastDate] =
	 this.headlines.data.reduce(
	     ([first, last], {entries}) => entries.reduce(
		 ([first, last], {start, end}) => [first.isBefore(moment(start)) ? first : moment(start),
						   last.isAfter(moment(end)) ? last : moment(end)],
		 [first, last]),
	     [moment(), moment()])
	 .map(moment => moment.toDate()));

	this.selectedHeadlines = new Set();
	this.foldedHeadlines = new Set();

	this.current = {config: null,
			day: null,
			calendar: null, daysCount: null,
			headlines: null, totalTime: null};
	//
	this.selectAll();
    }

    setId(entries) {
	const reduce = (id, entry) => entry.subentries.reduce(reduce, (entry.id = id) + 1);

	return entries.reduce(reduce, 0);
    }

    setParent(entry, parentId) {
	const self = this;
	entry.parentId = parentId;
	entry.subentries.forEach(subentry => self.setParent(subentry, entry.id));
    }

    collectTags(entries) {
	function searchTags(map, entry) {
	    if(entry.hasOwnProperty('tags')) {
		function countTags(tags, tag) {
		    var count = tags.get(tag);

		    count = count === undefined ? 0 : count.max;

		    return tags.set(tag, {current: 0, max: count + 1});
		}

		Array.from(entry.tags).reduce(countTags, map);
	    }

	    return entry.subentries.reduce(searchTags, map);
	}

	return entries.reduce(searchTags, new Map());
    }

    selectAll() {
	this.flipHeadlines(true);
    }

    selectHeadline(headline) {
	this.selectedHeadlines.add(headline.id);
	headline.tags.forEach(tag => this.toggleTag(tag, true));
	headline.children.forEach(id => this.selectHeadline(this.headlines.desc[id]));
    }

    unselectHeadline(headline) {
	this.selectedHeadlines.delete(headline.id);
	headline.tags.forEach(tag => this.toggleTag(tag, false));
	headline.children.forEach(id => this.unselectHeadline(this.headlines.desc[id]));
    }

    flipHeadline(headline) {
	if(this.selectedHeadlines.has(headline.id))
	    this.unselectHeadline(headline);
	else
	    this.selectHeadline(headline);
    }

    flipHeadlines(on) {
	if(on)
	    this.headlines.desc.forEach(headline => this.selectHeadline(headline));
	else
	    this.headlines.desc.forEach(headline => this.unselectHeadline(headline));
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
	return headline.children.reduce((selected, childId) =>
					selected
					&& this.selectedHeadlines.has(childId)
					&& this.areAllChildrenSelected(this.headlines.desc[childId]),
					true);
    }

    flipTags() {
	if(this.isAnyTagSelected())
	    this.headlines.desc.filter(headline => 0 < headline.tags.size)
	    .forEach(headline => this.unselectHeadline(headline));
	else
	    this.headlines.desc.filter(headline => 0 < headline.tags.size)
	    .forEach(headline => this.selectHeadline(headline));
    }

    flipTag(tag) {
	if(!this.isTagSelected(tag))
	    this.headlines.desc.filter(headline => headline.tags.has(tag))
	    .forEach(headline => this.selectHeadline(headline));
	else
	    this.headlines.desc.filter(headline => headline.tags.has(tag))
	    .forEach(headline => this.unselectHeadline(headline));
    }

    isTagSelected(tag) {
	const count = this.tags.count.get(tag);
	return count.current == count.max;
    }

    isAnyTagSelected() {
	var any = false;
	this.tags.count.forEach(({current, max}, _) => any |= current == max);
	return any;
    }

    toggleTag(tag, onOff) {
	const count = this.tags.count.get(tag);

	if(onOff)
	    count.current = Math.min(count.current + 1, count.max);
	else
	    count.current = Math.max(count.current - 1, 0);
    }

    getColorOfTag(tag) {
	if(this.tags.color.has(tag))
	    return this.tags.color.get(tag);
	else
	    return '#eeeeee';
    }

    getColorOf(tag, force = false) {
	if(tag == null)
	    return this.isAnyTagSelected() ? 'black' : 'white';
	else
	    return this.isTagSelected(tag) || force ? '#eeeeee' : this.getColorOfTag(tag);
    }

    getBackgroundColorOf(tag, force = false) {
	if(tag == null)
	    return this.isAnyTagSelected() ? '#eeeeee' : 'black';
	else
	    return this.isTagSelected(tag) || force ? this.getColorOfTag(tag) : '#eeeeee';
    }
}

function readFile(event) {
    const reader = new FileReader();

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
				       onSelect: onStartingDateChange });

    window.endingDatePicker.config({ minDate: window.data.firstDate,
				     maxDate: window.data.lastDate,
				     onSelect: onEndingDateChange });

    if(window.worker != null) {
	const config = window.data.current.config = collectConfig();

	window.worker.day      .postMessage({data: window.data.headlines.data, config: config});
	window.worker.headlines.postMessage({data: window.data.headlines.data, config: config});
	window.worker.calendar .postMessage({data: window.data.headlines.data, config: config});
    }
    else
	draw();
}

function parse(data) {

    ['task', 'parents', 'start', 'end'].forEach(column => {
	if(!data.hasOwnProperty(column)) {
	    alert("Cannot find '" + column + "' column.");
	    throw "Cannot find '" + column + "' column.";
	}
    });

    const parents = new Array()
	.concat(data.parents.split('/').filter(value => 0 < value.length))
	.concat(new Array(data.task));

    var entries = parse.entries;
    var entry;

    for(let i = 0; i < parents.length; i++) {
	const parent = parents[i];

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

    if(!entry.hasOwnProperty('effort') && data.hasOwnProperty('effort') && 0 < data.effort.length)
	entry.effort = moment.duration(data.effort).asMinutes();

    if(!entry.hasOwnProperty('ishabit') && data.hasOwnProperty('ishabit') && data.ishabit == 't')
	entry.ishabit = true;

    const start = new Date(data.start);
    const end = new Date(data.end);

    if(!moment(start).isBefore(end))
	alert("Not adding '" + entry.name + "'[" + start + " => " + end + "].");

    entry.entries.push({start:start, end:end});
}

function onStartingDateChange() {
    window.endingDatePicker.config({minDate: window.startingDatePicker.getDate()});
    draw();
}

function onEndingDateChange() {
    window.startingDatePicker.config({maxDate: window.endingDatePicker.getDate()});
    draw();
}

function onToggleFirstGlance() {
    var value = document.querySelector('#first-glance-weekdays').checked
	|| document.querySelector('#first-glance-months').checked
	|| document.querySelector('#first-glance-years').checked;

    document.querySelector('#first-glance-weekdays').checked = !value;
    document.querySelector('#first-glance-months').checked = !value;
    document.querySelector('#first-glance-years').checked = !value;

    onFirstGlanceChange();
}

function onAverageChange() {
    draw(['selection', 'headlines', 'calendar']);
}

function onDayPaceChange() {
    var dayPace = parseInt(document.getElementById('day-pace').value);

    if(dayPace <= 0 || 120 < dayPace) {
	document.getElementById('day-pace').value = window.defaultDayPace;
	dayPace = window.defaultDayPace;
    }

    draw(['day']);
}

function onWeekendsChange() {
    draw();
}

function onWeekendsAsBonusChange() {
    if(!document.getElementById('display-weekends').checked)
	draw();
}

function onFirstGlanceChange() {
    draw(['calendar']);
}

function collectConfig() {
    const displayWeekends = document.querySelector('#display-weekends').checked;
    const weekendsAsBonus = document.querySelector('#weekends-as-bonus').checked

    return {
	averagePerDay: parseInt(document.getElementById('average-hours').value) * 60 + parseInt(document.getElementById('average-minutes').value),
	dayPace: parseInt(document.getElementById('day-pace').value),

	displayWeekends: displayWeekends,
	weekendsAsBonus: weekendsAsBonus,

	hasFirstGlanceWeekdays: document.querySelector('#first-glance-weekdays').checked,
	hasFirstGlanceMonths: document.querySelector('#first-glance-months').checked,
	hasFirstGlanceYears: document.querySelector('#first-glance-years').checked,

	filter: {
	    startingDate: window.startingDatePicker.getMoment().format('YYYY-MM-DD'),
	    endingDate: window.endingDatePicker.getMoment().format('YYYY-MM-DD'),
	    headlines: window.data.selectedHeadlines,
	    countWeekends: displayWeekends || weekendsAsBonus
	}
    };
}

function drawWith(elements = ['selection', 'day', 'headlines', 'calendar'], action = null) {
    draw(elements);
}

function drawAllWith() {
    draw();
}

function collectWorkThenDisplay(data, worker) {

    if(worker == 'day')
	window.data.current.day = data;
    else if(worker == 'headlines')
	[window.data.current.totalTime, window.data.current.headlines] = data;
    else if(worker == 'calendar')
	[window.data.current.calendar, window.data.current.daysCount] = data;

    var toDisplay = [];

    if(window.data.current.daysCount != null && window.data.current.totalTime != null)
	toDisplay.push('selection')

    if(window.data.current.day != null && window.data.current.daysCount != null && window.data.current.totalTime != null)
	toDisplay.push('day');

    if(worker == 'headlines' || worker == 'calendar')
	toDisplay.push(worker);

    if(0 < toDisplay.length) {
	display(toDisplay);
	toDisplay.forEach(display => window.toDraw.delete(display));
    }
}

function draw(elements = ['selection', 'day', 'headlines', 'calendar']) {

    const config = window.data.current.config = collectConfig();

    if(window.worker != null) {
	elements.forEach(element => window.toDraw.add(element));

	if(elements.includes('day')) {
	    window.worker.day.postMessage({config: config});
	    window.data.current.day = null;
	}

	if(elements.includes('headlines')) {
	    window.worker.headlines.postMessage({config: config});
	    window.data.current.totalTime = null;
	    window.data.current.headlines = null;
	}

	if(elements.includes('calendar')) {
	    window.worker.calendar.postMessage({config: config});
	    window.data.current.calendar = null;
	    window.data.current.daysCount = null;
	}
    }
    else {
	if(elements.includes('day'))
	    window.data.current.day = computeDayDurations(window.data.headlines.data, window.data.current.config.dayPace, config.filter);

	if(elements.includes('headlines'))
	    [window.data.current.totalTime, window.data.current.headlines] = computeHeadlinesDurations(window.data.headlines.data, config.filter);

	if(elements.includes('calendar'))
	    [window.data.current.calendar, window.data.current.daysCount] = computeCalendarDurations(window.data.headlines.data, config.filter);

	display(elements);
    }
}

function display(elements = ['selection', 'day', 'headlines', 'calendar']) {
    if(debugOn) console.log(elements.join(' '));
    if(debugOn) console.log(window.data);

    const config = window.data.current.config;

    if(elements.includes('selection'))
	drawSelection(window.data.current.totalTime,
		      config.averagePerDay,
		      config.displayWeekends ? window.data.current.daysCount.days : window.data.current.daysCount.weekdays,
		      config.displayWeekends ? window.data.current.daysCount.days - window.data.current.daysCount.weekdays : 0);

    if(elements.includes('day'))
	drawDay(window.data.current.day, config.dayPace,
		config.displayWeekends ? window.data.current.daysCount.days : window.data.current.daysCount.weekdays,
		window.data.current.totalTime);

    if(elements.includes('headlines'))
	drawHeadlines(window.data.current.headlines, window.data.current.totalTime, config.averagePerDay);

    if(elements.includes('calendar'))
	drawCalendar(window.data.current.calendar, config.averagePerDay,
		     config.displayWeekends, config.weekendsAsBonus,
		     config.hasFirstGlanceWeekdays, config.hasFirstGlanceMonths, config.hasFirstGlanceYears,
		     window.color);
}

function drawSelection(totalTime, averagePerDay, days, weekends) {
    d3.select('#days').text(days).attr('title', "including " + weekends + " weekend days (" + Math.floor(weekends / (days + weekends) * 100).toFixed(0) + "%)");
    d3.select('#hours').text(displayDuration(Math.floor(totalTime / days))).attr('title', Math.floor(totalTime / days / averagePerDay * 100).toFixed(0) + "% of the targeted average");

    document.getElementById('days' ).style.color = window.color;
    document.getElementById('hours').style.color = window.color;
}

function drawDay(data, dayPace, numberOfDays, totalTime) {
    document.getElementById('day').innerHTML = '';

    var sameMinuteDeviation = d3.sum(data) - totalTime;

    var cellSize = 16;
    if(dayPace < window.defaultDayPace)
	cellSize /= (window.defaultDayPace / dayPace);

    const interSize = 1;

    const palette = d3.scaleLinear().domain([0, dayPace]).range(['white', window.color]);

    const day = d3.select('div#day').append('svg');

    day.attr('width', 120 + data.length * (cellSize + interSize))
	.attr('height', 40 + cellSize)
	.attr('transform', `translate(0,5)`);

    const shift = 2;

    day.append('g').selectAll('rect')
	.data(data)
	.join('rect')
	.attr('width', cellSize).attr('height', cellSize)
	.attr('transform', (_, i) => `translate(${shift + i * (cellSize + interSize) + 20},0)`)
	.attr('fill', duration => palette(Math.min(dayPace, Math.floor(duration / numberOfDays))))
	.append('title')
	.text((duration, i) => {
	    const value = Math.min(dayPace, Math.floor(duration / numberOfDays));
	    const lastDayPace = 24 * 60 % dayPace;

	    return displayDuration(i * dayPace) + "-"
		+ displayDuration(i == data.length - 1 ? 0 : (i + 1) * dayPace) + " "
		+ displayDuration(value) + " "
		+ Math.floor((i == data.length - 1 && lastDayPace != 0 ? value / lastDayPace : value / dayPace) * 100).toFixed(0) + "%";
	});

    const hours = [...Array(25).keys()].filter(index => dayPace <= 20 ? true : index % Math.ceil(4 * dayPace / 60) == 0);

    day.append('g')
	.selectAll('line')
	.data(hours)
	.join('line')
	.attr('transform', i => `translate(${shift + (i == 24 ? data.length : i * 60 / dayPace) * (cellSize + interSize) + 20},30)`)
	.attr('stroke', "black")
	.attr('x1', 0).attr('x2', 0)
	.attr('y1', 0).attr('y2', -10);

    day.append('g').attr('class', 'hours')
	.selectAll('text')
	.data(hours)
	.join('text')
	.attr('transform', i => `translate(${shift + (i == 24 ? data.length : i * 60 / dayPace) * (cellSize + interSize) - 3},40)`)
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
	  .attr('width', 600).attr('height', height);

    const tag = svg.selectAll('g')
	  .data([null].concat(Array.from(window.data.tags.list).sort((lhs,rhs) => lhs[0] > rhs[0])))
	  .join('g')
	  .attr('transform', (_, i) => `translate(${i * width},0)`)
	  .on('click', tag => drawAllWith(tag == null ? window.data.flipTags() : window.data.flipTag(tag)));

    tag.append('rect')
	.attr('width', width).attr('height', height)
	.attr('rx', xRadix).attr('ry', yRadix)
	.attr('fill', tag => window.data.getBackgroundColorOf(tag));

    tag.append('text')
	.attr('transform', `translate(${width / 2},20)`)
	.text(tag => tag == null ? 'None' : tag.slice(0, characters))
	.attr('text-anchor', "middle")
	.attr('fill', tag => window.data.getColorOf(tag));
}

function drawBrowser(data, total, averagePerDay) {
    document.getElementById('browser').innerHTML = '';

    const xShift = 20;
    const yShift = 33;
    const yOffset = 20;

    const svg = d3.select('svg#browser')
	  .attr('width', 600).attr('height', yOffset + (window.data.headlines.desc.length + 1) * yShift)

    const unfolded = window.data.headlines.desc.filter(headline => !window.data.isAnyAncestorFolded(headline));

    const g = svg.selectAll('g')
	  .data(unfolded)
	  .join('g')
	  .attr('transform', ({depth}, i) =>
		`translate(${depth * xShift},${yOffset + (i + 1) * yShift})`)

    const text = g.append('text')

    text.filter(headline => headline.children.length != 0)
	.append('tspan')
	.text(headline => (window.data.areAllChildrenSelected(headline) ?
			   (window.data.foldedHeadlines.has(headline.id) ? "▸" : "▾")
			   : (window.data.foldedHeadlines.has(headline.id) ? "▹" : "▿")))
	.attr('class', "folder")
	.on('click', headline => drawWith(['headlines'], window.data.foldHeadline(headline)));

    var name = text.append('tspan')
	.attr('dx', 5)
	.attr('dy', 1)
	.text(({depth, name}) => window.maxHeadlineLength - 3 - (depth * xShift / 10) < name.length ?
	      name.substring(0, window.maxHeadlineLength - 3 - (depth * xShift / 10)) + "..." :
	      name)
	.attr('class', "headline")
	.attr('headline-id', ({id}) => id)
	.attr('is-selected', ({id}) => window.data.selectedHeadlines.has(id))
	.attr('is-habit', ({ishabit}) => ishabit ? "true" : "false")
	.on('click', headline => drawAllWith(window.data.flipHeadline(headline)));

    name.filter(({depth, name}) => window.maxHeadlineLength - 3 - (depth * xShift / 10) <= name.length)
	.append('title').text(({name}) => name);

    text.append('tspan')
	.attr('dx', 10)
	.text(({id}) => displayLongDuration(data[id].total, averagePerDay))
	.append('title').text(({id}) => data[id].percentage.toFixed(1) + "%");

    const effort = g.filter(headline => headline.effort !== undefined && headline.effort != 0)
	  .append('g')
	  .attr('transform', `translate(150,5)`);

    effort.append('title')
	.text(headline => Math.floor(data[headline.id].total / headline.effort * 100) + "% of the estimated " + displayLongDuration(headline.effort, averagePerDay) + " effort");

    const effortRadix = 20;
    const gaugePointerWidth = 3;

    effort.append('path')
	.attr('d', "M 0 0 a 10 10 0 1 1 " + 2 * effortRadix + " 0")
	.attr('fill', window.color);

    effort.append('circle')
	.attr('cx', effortRadix)
	.attr('r', gaugePointerWidth)
	.attr('fill', "white")

    effort.append('path')
	.attr('d', headline => {
	    var x = effortRadix;
	    var y = 0;
	    var ratio = Math.PI / 180;

	    if(data[headline.id].total < headline.effort) {
		ratio *= 90 * (data[headline.id].total / headline.effort);

		x += effortRadix * Math.cos(ratio);
		y += effortRadix * Math.sin(ratio);
	    }
	    else {
		ratio *= 75 * (Math.min(data[headline.id].total, 2 * headline.effort) / (2 * headline.effort));

		x -= effortRadix * Math.sin(ratio);
		y += effortRadix * Math.cos(ratio);
	    }

	    return  "M " + effortRadix + " 0 L " + x + " -" + y;
	})
	.attr('stroke', "white")
	.attr('stroke-width', gaugePointerWidth);

    const xRadix = 15;
    const yRadix = 12;

    const characters = 4;

    const width = 15 * characters;
    const height = 30;

    const tags = g.filter(headline => 0 < headline.tags.size)
	  .append('g')
	  .attr('transform', `translate(300,-20)`)
	  .selectAll('g')
	  .data(headline => Array.from(headline.tags).sort((lhs, rhs) => lhs > rhs)
		.map(tag => [window.data.selectedHeadlines.has(headline.id), tag]))
	  .enter();

    tags.append('rect')
	.attr('transform', (_, i) => `translate(${i * width},0)`)
	.attr('width', width).attr('height', height)
	.attr('ry', xRadix).attr('rx', yRadix)
	.attr('fill', ([selected, tag]) => window.data.getBackgroundColorOf(tag, selected));

    tags.append('text')
	.attr('transform', (_, i) => `translate(${i * width + width / 2},20)`)
	.text(([_,tag]) => tag)
	.attr('text-anchor', "middle")
	.attr('fill', ([selected, tag]) => window.data.getColorOf(tag, selected));

    const none = d3.select('svg#browser')
	  .insert('g', ":first-child")
	  .attr('transform', `translate(0,${yOffset})`)
	  .insert('text');

    none.insert('tspan')
	.text("None")
	.attr('class', "headline")
	.attr('is-selected', window.data.selectedHeadlines.size == 0)
	.on('click', _ => drawAllWith(window.data.flipHeadlines(false)));

    none.insert('tspan')
	.attr('dx', 10)
	.text("/");

    none.insert('tspan')
	.attr('dx', 10)
	.text("All")
	.attr('class', "headline")
	.attr('is-selected', window.data.selectedHeadlines.size == window.data.headlines.desc.length)
	.on('click', _ => drawAllWith(window.data.flipHeadlines(true)));

    none.insert('tspan')
	.attr('dx', 10)
	.text(displayLongDuration(total, averagePerDay));
}

function drawCalendar(data, averagePerDay,
		      displayWeekends, weekendsAsBonus,
		      hasFirstGlanceWeekdays, hasFirstGlanceMonths, hasFirstGlanceYears,
		      color) {
    document.getElementById('calendar').innerHTML = '';

    const weekdaysFormat = 'dddd';
    const monthFormat = 'MMM';

    const isWeekday = day => day != 6 && day != 7;

    var dayFilter;
    var weekdaysShift;
    if(displayWeekends) {
	dayFilter = day => true;
	weekdaysShift = day => 0;
    }
    else {
	dayFilter = day => isWeekday(day);
	weekdaysShift = day => weekdayShift(day);
    }

    const cellSize = 16;
    const textScale = 1.5;
    const interMonthSpace = 0.5;
    const interDaySpace = 1;

    var sumDay;
    if(displayWeekends || weekendsAsBonus)
	sumDay = ({duration}) => duration;
    else
	sumDay = ({date, duration}) => isWeekday(moment(date).isoWeekday()) ? duration : 0;

    const countDays = days => days.reduce((accu, day) => accu + dayFilter(moment(day.date).isoWeekday()), 0);

    const palette = d3.scaleLinear().domain([0, averagePerDay, averagePerDay + window.maxPerDay]).range(['white', color, 'black']);

    const totOverDay = days => d3.sum(days, day => sumDay(day));
    const meanPerDay = days => d3.sum(days, day => sumDay(day)) / countDays(days);
    const sigmForDay = days => days.length < 2 ? 0 : d3.deviation(days, day => sumDay(day));

    function ellipseRadix(days, radix, max) {
	const sigma = sigmForDay(days);

	if(sigma === undefined || sigma == 0) return radix;

	return Math.max(radix, Math.min(radix * (1 + sigma / meanPerDay(days)), max));
    }

    function ellipseTitle(days) {
	return displayDuration(meanPerDay(days).toFixed(0))
	    + "  σ " + displayDuration(sigmForDay(days).toFixed(0));
    }

    const years = d3.nest().key(d => moment(d.date).year()).entries(data).reverse();

    const svg = d3.selectAll('div#calendar').append('svg');

    svg.attr('width', 200 + 54 * (cellSize + interDaySpace) + 12 * interMonthSpace)
	.attr('height', years.length * (50 + (5 + 2 * displayWeekends) * (cellSize + interDaySpace)))

    const year = svg.selectAll('g').data(years).join('g');

    year.attr('transform', (_, i) => `translate(50,${40 + i * (5 + 2 * displayWeekends) * textScale * cellSize})`);

    const year_ = year.append('g').attr('class', "calendar-year");

    year_.append('text').text(({key: year}) => year)
	.append('title').text(({values: days}) => displayLongDuration(totOverDay(days), averagePerDay));
    if(hasFirstGlanceYears)
	year_.append('ellipse').attr('cx', 20).attr('cy', -6).attr('ry', 8)
	.attr('rx', ({values: days}) => ellipseRadix(days, 8, 16))
	.attr('fill', ({values: days}) => palette(meanPerDay(days)))
	.append('title').text(({values: days}) => ellipseTitle(days));

    const weekday = year.append('g').attr('class', "calendar-weekday").attr('transform', `translate(-30,${textScale * cellSize})`);

    function weekdayGridY(weekday) { return (weekday - weekdaysShift(weekday)) * 1.05 * cellSize; }

    const weekday_ = weekday.selectAll('g')
	  .data(({values:days}) => d3.nest().key(({date}) => moment(date).weekday()).entries(days).filter(({key: weekday}) => dayFilter(moment().weekday(weekday).isoWeekday())))
	  .join('g')
	  .attr('transform', ({key: weekday}) => `translate(3,${weekdayGridY(weekday)})`);

    weekday_.append('text').text(({key: weekday}) => moment.weekdays(true)[weekday])
	.append('title').text(({values: days}) => displayLongDuration(totOverDay(days), averagePerDay));
    if(hasFirstGlanceWeekdays)
	weekday_.append('ellipse').attr('cx', -10).attr('cy', -6).attr('ry', 4)
	.attr('rx', ({values: days}) => ellipseRadix(days, 4, 8))
	.attr('fill', ({values: days}) => palette(meanPerDay(days)))
	.append('title').text(({values: days}) => ellipseTitle(days));

    const month = year.append('g').attr('class', "calendar-month").attr('transform', "translate(70,0)");

    const month_ = month.selectAll('g')
	  .data(({values:days}) => d3.nest().key(({date}) => moment(date).month() + 1).entries(days).reverse())
	  .join('g')
	  .attr('transform', ({values: days}) => `translate(${dayGridX(moment(days[0].date).startOf('month'))},0)`);

    month_.append('text')
	.text(({key:month}) => moment().month(month - 1).format(monthFormat))
	.append('title').text(({values: days}) => displayLongDuration(totOverDay(days), averagePerDay));
    if(hasFirstGlanceMonths)
	month_.append('ellipse').attr('cx', 45).attr('cy', -5).attr('ry', 5)
	.attr('rx', ({values: days}) => ellipseRadix(days, 5, 10))
	.attr('fill', ({values: days}) => palette(meanPerDay(days)))
	.append('title').text(({values: days}) => ellipseTitle(days));

    const days = year.append('g')
	  .attr('class', "calendar-day")
	  .attr('transform', "translate(70,10)");

    function dayGridX(day) {
	day = moment(day);
	var week = (day.month() == 0 && 50 < day.week()) ? 0 : day.week();
	week = (day.month() == 11 && week <= 1) ? week = day.subtract(7, 'days').week() + 1 : week;
	return week * (cellSize + interDaySpace) + day.month() * interMonthSpace * cellSize;
    }

    function dayGridY(day) {
	var weekday = moment(day).weekday();
	return (weekday - weekdaysShift(weekday)) * (cellSize + interDaySpace);
    }

    days.selectAll('rect')
	.data(({values:days}) => days.filter(({date:date}) => dayFilter(moment(date).isoWeekday())))
	.join('rect')
	.attr('width', cellSize).attr('height', cellSize)
	.attr('transform', ({date}) => `translate(${dayGridX(date)},${dayGridY(date)})`)
	.attr("fill", ({duration}) => palette(duration))
	.append('title').text(({date,duration}) => moment(date).format('YYYY-MM-DD') + " " + displayDuration(duration));
}
