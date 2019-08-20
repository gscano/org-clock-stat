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
	data.push([date.format("YYYY-MM-DD"), getRandomDuration(max)]);
	date.add(1, 'days');
    }
    
    return data;
}
