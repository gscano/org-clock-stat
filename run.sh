#!/bin/bash

path=$(realpath $(dirname $BASH_SOURCE))

emacs_init="~/.emacs.d/init.el"
output="stats.csv"
org_clock_csv=$path"/org-clock-csv/org-clock-csv.el"

usage()
{
    echo "Usage: run [--help,-h] [--init <emacs init>][--output <output>] [--org-clock-csv <path>] <filename> ..."
    echo "   --init           emacs init file,     defaults to '$emacs_init'"
    echo "   --output         csv file,            defaults to '$output'"
    echo "   --org-clock-csv  path to the library, defaults to '$org_clock_csv'"
}

parsed_opts=$(getopt -o ho: -l help,org-clock-csv:,output: -- "$@")
if [[ $? -ne 0 ]]; then usage >&2; exit 1; fi
eval "set -- $parsed_opts"
while true; do
    case "$1" in
	"-h"|"--help") usage; exit 0               ;;
	"--init") shift; emacs_init=$1             ;;
	"-o"|"--output") shift; output=$1          ;;
	"--org-clock-csv") shift; org_clock_csv=$1 ;;
	--) shift; break                           ;;
	*) usage >&2; exit 1                       ;;
    esac
    shift
done

emacs -batch -l "$emacs_init" -l "$org_clock_csv" -f org-clock-csv-batch-and-exit $@ > $output

exit $?
