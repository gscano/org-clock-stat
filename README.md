# Org-clock statistics

Computes and renders org-mode clocked time.

See the [demo](https://malloc.fr/org-clock-stat/index.html).

## Usage

Displays various properties of any CSV files containing the following __mandatory__ and ~~optional~~ columns:

__task__,__parents__,__category__,__start__,__end__,~~effort~~,~~ishabit~~,~~tags~~

However, it is intended to work out of the box for *org-mode* files processed by [org-clock-csv](https://github.com/atheriel/org-clock-csv/) which can be installed as a submodule for convenience.
Please read the [README](https://github.com/atheriel/org-clock-csv/blob/master/README.md) first in order to setup a specific init file (`~/.emacs.d/init.el` will be used by default).
On Linux, the `run.sh` script could be used to generate the targeted CSV file for a standard installation and configuration.
As a reminder, if no arguments are supplied and if your emacs init file contains the `org-agenda-files` variable, all enclosed *org-mode* files will be parsed.

## Install

This project depends on

* [d3.js](https://d3js.org/);
* [moment.js](https://momentjs.com/);
* [Pikaday](https://pikaday.com/).

For a better latency, run the `install.sh` command in *user mode* in order to retrieve and store locally the required JavaScript and CSS files. Then comment/uncomment the *remote* and *local* sections of [index.html](./index.html#L14-L26) and comment the  one.