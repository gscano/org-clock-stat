function getRandomDuration(max = 12 * 60) {
    var min = 0;

    if (0.999 < Math.random())
	return max + Math.floor(Math.random() * 100);
    else
	return Math.floor(Math.random() * (max - min + 1)) + min;;
}

function randomCalendarData(fromDate, max) {
    var data = [];
    var date = moment(fromDate);

    while(!date.isSame(moment(), 'day')) {
	data.push({"date": date.format("YYYY-MM-DD"), "duration": getRandomDuration(max)});
	date.add(1, 'days');
    }

    return data;
}

// Project: [String: category, [String]: parents, String: tasks,
//           [String]: tags, Boolean: isHabit, String: effort]

// Integer => [Project] => Integer => [String] => Integer => Integer => Float[0,1] => Integer => Float[0,1] => Integer => Float[0,1]
function randomProject(count, projects,
		       project_id, parents, maxDepth, maxChildren,
		       tagsProbability, maxTags,
		       effortProbability, maxEffort,
		       isHabitProbability)
{
    if(projects.length == count) return;

    var hasDepth = parents.length < Math.floor(Math.random() * maxDepth);
    var children = Math.floor(Math.random() * maxChildren) + 1;

    if(!hasDepth) {

	for(var child = 1; child <= children; ++child) {

	    var project = [];

	    project.push("project " + project_id);
	    project.push(parents);

	    project.push(String.fromCharCode('A'.charCodeAt(0) + parents.length) + child);
	    var tags_number = Math.floor(Math.random() * maxTags);
	    var tags = [];

	    while(0 < tags_number) {
		if(tagsProbability < Math.random())
		    tags.push("tag" + tags_number);
		--tags_number;
	    }

	    project.push(tags);
	    project.push(Math.random() < isHabitProbability);
	    project.push((Math.random() <= effortProbability) ? displayDuration(Math.floor(Math.random() * maxEffort)) : null);

	    projects.push(project);

	    if(projects.length == count) return;

	    --children;
	}
    }
    else {
	for(var child = 1; child <= children; ++child) {

	    var local_parents = [...parents];
	    local_parents.push(String.fromCharCode('A'.charCodeAt(0) + parents.length) + child);

	    randomProject(count, projects,
			  project_id, local_parents, maxDepth, maxChildren,
			  tagsProbability, maxTags,
			  effortProbability, maxEffort,
			  isHabitProbability);
	}
    }

}

// Integer => Integer => Integer => Float[0,1] => Integer => Float[0,1] => Integer => Float[0,1] => [Project]
function randomProjects(count,
			maxDepth, maxChildren,
			tagsProbability, maxTags,
			effortProbability, maxEffort,
			isHabitProbability) {

    var projects = [];
    var project_id = 1;

    while(projects.length < count) {
	randomProject(count, projects,
		      project_id, [], maxDepth, maxChildren,
		      tagsProbability, maxTags,
		      effortProbability, maxEffort,
		      isHabitProbability);
	++project_id;
    }

    return projects;
}

// [Project] => String => String => Integer => Float[0,1] => [String]
function randomData(projects, from, to, max = 100, activityProbability = 0.5) {

    csv = ["task,parents,category,start,end,effort,ishabit,tags"];

    from = moment(from);
    to = moment(to);

    while(!from.isSame(to, 'date')) {

	var duration = from.clone();

	duration.add(Math.floor(Math.random() * max), 'minutes');

	if(activityProbability < Math.random()) {
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
