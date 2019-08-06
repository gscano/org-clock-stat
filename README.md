# Org-clock statistics

## Install

This project depends only on [org-clock-csv](https://github.com/atheriel/org-clock-csv/).
It can be installed separately or as a Git submodule.

## Usage

First a file containing all clocks among a set of org mode files is constructed using *org-clock-csv*.

### Retrieving clocks

The [*org-clock-csv* README.md](https://github.com/atheriel/org-clock-csv/blob/master/README.md) should be read first in order to setup a correct `--init` file which will be `~/.emacs.d/init.el` by default.
Then execute the `run.sh` script with suitable arguments (use `--help` for a comprehensive list).

As a reminder, if no argument is supplied and if your emacs init file contains the `org-agenda-files` variable, all enclosed org mode files will be parsed. Otherwise, it is possible to limit the scope of the files to be scanned.