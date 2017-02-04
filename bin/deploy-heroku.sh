#!/bin/sh -e

git diff-index --quiet HEAD -- || (
    echo "There are uncomitted changes." >&2
    git status --short
    exit 1
)
git branch -D heroku || true

git checkout -b heroku --quiet
cp hosting/heroku/* .
git add .
git commit -m 'Heroku config files' --quiet
git push --set-upstream origin heroku --force --quiet
git checkout master --quiet
