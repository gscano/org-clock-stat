var fs = require('fs');
var moment = require('moment');
var assert = require('assert');

eval(fs.readFileSync('../lib.js')+'');

function make(date, duration) { return [date, moment.duration(duration).asMinutes()]; }

function verify(lhs, rhs) {
    console.log(lhs)
    assert(lhs.length == rhs.length);
    
    for(var i = 0; i < lhs.length; ++i)
	console.log(lhs[i][0] + ":" + lhs[i][1] + "  ~~~~~  " + rhs[i][0] + ":" + rhs[i][1]);

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

verify(reduceDuration([[d1,d2],[d3,d4]]), [make("2019-08-09", "01:08"),
 					     make("2019-08-10", "21:48"),
 					     make("2019-08-11", "23:41")]);
verify(reduceDuration([[d1,d2], [d2,d3], [d3,d4]]), [make("2019-08-09", "04:35"),
 						      make("2019-08-10", "24:00"),
 						      make("2019-08-11", "23:41")]);

const t1 = {'entries': [[d1,d2]]};
const t2 = {'entries': [[d3,d4]], 'subtasks': []};
const t3 = {'entries': [[d1,d2]],
	    'subtasks': [{'entries': [[d2,d3]]}]};
const t4 = {'entries': [[d1,d2]],
	    'subtasks': [{'entries': [[d2,d3]],
			  'subtasks': [{'entries': [[d3,d4]]
				       }]
			 }]
	   };

verify(flattenTask(t1), [[d1,d2]]);
verify(flattenTask(t2), [[d3,d4]]);
verify(flattenTask(t3), [[d1,d2],[d2,d3]]);
verify(flattenTask(t4), [[d1,d2], [d2,d3], [d3,d4]]);

verify(flattenTasks([t1,t2]), [[d1,d2],[d3,d4]]);

verify(reduceTasks([t4]), [make("2019-08-09", "04:35"),
			   make("2019-08-10", "24:00"),
			   make("2019-08-11", "23:41")]);
