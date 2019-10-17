# Org-clock statistics

Computes and renders Org-mode clocked time.

[Website](https://malloc.fr/org-clock-stat)
[Demo](https://malloc.fr/org-clock-stat/demo)

## Usage

Displays the following __mandatory__ and ~~optional~~ CSV file columns:

__task__, __parents__, __category__, __start__, __end__, ~~effort~~, ~~ishabit~~, ~~tags~~

with every column being text except that:

* __start__ and __end__ are Javascript dates (could be YYYY-MM-DD HH:mm);
* ~~effort~~ is a Javascript duration (could be HH:mm);
* ~~ishabit~~ is equal to *t* or empty.

However, it is intended to work out of the box for *Org-mode* files processed by [org-clock-csv](https://github.com/atheriel/org-clock-csv/) which can be installed as a submodule for convenience.
Please read the [README](https://github.com/atheriel/org-clock-csv/blob/master/README.md) first in order to setup a specific init file (`~/.emacs.d/init.el` will be used by default).
On Linux, the `run.sh` script could be used to generate the targeted CSV file for a standard installation and configuration.
As a reminder, if no arguments are supplied and if your emacs init file contains the `org-agenda-files` variable, all enclosed *Org-mode* files will be parsed.

## Install

This project depends on

* [d3.js](https://d3js.org/) version 5.12.0;
* [moment.js](https://momentjs.com/) version 2.24.0;
* [Pikaday](https://pikaday.com/) version 1.8.0.

For a better latency, run the `install.sh` command in order to retrieve and store locally the required JavaScript and CSS files. Then comment/uncomment the *remote*/*local* sections of [index.html](./index.html#L14-L26).

The general behavior can be controlled by three variables at the top of [index.js](./index.js#L1-L3) and three more at the beginning of the [`window.onload`](./index.js#L7-L9) function.