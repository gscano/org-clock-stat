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

/* FILTER & SPLIT */
function raw(start, end) { return {start: start, end: end}; }

var filter = createSplittingFilter({ startingDate: "2019-08-15", endingDate: "2019-08-21",
				     countWeekends: true });

verify(filter(raw("2019-08-15 13:15", "2019-08-21 11:14")),
       [raw("2019-08-15 13:15", "2019-08-21 11:14")]);

verify(filter(raw("2019-08-14 13:15", "2019-08-21 11:14")),
       [raw("2019-08-15 00:00", "2019-08-21 11:14")]);

verify(filter(raw("2019-08-15 13:15", "2019-08-22 11:14")),
       [raw("2019-08-15 13:15", "2019-08-22 00:00")]);

verify(filter(raw("2019-08-14 13:15", "2019-08-22 11:14")),
       [raw("2019-08-15 00:00", "2019-08-22 00:00")]);

var filter = createSplittingFilter({ startingDate: "2019-08-15", endingDate: "2019-08-21",
				     countWeekends: false });

verify(filter(raw("2019-08-15 13:15", "2019-08-21 11:14")),
       [raw("2019-08-15 13:15", "2019-08-17 00:00"),
	raw("2019-08-19 00:00", "2019-08-21 11:14")]);

verify(filter(raw("2019-08-14 13:15", "2019-08-21 11:14")),
       [raw("2019-08-15 00:00", "2019-08-17 00:00"),
	raw("2019-08-19 00:00", "2019-08-21 11:14")]);

verify(filter(raw("2019-08-15 13:15", "2019-08-22 11:14")),
       [raw("2019-08-15 13:15", "2019-08-17 00:00"),
	raw("2019-08-19 00:00", "2019-08-22 00:00")]);

verify(filter(raw("2019-08-14 13:15", "2019-08-22 11:14")),
       [raw("2019-08-15 00:00", "2019-08-17 00:00"),
	raw("2019-08-19 00:00", "2019-08-22 00:00")]);

// var filter = createSplittingFilter({ startingDate: "2019-08-15", endingDate: "2019-08-21",
//				     days: new Set(["2019-08-16", "2019-08-18"]),
//				     countWeekends: true });

// verify(filter(raw("2019-08-15 13:15", "2019-08-21 11:14")),
//        [raw("2019-08-16 00:00", "2019-08-17 00:00"),
//	raw("2019-08-18 00:00", "2019-08-19 00:00")]);

// verify(filter(raw("2019-08-16 13:15", "2019-08-21 11:14")),
//        [raw("2019-08-16 13:15", "2019-08-17 00:00"),
//	raw("2019-08-18 00:00", "2019-08-19 00:00")]);

// verify(filter(raw("2019-08-15 13:15", "2019-08-18 11:14")),
//        [raw("2019-08-16 00:00", "2019-08-17 00:00"),
//	raw("2019-08-18 00:00", "2019-08-18 11:14")]);

// verify(filter(raw("2019-08-16 13:15", "2019-08-18 11:14")),
//        [raw("2019-08-16 13:15", "2019-08-17 00:00"),
//	raw("2019-08-18 00:00", "2019-08-18 11:14")]);

// var filter = createSplittingFilter({ startingDate: "2019-08-15", endingDate: "2019-08-21",
//				     days: new Set(["2019-08-16", "2019-08-17"]),
//				     countWeekends: true });

/* FILTER & SPLIT */

const d1 = "2019-08-09 19:25";
const d2 = "2019-08-09 20:33";
const d3 = "2019-08-10 02:12";
const d4 = "2019-08-11 23:41";

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

verify(Array.from(reduceDuration([duration(d1,d2),duration(d3,d4)]))
       .map(([date, duration]) => ({date: new Date(date), duration: duration})),
       [reduced("2019-08-09", "01:08"),
	reduced("2019-08-10", "21:48"),
	reduced("2019-08-11", "23:41")]);
verify(Array.from(reduceDuration([duration(d1,d2), duration(d2,d3), duration(d3,d4)]))
       .map(([date, duration]) => ({date: new Date(date), duration: duration})),
       [reduced("2019-08-09", "04:35"),
	reduced("2019-08-10", "24:00"),
	reduced("2019-08-11", "23:41")]);
/* DURATION */

/* INTERVAL */
function interval(i,j,first,last,span) {
    var value = [];

    for(var k = i; k <= j; ++k)
	value.push(k == i ? first : (k == j ? last : span));

    return value;
}

verify(extractDaysInterval("2019-08-09 00:00", "2019-08-09 1:36", 28, Array(5).fill(0)), [28,28,28,12,0]);
verify(extractDaysInterval("2019-08-09 00:00", "2019-08-09 02:12", 35, Array(5).fill(0)), [35,35,35,27,0]);
verify(extractDaysInterval("2019-08-09 20:42", "2019-08-09 23:53", 49, Array(30).fill(0)),
       Array(25).fill(0).concat([32,49,49,49,12]));

verify(extractDaysInterval(d1, d2, 15, Array(Math.ceil(24 * 60 / 15)).fill(0)),
       Array(77).fill(0).concat(interval(77,82,5,3,15)).concat(Array(13).fill(0)));
verify(extractDaysInterval(d2, d3, 15, Array(Math.ceil(24 * 60 / 15)).fill(0)),
       interval(0,8,15,12,15).concat(Array(83 - 10).fill(0)).concat(interval(82,95,12,15,15)));
verify(extractDaysInterval(d2, d3, 28, Array(Math.ceil(24 * 60 / 28)).fill(0)),
       interval(0,4,28,20,28).concat(Array(52 - 13).fill(0)).concat(interval(44,51,27,12,28)));
verify(extractDaysInterval(d1, d3, 35, Array(Math.ceil(24 * 60 / 35)).fill(0)),
       [35,35,35,27].concat(Array(29).fill(0)).concat([25,35,35,35,35,35,35,35,5]));
/* INTERVAL */

/* LOCALE */
moment.locale('en');
assert(weekdayShift(1) == 1);

moment.locale('fr');
assert(weekdayShift(1) == 0);

moment.locale('ar');
assert(weekdayShift(1) == 2);
/* LOCALE */
