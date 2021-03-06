(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory(require('heatmap.js'), require('@turf/turf')) :
	typeof define === 'function' && define.amd ? define(['heatmap.js', '@turf/turf'], factory) :
	(global['leaflet-heatbin'] = factory(global.h337,global.turf));
}(this, (function (h337,turf) { 'use strict';

	h337 = h337 && h337.hasOwnProperty('default') ? h337['default'] : h337;
	turf = turf && turf.hasOwnProperty('default') ? turf['default'] : turf;

	const HeatBin = (L.Layer ? L.Layer : L.Class).extend({

		/*--------------------------------------------- LEAFLET HOOKS ---------------------------------------------*/

		initialize: function (config) {
			this.cfg = config;
			this._el = L.DomUtil.create('div', 'leaflet-zoom-hide');
			this._data = [];
			this._max = 1;
			this._min = 0;
			this.cfg.container = this._el;

			this._gridBBOX = null;
			this._xCellLength = null;
			this._yCellLength = null;
			this._totalGridCells = null;
		},

		onAdd: function (map) {
			var size = map.getSize();

			this._map = map;

			this._width = size.x;
			this._height = size.y;

			this._el.style.width = size.x + 'px';
			this._el.style.height = size.y + 'px';
			this._el.style.position = 'absolute';
			this._origin = this._map.layerPointToLatLng(new L.Point(0, 0));

			map.getPanes().overlayPane.appendChild(this._el);

			if (!this._heatmap) {
				this._heatmap = h337.create(this.cfg);
			}

			this._isActive = true;

			// this resets the origin and redraws whenever
			// the zoom changed or the map has been moved
			map.on('moveend', this._reset, this);
			this._draw();
		},

		addTo: function (map) {
			map.addLayer(this);
			return this;
		},

		onRemove: function (map) {
			// remove layer's DOM elements and listeners
			map.getPanes().overlayPane.removeChild(this._el);
			map.off('moveend', this._reset, this);
			this._isActive = false;
		},

		/*--------------------------------------------- PUBLIC ---------------------------------------------*/

		isActive: function () {
			return this._isActive;
		},

		/**
	  * Returns leaflet LatLngBounds of the layer data
	  */
		getLatLngBounds(data) {
			data = data || this._data;
			if (data.length < 1) return null;
			return L.latLngBounds(data.map(d => {
				return [d[this._latField], d[this._lngField]];
			}));
		},

		update: function () {

			var bounds, zoom, scale;
			var generatedData = { max: this._max, min: this._min, data: [] };

			bounds = this._map.getBounds();
			zoom = this._map.getZoom();
			scale = Math.pow(2, zoom);

			if (this._data.length == 0) {
				if (this._heatmap) {
					this._heatmap.setData(generatedData);
				}
				return;
			}

			var latLngPoints = [];
			var radiusMultiplier = this.cfg.scaleRadius ? scale : 1;
			var localMax = 0;
			var localMin = 0;
			var valueField = this.cfg.valueField;
			var len = this._data.length;

			while (len--) {
				var entry = this._data[len];
				var value = entry[valueField];
				var latlng = entry.latlng;

				// we don't wanna render points that are not even on the map ;-)
				if (!bounds.contains(latlng)) {
					continue;
				}
				// local max is the maximum within current bounds
				localMax = Math.max(value, localMax);
				localMin = Math.min(value, localMin);

				var point = this._map.latLngToContainerPoint(latlng);
				var latlngPoint = { x: Math.round(point.x), y: Math.round(point.y) };
				latlngPoint[valueField] = value;

				var radius;

				if (this.cfg.fixedRadius && this.cfg.radiusMeters) {
					radius = this._getPixelRadius();
				} else if (entry.radius) {
					radius = entry.radius * radiusMultiplier;
				} else {
					radius = (this.cfg.radius || 2) * radiusMultiplier;
				}
				latlngPoint.radius = radius;
				latLngPoints.push(latlngPoint);
			}
			if (this.cfg.useLocalExtrema) {
				generatedData.max = localMax;
				generatedData.min = localMin;
			}

			generatedData.data = latLngPoints;
			this._heatmap.setData(generatedData);
		},

		setData: function (options) {

			this._max = options.max || this._max;
			this._min = options.min || this._min;
			this._maxFactor = this.cfg.heatBin && this.cfg.heatBin.maxFactor ? this.cfg.heatBin.maxFactor : 1;
			this._latField = this.cfg.latField || 'lat';
			this._lngField = this.cfg.lngField || 'lng';
			this._valueField = this.cfg.valueField || 'value';
			const self = this;
			var data = options.data;

			// compute grid if we're binning
			if (data.length > 0 && this.cfg.heatBin && this.cfg.heatBin.enabled) {
				this._cellSizeKm = this.cfg.heatBin.cellSizeKm || 5;
				data = this._computeHeatmapGrid(data);
				this._max = data.map(d => {
					return d.value;
				}).reduce(function (a, b) {
					return Math.max(a, b);
				}) * this._maxFactor;
			}

			var len = data.length;
			var d = [];

			// transform data to latlngs
			while (len--) {
				var entry = data[len];
				var latlng = new L.LatLng(entry[self._latField], entry[self._lngField]);
				var dataObj = { latlng: latlng };
				dataObj[self._valueField] = entry[self._valueField];
				if (entry.radius) {
					dataObj.radius = entry.radius;
				}
				d.push(dataObj);
			}

			this._data = d;
			this._draw();
		},

		/**
	  * Returns information about the heatBin grid
	  */
		getGridInfo: function () {
			return {
				bbox: this._gridBBOX,
				xCellLength: this._xCellLength,
				yCellLength: this._yCellLength,
				totalCellLength: this._totalGridCells,
				maxFactor: this._maxFactor,
				minCellCount: this._minCellCount,
				maxCellCount: this._maxCellCount
			};
		},

		/*--------------------------------------------- PRIVATE ---------------------------------------------*/

		_draw: function () {
			if (!this._map) {
				return;
			}

			var mapPane = this._map.getPanes().mapPane;
			var point = mapPane._leaflet_pos;

			// reposition the layer
			this._el.style[HeatBin.CSS_TRANSFORM] = 'translate(' + -Math.round(point.x) + 'px,' + -Math.round(point.y) + 'px)';

			this.update();
		},

		_getPixelRadius: function () {

			var centerLatLng = this._map.getCenter();
			var pointC = this._map.latLngToContainerPoint(centerLatLng);
			var pointX = [pointC.x + 1, pointC.y];

			// convert containerpoints to latlng's
			var latLngC = this._map.containerPointToLatLng(pointC);
			var latLngX = this._map.containerPointToLatLng(pointX);

			// Assuming distance only depends on latitude
			var distanceX = latLngC.distanceTo(latLngX);
			// 100 meters is the fixed distance here
			var pixels = this.cfg.radiusMeters / distanceX;

			return pixels >= 1 ? pixels : 1;
		},

		_reset: function () {
			this._origin = this._map.layerPointToLatLng(new L.Point(0, 0));

			var size = this._map.getSize();
			if (this._width !== size.x || this._height !== size.y) {
				this._width = size.x;
				this._height = size.y;

				this._el.style.width = this._width + 'px';
				this._el.style.height = this._height + 'px';

				this._heatmap._renderer.setDimensions(this._width, this._height);
			}
			this._draw();
		},

		_computeHeatmapGrid(data) {

			// CREATE BBOX
			const bounds = this.getLatLngBounds(data);
			if (!bounds) return false;

			// minX, minY, maxX, maxY
			const bbox = [bounds.getWest(), bounds.getNorth(), bounds.getEast(), bounds.getSouth()];

			// CREATE A GRID OF CELLS
			// GRID origin is bottomRight
			// the indexes increment by:
			// xCol=0, yRow upwards, then xCol=1 etc.
			const lengthKm = this._cellSizeKm;
			const grid = turf.squareGrid(bbox, lengthKm, { units: 'kilometers' });

			grid.features.reverse();
			grid.features.forEach((f, index) => {
				f.properties['index'] = index;
			});

			// DEBUG - plot the binning grid on map
			if (this.cfg.heatBin && this.cfg.heatBin.showBinGrid) {
				L.geoJSON(grid, {
					style: function (feature) {
						return {
							weight: 1,
							opacity: 0.7,
							fill: false
						};
					},
					onEachFeature: function (feature, layer) {
						layer.bindTooltip(`cell index: ${feature.properties.index}`);
					}
				}).addTo(this._map);
			}

			// minX, minY, maxX, maxY
			this._gridBBOX = turf.bbox(grid);

			// calc XY lengths
			// change to use actual features..
			const gridBottomLeft = turf.point([this._gridBBOX[0], this._gridBBOX[1]]);
			const gridBottomRight = turf.point([this._gridBBOX[2], this._gridBBOX[1]]);
			const gridTopLeft = turf.point([this._gridBBOX[0], this._gridBBOX[3]]);
			const xGridLength = turf.distance(gridBottomLeft, gridBottomRight, { units: 'kilometers' });
			const yGridLength = turf.distance(gridBottomLeft, gridTopLeft, { units: 'kilometers' });

			// calc XY cell length of grid
			this._xCellLength = Math.round(xGridLength / lengthKm);
			this._yCellLength = Math.round(yGridLength / lengthKm);
			this._totalGridCells = this._xCellLength * this._yCellLength;

			console.log(`xGridLenth: ${this.xGridLength}, yGridLenth: ${this.yGridLength}`);
			console.log(`xCellLenth: ${this._xCellLength}, yCellLenth: ${this._yCellLength}`);
			console.log(`total cells: ${this._totalGridCells}`);

			// PUT EACH POINT INTO A CELL
			const points = data.map(d => {
				return {
					lat: d[this._latField],
					lng: d[this._lngField],
					uid: d['uid'] || null
				};
			});

			// for each point get its offset from minX and minY
			points.forEach(p => {

				// point dist from left
				let xDist = turf.distance(turf.point([p.lng, p.lat]), turf.point([this._gridBBOX[2], p.lat]), { units: 'kilometers' });
				// point dist from bottom
				let yDist = turf.distance(turf.point([p.lng, p.lat]), turf.point([p.lng, this._gridBBOX[1]]), { units: 'kilometers' });
				// points *can* fall outside the grid bounds, which doesn't
				// exactly match the data bounds, pull them back into nearest cell
				if (yDist > yGridLength) yDist = yGridLength - lengthKm / 2;
				if (xDist > xGridLength) xDist = xGridLength - lengthKm / 2;

				// find the XY cell indices
				let xCell = Math.floor(xDist / lengthKm);
				let yCell = Math.floor(yDist / lengthKm);

				// translate 2D index into 1D index
				let i = xCell * this._yCellLength + yCell;
				if (i >= this._totalGridCells) return i = this._totalGridCells - 1;

				// only count unique if using uid
				if (grid.features[i].properties.count) {
					if (p.uid !== null && grid.features[i].properties.uids.indexOf(p.uid) === -1) {
						grid.features[i].properties.count++;
						grid.features[i].properties.uids.push(p.uid);
					}
					// add first count
				} else {
					grid.features[i].properties['count'] = 1;
					if (p.uid !== null) grid.features[i].properties.uids = [p.uid];
				}
			});

			// USE EACH CELL AS A HEATMAP DATA POINT
			let heatmapCells = [];

			this._minCellCount = 0;
			this._maxCellCount = 0;

			grid.features.forEach(f => {
				if (f.properties.count) {
					let centroid = turf.centroid(f);

					if (f.properties.count < this._minCellCount) this._minCellCount = f.properties.count;
					if (f.properties.count > this._maxCellCount) this._maxCellCount = f.properties.count;

					heatmapCells.push({
						lat: centroid.geometry.coordinates[1],
						lng: centroid.geometry.coordinates[0],
						value: f.properties.count + 1
					});
				}
			});

			return heatmapCells;
		}
	});

	HeatBin.CSS_TRANSFORM = function () {
		var div = document.createElement('div');
		var props = ['transform', 'WebkitTransform', 'MozTransform', 'OTransform', 'msTransform'];

		for (var i = 0; i < props.length; i++) {
			var prop = props[i];
			if (div.style[prop] !== undefined) {
				return prop;
			}
		}
		return props[0];
	}();

	L.heatBin = function (options) {
		return new HeatBin(options);
	};

	var L_HeatBin = L.heatBin;

	return L_HeatBin;

})));
//# sourceMappingURL=leaflet-heatbin.js.map
