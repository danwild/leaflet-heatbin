# leaflet-heatbin [![NPM version][npm-image]][npm-url] [![NPM Downloads][npm-downloads-image]][npm-url]

**ALPHA** plugin for heatmap.js to add heatmaps to leaflet.

## what?
This is an enhanced version of
[leaflet-heatmap](https://www.patrick-wied.at/static/heatmapjs/example-heatmap-leaflet.html) that provides greater
control over how data points are grouped to create a heatmap.

## why?
Most heatmaps provide little control over how data is grouped beyond a pixel radius.

For many use-cases that is not enough - we often need to know exactly what data is in each cluster.

## how?
This plugin provides two ways of doing this better, you can either:

1. Define the radius in *meters* instead of pixels; and/or
2. Define a grid of cells which are used for value binning.

## cell binning example
```javascript
// define options
const options = {
  heatBin: {
    enabled:     true,
    cellSizeKm:  0.25, // e.g. bin values into 250m grid cells
    maxFactor:   0.8,  // heatmap max value will be multiplied by maxFactor
    showBinGrid: false // a debugging option, plots the binning grid on the map*
  },
  // plus any options from heatmap.js core
  radius: 20,
  useLocalExtrema: true,
  onExtremaChange: function(data) {
    console.log(data);
  }
};
const layer = L.heatBin(options);
layer.setData(myData);
```

## meter radius example
```javascript
// define options
const options = {
  fixedRadius: true,
  radiusMeters: 100
};
const layer = L.heatBin(options);
layer.setData(myData);
```

## data format

Essentially the same as vanilla
[heatmap.js](https://github.com/pa7/heatmap.js), with the addition of an optional param: `uid`.
When `uid` is specified and heatBin is enabled, a data point is only counted *once* per cell, per `uid`.

```javascript
const points = [
  {
    lat:   '<lat>',
    lng:   '<lng>'',
    value: 10,
    uid:   '<uid>' // optional
  }
]
```

## install, use

`npm install leaflet-heatbin --save`

This plugin has external dependencies:
- [heatmap.js](https://github.com/pa7/heatmap.js)
- [turf](https://github.com/Turfjs/turf)

To use this plugin, you either need to:
 - load these dependencies yourself (prior to loading `leaflet-heatbin`); or
 - use the standalone version with dependencies bundled, in `dist/leaflet-heatbin-standalone.js`

## public methods

|method|params|description|
|---|---|---|
|`isActive`||check if the particle layer is currently active on the map|
|`setData`|`data: {Object}`|update the layer with new data object|
|`update`||update the layer/trigger redraw|
|`getLatLngBounds`|`data: {Object}`, optional|Returns leaflet [LatLngBounds](https://leafletjs.com/reference-1.3.2.html#latlngbounds) of supplied, or layer data|
|`getGridInfo`||Get information about the grid used for binning|

## binning?
When binning is enabled, a grid of cells is generated using
[turf](https://github.com/Turfjs/turf), which is then used to cluster data points by grid cell indices.

If you're interested to see how your data is being gridded, you can set the `showBinGrid`
to true to see the grid at work:

![Screenshot](/screenshots/grid.png?raw=true)

## License
MIT License (MIT)

[npm-image]: https://badge.fury.io/js/leaflet-heatbin.svg
[npm-url]: https://www.npmjs.com/package/leaflet-heatbin
[npm-downloads-image]: https://img.shields.io/npm/dt/leaflet-heatbin.svg