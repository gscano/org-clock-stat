// Project: [String: category, [String]: parents, String: tasks, [String]: tags, Boolean: isHabit, String: effort]

// Integer => [Project] => Integer => [String] => Integer => Integer => Float[0,1] => Integer => Float[0,1] => Integer => Float[0,1] => Integer
function randomProject(headlines, projects,
		       projectID, parents, maxDepth, maxChildren,
		       tagsProbability, maxTags,
		       effortProbability, maxEffort,
		       isHabitProbability)
{
    if(headlines == 0) return 0;

    var hasDepth = parents.length < Math.floor(Math.random() * maxDepth);
    var children = Math.min(headlines, Math.floor(Math.random() * maxChildren) + 1);

    if(!hasDepth) for(var child = 1; 0 < headlines && child <= children; ++child, --headlines) {

	var project = [];

	project.push("project " + projectID);
	project.push(parents);

	project.push(String.fromCharCode('A'.charCodeAt(0) + parents.length) + child);
	var tagsNumber = Math.floor(Math.random() * maxTags);
	var tags = [];

	while(0 < tagsNumber) {
	    if(tagsProbability < Math.random())
		tags.push("tag" + tagsNumber);
	    --tagsNumber;
	}

	project.push(tags);
	project.push(Math.random() < isHabitProbability);
	project.push((Math.random() <= effortProbability) ? displayDuration(Math.floor(Math.random() * maxEffort)) : null);

	projects.push(project);
    }
    else for(var child = 1; 0 < headlines && child <= children; ++child) {

	var localParents = [...parents];
	localParents.push(String.fromCharCode('A'.charCodeAt(0) + parents.length) + child);

	headlines = randomProject(headlines - 1, projects,
				  projectID, localParents, maxDepth, maxChildren,
				  tagsProbability, maxTags,
				  effortProbability, maxEffort,
				  isHabitProbability);
    }

    return headlines;
}

// {headlines: Integer, maxDepth: Integer, maxChildren: Integer, tagsProbability: Float[0,1], maxTags: Integer, effortProbability: Float[0,1], maxEffort: Integer, isHabitProbability: Float[0,1]} => [Project]
function randomProjects({headlines: headlines,
			 maxDepth: maxDepth, maxChildren: maxChildren,
			 tagsProbability: tagsProbability, maxTags: maxTags,
			 effortProbability: effortProbability, maxEffort: maxEffort,
			 isHabitProbability: isHabitProbability}) {

    var projects = [];
    var projectID = 1;

    while(projects.length < headlines)
	headlines = randomProject(headlines, projects,
				  projectID++, [], maxDepth, maxChildren,
				  tagsProbability, maxTags,
				  effortProbability, maxEffort,
				  isHabitProbability);

    return projects;
}

// {beforeWorkProbability: Float[0,1], morning: Integer, morningProbability: Float[0,1], lunch: Integer, lunchProbability: Float[0,1], afternoon: Integer, afternoonProbability: Float[0,1], evening: Integer, eveningProbability: Float[0,1], weekendShift: Integer} => (Moment => Boolean)
function createActivityRandomizer({beforeWorkProbability: beforeWorkProbability,
				   morning: morning, morningProbability: morningProbability,
				   lunch: lunch, lunchProbability: lunchProbability,
				   afternoon: afternoon, afternoonProbability: afternoonProbability,
				   evening: evening, eveningProbability: eveningProbability,
				   weekendShift: weekendShift}) {
    return function (date) {
	var rand = Math.random();
	if(date.isoWeekday() == 6 || date.isoWeekday() == 7) rand *= weekendShift;
	const hours = date.hours();

	if(hours < morning)
	    return [rand < beforeWorkProbability, (morning - hours) / (morning - 0)];
	else if(hours < lunch)
	    return [rand < morningProbability, (lunch - hours) / (lunch - morning)];
	else if(hours < afternoon)
	    return [rand < lunchProbability, (afternoon - hours) / (afternoon - lunch)];
	else if(hours < evening)
	    return [rand < afternoonProbability, (evening - hours) / (evening - afternoon)];
	else
	    return [rand < eveningProbability, (24 - hours) / (24 - evening)];
    }
}

// [Project] => Date => Date => (Date => Float[0,1]) => Integer => [String]
function randomData(projects, from, to, activityRandomizer, workingStep) {

    csv = ["task,parents,category,start,end,effort,ishabit,tags"];

    from = moment(from);
    to = moment(to);

    while(!from.isAfter(to, 'date')) {
	let [work, step] = activityRandomizer(from);

	if(work) {
	    const from_ = from.format('YYYY-MM-DD HH:mm');

	    from.add(Math.floor(Math.random() * step * workingStep) + 1, 'minutes');

	    var index = Math.floor(Math.random() * projects.length);
	    var project = projects[index];

	    var line = [];

	    line.push(project[2]);
	    line.push(project[1].slice(0, Math.min(Math.floor(Math.random() * project[1].length^2), project[1].length)).join('/'));
	    line.push(project[0]);

	    line.push(from_);
	    line.push(from.format('YYYY-MM-DD HH:mm'));

	    line.push(project[5]);
	    line.push(project[4] ? 't' : null);
	    line.push(project[3].join(':'));

	    csv.push(line.join(','));
	}
	else
	    from.add(Math.floor(Math.random() * step * workingStep) + 1, 'minutes');
    }

    return csv;
}
