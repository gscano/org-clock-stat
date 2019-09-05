# Program flow

## `window.onload`

* create events
* create date pickers
* for demo and tests only, first generate random data then trigger `readData`

## `readFile`

* Read file as text

## `readData`

* parse text as csv `task,parents,category,start,end,effort,ishabit,tags` formatted rows with an arbitrary order
* complete data analysis
**  assigning IDs etc
* initialize data pickers
* `draw`

## `draw`

* collect configuration
** target average
** day pace
** display weekends / bonus
** first glance
** starting and ending dates
* create the associated filter
* filter `flattenedTasks` to `current.tasks`
* reduce day interval
* reduce duration
* count total time
* count the total number of days and weekdays
* `drawDays`, `drawHeadlines`, `drawCalendar`