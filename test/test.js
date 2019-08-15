var fs = require('fs');
var moment = require('moment');
var assert = require('assert');

eval(fs.readFileSync('../lib.js')+'');

function make(date, duration) { return [date, moment.duration(duration).asMinutes()]; }

function verify(lhs, rhs) {
    assert(lhs.length == rhs.length);
    
    for(var i = 0; i < lhs.length; ++i) {
	console.log(lhs[i][0] + ":" + lhs[i][1] + "  ~~~~~  " + rhs[i][0] + ":" + rhs[i][1]);
    }

    assert.deepEqual(lhs, rhs);
}

const d1 = "2019-08-09 19:25";
const d2 = "2019-08-09 20:33";
const d3 = "2019-08-10 02:12";
const d4 = "2019-08-11 23:41";

verify(extractDuration(d1, d2), [make("2019-08-09","01:08")]);
verify(extractDuration(d1, d3), [make("2019-08-09","04:35"),
				 make("2019-08-10","02:12")]);
verify(extractDuration(d1, d4), [make("2019-08-09","04:35"),
				 make("2019-08-10","24:00"),
				 make("2019-08-11","23:41")]);

verify(reduceDuration([[d1, d2],[d3, d4]]), [make("2019-08-09", "01:08"),
 					     make("2019-08-10", "21:48"),
 					     make("2019-08-11", "23:41")]);
verify(reduceDuration([[d1, d2], [d2,d3], [d3,d4]]), [make("2019-08-09", "04:35"),
 						      make("2019-08-10", "24:00"),
 						      make("2019-08-11", "23:41")]);
