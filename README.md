# leaflet-heatbin [![NPM version][npm-image]][npm-url] [![NPM Downloads][npm-downloads-image]][npm-url]

**ALPHA** plugin for heatmap.js to add heatmaps to leaflet.

## what?
This is an enhanced version of
[leaflet-heatmap](https://www.patrick-wied.at/static/heatmapjs/example-heatmap-leaflet.html) that provides greater
control over how data points are grouped to create a heatmap.

## why?
Most heatmaps provide little control over how data is grouped beyond a pixel radius.
For many use-cases that is not enough - we often need to know exactly what data is in each cluster.

# how?
This plugin provides two ways of doing this better:

1. Allows you to define the radius in **meters** instead of pixels.
2. Allows you to define a grid of square cells which are used for value binning.



## License
MIT License (MIT)

[npm-image]: https://badge.fury.io/js/leaflet-heatbin.svg
[npm-url]: https://www.npmjs.com/package/leaflet-heatbin
[npm-downloads-image]: https://img.shields.io/npm/dt/leaflet-heatbin.svg