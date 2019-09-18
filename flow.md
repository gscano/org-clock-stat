# Program flow

## `window.onload`

* create events
* create date pickers
* [for demo and tests only], first generate random data then trigger `readData`

## `readFile`

* Read file as text

## `readData`

* parse text as CSV `task,parents,category,start,end,effort,ishabit,tags` formatted rows with an arbitrary order
* complete data analysis
  * assigning IDs to headlines
  * counting headlines subheadlines
  * find bounding dates
  * collect tags
  * initiate selection
* initialize date pickers with bounding dates
* `draw`

## `drawDayAfterPaceChange`

* collect day pace
* verify its value
* collect weekends bonus
* reduce day interval
* `drawDays`

## `draw`

* collect configuration
  * target average
  * day pace
  * display weekends / bonus
  * first glance
  * starting and ending dates
* create the associated filter
* filter `flattenedTasks` to `current.tasks`
* reduce day interval
* reduce duration
* count total time
* count the total number of days and weekdays
* `drawDays`, `drawHeadlines`, `drawCalendar`

# `window` object

* `color`: current color
* `defaultStep`: default time step
* `startingDatePicker`: starting date selection
* `endingDatePicker`: ending date selection
* `worker`: hold `day`, `headlines` and `calendar` workers
* `data`: raw, display and computed data

# `data` object

* `tagsCount`
* `tags`
* `tagsColor`
* `headlines`
  * `data`
  * `desc`
* `firstDate`
* `lastDate`
* `selectedHeadlines`
* `foldedHeadlines`