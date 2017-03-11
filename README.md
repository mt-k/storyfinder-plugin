# Folders

* /js contains the uncompressed javascript for the content-script
* /less contains the sources for the content-styles
* /plugin contains the plugin which gets bundled and installed in firefox

# Development

Requirements:
* browserify
* nodejs / npm
* jpm

## Build the contentscript

```
$ cd /js
$ npm install
$ browserify index.js -t babelify -t [hbsfy -t] -o ../plugin/data/contentscript.js
```

## Build the contentstyle

```
$ cd /less
$ npm install
$ grunt less
```

## Install plugin dependencies

```
cd /plugin
npm install
```

## Bundle the plugin

```
cd /plugin
jpm xpi
```
