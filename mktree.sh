#!/bin/sh
exec tree --prune -d -I 'node_modules|tmp|out|spec|images/.' . > tmp/tree.txt
