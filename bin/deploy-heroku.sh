#!/bin/sh -e

git branch -D heroku
git checkout -b heroku
cp hosting/heroku/* .
git add .
git commit -m 'Heroku config files'
git push --set-upstream origin heroku --force
git checkout master
