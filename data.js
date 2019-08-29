// Project: [String: category, [String]: parents, String: tasks,
//           [String]: tags, Boolean: isHabit, String: effort]

// Integer => [Project] => Integer => [String] => Integer => Integer => Float[0,1] => Integer => Float[0,1] => Integer => Float[0,1]
function randomProject(count, projects,
		       projectID, parents, maxDepth, maxChildren,
		       tagsProbability, maxTags,
		       effortProbability, maxEffort,
		       isHabitProbability)
{
    if(projects.length == count) return;

    var hasDepth = parents.length < Math.floor(Math.random() * maxDepth);
    var children = Math.floor(Math.random() * maxChildren) + 1;

    if(!hasDepth) for(var child = 1; child <= children; ++child) {

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

	if(projects.length == count) return;

	--children;
    }
    else for(var child = 1; child <= children; ++child) {

	var localParents = [...parents];
	localParents.push(String.fromCharCode('A'.charCodeAt(0) + parents.length) + child);

	randomProject(count, projects,
		      projectID, localParents, maxDepth, maxChildren,
		      tagsProbability, maxTags,
		      effortProbability, maxEffort,
		      isHabitProbability);
    }

}

// Integer => Integer => Integer => Float[0,1] => Integer => Float[0,1] => Integer => Float[0,1] => [Project]
function randomProjects(count,
			maxDepth, maxChildren,
			tagsProbability, maxTags,
			effortProbability, maxEffort,
			isHabitProbability) {

    var projects = [];
    var projectID = 1;

    while(projects.length < count)
	randomProject(count, projects,
		      projectID++, [], maxDepth, maxChildren,
		      tagsProbability, maxTags,
		      effortProbability, maxEffort,
		      isHabitProbability);

    return projects;
}

// Float[0,1] => Integer => Float[0,1] => Integer => Float[0,1] => Integer => Float[0,1] => Integer => Float[0,1] => Integer => (Moment => Boolean)
function createActivityRandomizer(beforeWorkProbability,
				  morning, morningProbability,
				  lunch, lunchProbability,
				  afternoon, afternoonProbability,
				  afterWork, afterWorkProbability,
				  weekendShift) {
    return function (date) {
	var rand = Math.random();
	if(date.isoWeekday() == 6 || date.isoWeekday() == 7) rand *= weekendShift;
	const hours = date.hours();

	if(hours < morning)
	    return rand < beforeWorkProbability;
	else if(hours < lunch)
	    return rand < morningProbability;
	else if(hours < afternoon)
	    return rand < lunchProbability;
	else if(hours < afterWork)
	    return rand < afternoonProbability;
	else
	    return rand < afterWorkProbability;
    }
}

// [Project] => Date => Date => Integer => Float[0,1] => [String]
function randomData(projects, from, to, activityProbability, max = 100) {

    csv = ["task,parents,category,start,end,effort,ishabit,tags"];

    from = moment(from);
    to = moment(to);

    while(!from.isSame(to, 'date')) {

	var duration = from.clone();

	duration.add(Math.floor(Math.random() * max), 'minutes');

	if(activityProbability(from)) {
	    var index = Math.floor(Math.random() * projects.length);
	    var project = projects[index];

	    var line = [];

	    line.push(project[2]);
	    line.push(project[1].join('/'));
	    line.push(project[0]);

	    line.push(from.format('YYYY-MM-DD HH:mm'));
	    line.push(duration.format('YYYY-MM-DD HH:mm'));

	    line.push(project[5]);
	    line.push(project[4] ? 't' : null);
	    line.push(project[3].join(':'));

	    csv.push(line.join(','));
	}

	from = duration;
    }

    return csv;
}
