# Program flow

## `window.onload`

* create events
* create date pickers
* init workers
* [for demo and tests only], first generate random data then trigger `readData`

## `readFile`

* Read file as text and trigger `readData`

## `readData`

* parse text as CSV `task,parents,category,start,end,effort,ishabit,tags` formatted rows with an arbitrary order
* complete data analysis
  * assigning IDs to headlines
  * building depency tree
  * collect tags
    * count tags
    * list tags
    * assign colors depending on values
  * extract headlines description and entries
  * find bounding dates
  * initialize selection
  * initialize current values
* initialize date pickers with bounding dates
* dispatch data to workers
* call `draw`

## `draw`

* collect configuration
  * target average
  * day pace
  * display weekends / bonus
  * first glance
  * starting and ending dates
* dispatch configuration to workers for processing
  * trigger `computeDayDurations`
  * trigger `computeHeadlinesDurations`
  * trigger `computeCalendarDurations`
* call `display`

# `window` object

* `color`: current color
* `defaultDayPace`: default time step
* `maxPerDay`: maximum working time per day
* `startingDatePicker`: starting date selection
* `endingDatePicker`: ending date selection
* `worker`: hold `day`, `headlines` and `calendar` workers
* `data`: current data

# `data` object

* `tags`
  * `list`: list of tags
  * `color`: color map of each tag
  * `count`: counters for toggling and display
* `headlines`
  * `data`
    * `parent`: parent id
    * `entries`: table of entries
  * `desc`: input headline description with additional`id`, `parent`, `depth` and `children`
* `firstDate` and `lastDate`: the bounding dates
* `selectedHeadlines` and `foldedHeadlines` currently selected and folded headlines
* `current`: current `config` and computed `day`, `calendar`, `daysCount`, `headlines` and `totalTimes` data