#!/bin/sh

mkdir -p static/data

# golfCourses.json
wget "${JSON_URL_GOLF_COURSE}" -O 'golfCourses.json' &&
mv -v golfCourses.json static/data/ &&

# golfSchools.json
wget "${JSON_URL_GOLF_SCHOOLS}" -O 'golfSchools.json' &&
mv -v golfSchools.json static/data/ &&

node lib/contentful/fetch.js &&

astro build &&

rm -rfv dist/amp &&
cp -rv dist amp &&
mv -v amp dist &&
cd dist/amp &&

rm -rfv categories tags elements images privacy-policy tags 404.html index.html &&

# delete files exclude .html
find ./ -type f ! -name "*.html" -delete &&

# delete empty folders
find ./ -type d -empty -delete &&

cd ../../ &&

node ampify.mjs
