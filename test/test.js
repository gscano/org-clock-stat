var fs = require('fs');
var moment = require('moment');
var assert = require('assert');

eval(fs.readFileSync('../lib.js')+'');

function verify(lhs, rhs) {

    console.log(lhs);
    console.log(rhs);

    assert(lhs.length == rhs.length);

    assert.deepEqual(lhs, rhs);
}

const d1 = "2019-08-09 19:25";
const d2 = "2019-08-09 20:33";
const d3 = "2019-08-10 02:12";
const d4 = "2019-08-11 23:41";

/* FLATTEN */
const t1 = {'entries': [[d1,d2]]};
const t2 = {'entries': [[d3,d4]], 'subtasks': []};
const t3 = {'entries': [[d1,d2]],
	    'subtasks': [{'entries': [[d2,d3]]}] };
const t4 = {'entries': [[d1,d2]],
	    'subtasks': [{'entries': [[d2,d3]],
			  'subtasks': [{'entries': [[d3,d4]]}] }] };

function bundle(start,end) { return {"id":undefined,"start":start,"end":end}; }

verify(flattenTask(t1), [bundle(d1,d2)]);
verify(flattenTask(t2), [bundle(d3,d4)]);
verify(flattenTask(t3), [bundle(d1,d2),bundle(d2,d3)]);
verify(flattenTask(t4), [bundle(d1,d2), bundle(d2,d3), bundle(d3,d4)]);

verify(flattenTasks([t1,t2]), [bundle(d1,d2),bundle(d3,d4)]);
/* FLATTEN */

/* FILTER */
var ids = new Set([2,3]);
var filter = createFilter(ids, "2019-08-09", "2019-08-10");
assert(!filter(1, d1));
assert( filter(2, d1));
assert(!filter(3, d4));
var filter = createFilter(ids, "2019-08-09", "2019-08-10", ("2019-08-09"));
assert( filter(3, (d2)));
assert(!filter(3, (d3)));
var filter = createFilter(ids, "2019-08-09", "2019-08-10", ("2019-01-23"), 'year');
assert(!filter(3, ("2020-04-23")));
assert( filter(3, (d2)));;
/* FILTER */

/* DURATION */
function make(date, duration) { return [new Date(date), moment.duration(duration).asMinutes()]; }

verify(extractDaysDuration(d1, d2), [make("2019-08-09","01:08")]);
verify(extractDaysDuration(d1, d3), [make("2019-08-09","04:35"),
				     make("2019-08-10","02:12")]);
verify(extractDaysDuration(d1, d4), [make("2019-08-09","04:35"),
				     make("2019-08-10","24:00"),
				     make("2019-08-11","23:41")]);

function reduced(date, duration) { return {date: new Date(date),
					   duration: moment.duration(duration).asMinutes()}; }

function duration(start,end) { return {start:start, end:end}; }

verify(reduceDuration([duration(d1,d2),duration(d3,d4)]),
       [reduced("2019-08-09", "01:08"),
	reduced("2019-08-10", "21:48"),
	reduced("2019-08-11", "23:41")]);
verify(reduceDuration([duration(d1,d2), duration(d2,d3), duration(d3,d4)]),
       [reduced("2019-08-09", "04:35"),
	reduced("2019-08-10", "24:00"),
	reduced("2019-08-11", "23:41")]);
/* DURATION */

/* INTERVAL */
function interval(i,j,first,last,span) {
    var value = [];

    for(var k = i; k <= j; ++k)
	value.push({interval: k, weight: (k == i ? first : (k == j ? last : span))});

    return value;
}

verify(extractDaysInterval(d1, d2, 15), interval(77,82,5,3,15));
verify(extractDaysInterval(d2, d3, 28), interval(44,51,27,28,28).concat(interval(0,4,28,4,28)));
verify(extractDaysInterval(d2, d3, 15), interval(82,96,12,15,15).concat(interval(0,7,15,12,15)));

console.log(reduceInterval([duration(d1,d2),duration(d3,d4)]));
/* INTERVAL */

/* LOCALE */
moment.locale('en');
assert(weekdayShift(1) == 1);

moment.locale('fr');
assert(weekdayShift(1) == 0);

moment.locale('ar');
assert(weekdayShift(1) == 2);
/* LOCALE */
