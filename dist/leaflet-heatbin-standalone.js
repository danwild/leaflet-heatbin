(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory(require('turf')) :
	typeof define === 'function' && define.amd ? define(['turf'], factory) :
	(global['leaflet-heatbin'] = factory(global.turf));
}(this, (function (turf) { 'use strict';

	turf = turf && turf.hasOwnProperty('default') ? turf['default'] : turf;

	var commonjsGlobal = typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : typeof self !== 'undefined' ? self : {};

	function createCommonjsModule(fn, module) {
		return module = { exports: {} }, fn(module, module.exports), module.exports;
	}

	var heatmap = createCommonjsModule(function (module) {
	(function (name, context, factory) {

	  // Supports UMD. AMD, CommonJS/Node.js and browser context
	  if (module.exports) {
	    module.exports = factory();
	  } else {
	    context[name] = factory();
	  }

	})("h337", commonjsGlobal, function () {

	// Heatmap Config stores default values and will be merged with instance config
	var HeatmapConfig = {
	  defaultRadius: 40,
	  defaultRenderer: 'canvas2d',
	  defaultGradient: { 0.25: "rgb(0,0,255)", 0.55: "rgb(0,255,0)", 0.85: "yellow", 1.0: "rgb(255,0,0)"},
	  defaultMaxOpacity: 1,
	  defaultMinOpacity: 0,
	  defaultBlur: .85,
	  defaultXField: 'x',
	  defaultYField: 'y',
	  defaultValueField: 'value', 
	  plugins: {}
	};
	var Store = (function StoreClosure() {

	  var Store = function Store(config) {
	    this._coordinator = {};
	    this._data = [];
	    this._radi = [];
	    this._min = 10;
	    this._max = 1;
	    this._xField = config['xField'] || config.defaultXField;
	    this._yField = config['yField'] || config.defaultYField;
	    this._valueField = config['valueField'] || config.defaultValueField;

	    if (config["radius"]) {
	      this._cfgRadius = config["radius"];
	    }
	  };

	  var defaultRadius = HeatmapConfig.defaultRadius;

	  Store.prototype = {
	    // when forceRender = false -> called from setData, omits renderall event
	    _organiseData: function(dataPoint, forceRender) {
	        var x = dataPoint[this._xField];
	        var y = dataPoint[this._yField];
	        var radi = this._radi;
	        var store = this._data;
	        var max = this._max;
	        var min = this._min;
	        var value = dataPoint[this._valueField] || 1;
	        var radius = dataPoint.radius || this._cfgRadius || defaultRadius;

	        if (!store[x]) {
	          store[x] = [];
	          radi[x] = [];
	        }

	        if (!store[x][y]) {
	          store[x][y] = value;
	          radi[x][y] = radius;
	        } else {
	          store[x][y] += value;
	        }
	        var storedVal = store[x][y];

	        if (storedVal > max) {
	          if (!forceRender) {
	            this._max = storedVal;
	          } else {
	            this.setDataMax(storedVal);
	          }
	          return false;
	        } else if (storedVal < min) {
	          if (!forceRender) {
	            this._min = storedVal;
	          } else {
	            this.setDataMin(storedVal);
	          }
	          return false;
	        } else {
	          return { 
	            x: x, 
	            y: y,
	            value: value, 
	            radius: radius,
	            min: min,
	            max: max 
	          };
	        }
	    },
	    _unOrganizeData: function() {
	      var unorganizedData = [];
	      var data = this._data;
	      var radi = this._radi;

	      for (var x in data) {
	        for (var y in data[x]) {

	          unorganizedData.push({
	            x: x,
	            y: y,
	            radius: radi[x][y],
	            value: data[x][y]
	          });

	        }
	      }
	      return {
	        min: this._min,
	        max: this._max,
	        data: unorganizedData
	      };
	    },
	    _onExtremaChange: function() {
	      this._coordinator.emit('extremachange', {
	        min: this._min,
	        max: this._max
	      });
	    },
	    addData: function() {
	      if (arguments[0].length > 0) {
	        var dataArr = arguments[0];
	        var dataLen = dataArr.length;
	        while (dataLen--) {
	          this.addData.call(this, dataArr[dataLen]);
	        }
	      } else {
	        // add to store  
	        var organisedEntry = this._organiseData(arguments[0], true);
	        if (organisedEntry) {
	          // if it's the first datapoint initialize the extremas with it
	          if (this._data.length === 0) {
	            this._min = this._max = organisedEntry.value;
	          }
	          this._coordinator.emit('renderpartial', {
	            min: this._min,
	            max: this._max,
	            data: [organisedEntry]
	          });
	        }
	      }
	      return this;
	    },
	    setData: function(data) {
	      var dataPoints = data.data;
	      var pointsLen = dataPoints.length;


	      // reset data arrays
	      this._data = [];
	      this._radi = [];

	      for(var i = 0; i < pointsLen; i++) {
	        this._organiseData(dataPoints[i], false);
	      }
	      this._max = data.max;
	      this._min = data.min || 0;
	      
	      this._onExtremaChange();
	      this._coordinator.emit('renderall', this._getInternalData());
	      return this;
	    },
	    removeData: function() {
	      // TODO: implement
	    },
	    setDataMax: function(max) {
	      this._max = max;
	      this._onExtremaChange();
	      this._coordinator.emit('renderall', this._getInternalData());
	      return this;
	    },
	    setDataMin: function(min) {
	      this._min = min;
	      this._onExtremaChange();
	      this._coordinator.emit('renderall', this._getInternalData());
	      return this;
	    },
	    setCoordinator: function(coordinator) {
	      this._coordinator = coordinator;
	    },
	    _getInternalData: function() {
	      return { 
	        max: this._max,
	        min: this._min, 
	        data: this._data,
	        radi: this._radi 
	      };
	    },
	    getData: function() {
	      return this._unOrganizeData();
	    }/*,

	      TODO: rethink.

	    getValueAt: function(point) {
	      var value;
	      var radius = 100;
	      var x = point.x;
	      var y = point.y;
	      var data = this._data;

	      if (data[x] && data[x][y]) {
	        return data[x][y];
	      } else {
	        var values = [];
	        // radial search for datapoints based on default radius
	        for(var distance = 1; distance < radius; distance++) {
	          var neighbors = distance * 2 +1;
	          var startX = x - distance;
	          var startY = y - distance;

	          for(var i = 0; i < neighbors; i++) {
	            for (var o = 0; o < neighbors; o++) {
	              if ((i == 0 || i == neighbors-1) || (o == 0 || o == neighbors-1)) {
	                if (data[startY+i] && data[startY+i][startX+o]) {
	                  values.push(data[startY+i][startX+o]);
	                }
	              } else {
	                continue;
	              } 
	            }
	          }
	        }
	        if (values.length > 0) {
	          return Math.max.apply(Math, values);
	        }
	      }
	      return false;
	    }*/
	  };


	  return Store;
	})();

	var Canvas2dRenderer = (function Canvas2dRendererClosure() {

	  var _getColorPalette = function(config) {
	    var gradientConfig = config.gradient || config.defaultGradient;
	    var paletteCanvas = document.createElement('canvas');
	    var paletteCtx = paletteCanvas.getContext('2d');

	    paletteCanvas.width = 256;
	    paletteCanvas.height = 1;

	    var gradient = paletteCtx.createLinearGradient(0, 0, 256, 1);
	    for (var key in gradientConfig) {
	      gradient.addColorStop(key, gradientConfig[key]);
	    }

	    paletteCtx.fillStyle = gradient;
	    paletteCtx.fillRect(0, 0, 256, 1);

	    return paletteCtx.getImageData(0, 0, 256, 1).data;
	  };

	  var _getPointTemplate = function(radius, blurFactor) {
	    var tplCanvas = document.createElement('canvas');
	    var tplCtx = tplCanvas.getContext('2d');
	    var x = radius;
	    var y = radius;
	    tplCanvas.width = tplCanvas.height = radius*2;

	    if (blurFactor == 1) {
	      tplCtx.beginPath();
	      tplCtx.arc(x, y, radius, 0, 2 * Math.PI, false);
	      tplCtx.fillStyle = 'rgba(0,0,0,1)';
	      tplCtx.fill();
	    } else {
	      var gradient = tplCtx.createRadialGradient(x, y, radius*blurFactor, x, y, radius);
	      gradient.addColorStop(0, 'rgba(0,0,0,1)');
	      gradient.addColorStop(1, 'rgba(0,0,0,0)');
	      tplCtx.fillStyle = gradient;
	      tplCtx.fillRect(0, 0, 2*radius, 2*radius);
	    }



	    return tplCanvas;
	  };

	  var _prepareData = function(data) {
	    var renderData = [];
	    var min = data.min;
	    var max = data.max;
	    var radi = data.radi;
	    var data = data.data;

	    var xValues = Object.keys(data);
	    var xValuesLen = xValues.length;

	    while(xValuesLen--) {
	      var xValue = xValues[xValuesLen];
	      var yValues = Object.keys(data[xValue]);
	      var yValuesLen = yValues.length;
	      while(yValuesLen--) {
	        var yValue = yValues[yValuesLen];
	        var value = data[xValue][yValue];
	        var radius = radi[xValue][yValue];
	        renderData.push({
	          x: xValue,
	          y: yValue,
	          value: value,
	          radius: radius
	        });
	      }
	    }

	    return {
	      min: min,
	      max: max,
	      data: renderData
	    };
	  };


	  function Canvas2dRenderer(config) {
	    var container = config.container;
	    var shadowCanvas = this.shadowCanvas = document.createElement('canvas');
	    var canvas = this.canvas = config.canvas || document.createElement('canvas');
	    var renderBoundaries = this._renderBoundaries = [10000, 10000, 0, 0];

	    var computed = getComputedStyle(config.container) || {};

	    canvas.className = 'heatmap-canvas';

	    this._width = canvas.width = shadowCanvas.width = config.width || +(computed.width.replace(/px/,''));
	    this._height = canvas.height = shadowCanvas.height = config.height || +(computed.height.replace(/px/,''));

	    this.shadowCtx = shadowCanvas.getContext('2d');
	    this.ctx = canvas.getContext('2d');

	    // @TODO:
	    // conditional wrapper

	    canvas.style.cssText = shadowCanvas.style.cssText = 'position:absolute;left:0;top:0;';

	    container.style.position = 'relative';
	    container.appendChild(canvas);

	    this._palette = _getColorPalette(config);
	    this._templates = {};

	    this._setStyles(config);
	  }
	  Canvas2dRenderer.prototype = {
	    renderPartial: function(data) {
	      if (data.data.length > 0) {
	        this._drawAlpha(data);
	        this._colorize();
	      }
	    },
	    renderAll: function(data) {
	      // reset render boundaries
	      this._clear();
	      if (data.data.length > 0) {
	        this._drawAlpha(_prepareData(data));
	        this._colorize();
	      }
	    },
	    _updateGradient: function(config) {
	      this._palette = _getColorPalette(config);
	    },
	    updateConfig: function(config) {
	      if (config['gradient']) {
	        this._updateGradient(config);
	      }
	      this._setStyles(config);
	    },
	    setDimensions: function(width, height) {
	      this._width = width;
	      this._height = height;
	      this.canvas.width = this.shadowCanvas.width = width;
	      this.canvas.height = this.shadowCanvas.height = height;
	    },
	    _clear: function() {
	      this.shadowCtx.clearRect(0, 0, this._width, this._height);
	      this.ctx.clearRect(0, 0, this._width, this._height);
	    },
	    _setStyles: function(config) {
	      this._blur = (config.blur == 0)?0:(config.blur || config.defaultBlur);

	      if (config.backgroundColor) {
	        this.canvas.style.backgroundColor = config.backgroundColor;
	      }

	      this._width = this.canvas.width = this.shadowCanvas.width = config.width || this._width;
	      this._height = this.canvas.height = this.shadowCanvas.height = config.height || this._height;


	      this._opacity = (config.opacity || 0) * 255;
	      this._maxOpacity = (config.maxOpacity || config.defaultMaxOpacity) * 255;
	      this._minOpacity = (config.minOpacity || config.defaultMinOpacity) * 255;
	      this._useGradientOpacity = !!config.useGradientOpacity;
	    },
	    _drawAlpha: function(data) {
	      var min = this._min = data.min;
	      var max = this._max = data.max;
	      var data = data.data || [];
	      var dataLen = data.length;
	      // on a point basis?
	      var blur = 1 - this._blur;

	      while(dataLen--) {

	        var point = data[dataLen];

	        var x = point.x;
	        var y = point.y;
	        var radius = point.radius;
	        // if value is bigger than max
	        // use max as value
	        var value = Math.min(point.value, max);
	        var rectX = x - radius;
	        var rectY = y - radius;
	        var shadowCtx = this.shadowCtx;




	        var tpl;
	        if (!this._templates[radius]) {
	          this._templates[radius] = tpl = _getPointTemplate(radius, blur);
	        } else {
	          tpl = this._templates[radius];
	        }
	        // value from minimum / value range
	        // => [0, 1]
	        var templateAlpha = (value-min)/(max-min);
	        // this fixes #176: small values are not visible because globalAlpha < .01 cannot be read from imageData
	        shadowCtx.globalAlpha = templateAlpha < .01 ? .01 : templateAlpha;

	        shadowCtx.drawImage(tpl, rectX, rectY);

	        // update renderBoundaries
	        if (rectX < this._renderBoundaries[0]) {
	            this._renderBoundaries[0] = rectX;
	          }
	          if (rectY < this._renderBoundaries[1]) {
	            this._renderBoundaries[1] = rectY;
	          }
	          if (rectX + 2*radius > this._renderBoundaries[2]) {
	            this._renderBoundaries[2] = rectX + 2*radius;
	          }
	          if (rectY + 2*radius > this._renderBoundaries[3]) {
	            this._renderBoundaries[3] = rectY + 2*radius;
	          }

	      }
	    },
	    _colorize: function() {
	      var x = this._renderBoundaries[0];
	      var y = this._renderBoundaries[1];
	      var width = this._renderBoundaries[2] - x;
	      var height = this._renderBoundaries[3] - y;
	      var maxWidth = this._width;
	      var maxHeight = this._height;
	      var opacity = this._opacity;
	      var maxOpacity = this._maxOpacity;
	      var minOpacity = this._minOpacity;
	      var useGradientOpacity = this._useGradientOpacity;

	      if (x < 0) {
	        x = 0;
	      }
	      if (y < 0) {
	        y = 0;
	      }
	      if (x + width > maxWidth) {
	        width = maxWidth - x;
	      }
	      if (y + height > maxHeight) {
	        height = maxHeight - y;
	      }

	      var img = this.shadowCtx.getImageData(x, y, width, height);
	      var imgData = img.data;
	      var len = imgData.length;
	      var palette = this._palette;


	      for (var i = 3; i < len; i+= 4) {
	        var alpha = imgData[i];
	        var offset = alpha * 4;


	        if (!offset) {
	          continue;
	        }

	        var finalAlpha;
	        if (opacity > 0) {
	          finalAlpha = opacity;
	        } else {
	          if (alpha < maxOpacity) {
	            if (alpha < minOpacity) {
	              finalAlpha = minOpacity;
	            } else {
	              finalAlpha = alpha;
	            }
	          } else {
	            finalAlpha = maxOpacity;
	          }
	        }

	        imgData[i-3] = palette[offset];
	        imgData[i-2] = palette[offset + 1];
	        imgData[i-1] = palette[offset + 2];
	        imgData[i] = useGradientOpacity ? palette[offset + 3] : finalAlpha;

	      }

	      img.data = imgData;
	      this.ctx.putImageData(img, x, y);

	      this._renderBoundaries = [1000, 1000, 0, 0];

	    },
	    getValueAt: function(point) {
	      var value;
	      var shadowCtx = this.shadowCtx;
	      var img = shadowCtx.getImageData(point.x, point.y, 1, 1);
	      var data = img.data[3];
	      var max = this._max;
	      var min = this._min;

	      value = (Math.abs(max-min) * (data/255)) >> 0;

	      return value;
	    },
	    getDataURL: function() {
	      return this.canvas.toDataURL();
	    }
	  };


	  return Canvas2dRenderer;
	})();


	var Renderer = (function RendererClosure() {

	  var rendererFn = false;

	  if (HeatmapConfig['defaultRenderer'] === 'canvas2d') {
	    rendererFn = Canvas2dRenderer;
	  }

	  return rendererFn;
	})();


	var Util = {
	  merge: function() {
	    var merged = {};
	    var argsLen = arguments.length;
	    for (var i = 0; i < argsLen; i++) {
	      var obj = arguments[i];
	      for (var key in obj) {
	        merged[key] = obj[key];
	      }
	    }
	    return merged;
	  }
	};
	// Heatmap Constructor
	var Heatmap = (function HeatmapClosure() {

	  var Coordinator = (function CoordinatorClosure() {

	    function Coordinator() {
	      this.cStore = {};
	    }
	    Coordinator.prototype = {
	      on: function(evtName, callback, scope) {
	        var cStore = this.cStore;

	        if (!cStore[evtName]) {
	          cStore[evtName] = [];
	        }
	        cStore[evtName].push((function(data) {
	            return callback.call(scope, data);
	        }));
	      },
	      emit: function(evtName, data) {
	        var cStore = this.cStore;
	        if (cStore[evtName]) {
	          var len = cStore[evtName].length;
	          for (var i=0; i<len; i++) {
	            var callback = cStore[evtName][i];
	            callback(data);
	          }
	        }
	      }
	    };

	    return Coordinator;
	  })();


	  var _connect = function(scope) {
	    var renderer = scope._renderer;
	    var coordinator = scope._coordinator;
	    var store = scope._store;

	    coordinator.on('renderpartial', renderer.renderPartial, renderer);
	    coordinator.on('renderall', renderer.renderAll, renderer);
	    coordinator.on('extremachange', function(data) {
	      scope._config.onExtremaChange &&
	      scope._config.onExtremaChange({
	        min: data.min,
	        max: data.max,
	        gradient: scope._config['gradient'] || scope._config['defaultGradient']
	      });
	    });
	    store.setCoordinator(coordinator);
	  };


	  function Heatmap() {
	    var config = this._config = Util.merge(HeatmapConfig, arguments[0] || {});
	    this._coordinator = new Coordinator();
	    if (config['plugin']) {
	      var pluginToLoad = config['plugin'];
	      if (!HeatmapConfig.plugins[pluginToLoad]) {
	        throw new Error('Plugin \''+ pluginToLoad + '\' not found. Maybe it was not registered.');
	      } else {
	        var plugin = HeatmapConfig.plugins[pluginToLoad];
	        // set plugin renderer and store
	        this._renderer = new plugin.renderer(config);
	        this._store = new plugin.store(config);
	      }
	    } else {
	      this._renderer = new Renderer(config);
	      this._store = new Store(config);
	    }
	    _connect(this);
	  }
	  // @TODO:
	  // add API documentation
	  Heatmap.prototype = {
	    addData: function() {
	      this._store.addData.apply(this._store, arguments);
	      return this;
	    },
	    removeData: function() {
	      this._store.removeData && this._store.removeData.apply(this._store, arguments);
	      return this;
	    },
	    setData: function() {
	      this._store.setData.apply(this._store, arguments);
	      return this;
	    },
	    setDataMax: function() {
	      this._store.setDataMax.apply(this._store, arguments);
	      return this;
	    },
	    setDataMin: function() {
	      this._store.setDataMin.apply(this._store, arguments);
	      return this;
	    },
	    configure: function(config) {
	      this._config = Util.merge(this._config, config);
	      this._renderer.updateConfig(this._config);
	      this._coordinator.emit('renderall', this._store._getInternalData());
	      return this;
	    },
	    repaint: function() {
	      this._coordinator.emit('renderall', this._store._getInternalData());
	      return this;
	    },
	    getData: function() {
	      return this._store.getData();
	    },
	    getDataURL: function() {
	      return this._renderer.getDataURL();
	    },
	    getValueAt: function(point) {

	      if (this._store.getValueAt) {
	        return this._store.getValueAt(point);
	      } else  if (this._renderer.getValueAt) {
	        return this._renderer.getValueAt(point);
	      } else {
	        return null;
	      }
	    }
	  };

	  return Heatmap;

	})();


	// core
	var heatmapFactory = {
	  create: function(config) {
	    return new Heatmap(config);
	  },
	  register: function(pluginKey, plugin) {
	    HeatmapConfig.plugins[pluginKey] = plugin;
	  }
	};

	return heatmapFactory;


	});
	});

	const HeatBin = (L.Layer ? L.Layer : L.Class).extend({

		/*--------------------------------------------- LEAFLET HOOKS ---------------------------------------------*/

		initialize: function (config) {
			this.cfg = config;
			this._el = L.DomUtil.create('div', 'leaflet-zoom-hide');
			this._data = [];
			this._max = 1;
			this._min = 0;
			this.cfg.container = this._el;
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
				this._heatmap = heatmap.create(this.cfg);
			}

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
		},

		/*--------------------------------------------- PUBLIC ---------------------------------------------*/

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

			const bottomLeft = [bounds.getWest(), bounds.getSouth()];
			const bottomRight = [bounds.getEast(), bounds.getSouth()];
			const topLeft = [bounds.getWest(), bounds.getNorth()];

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
			console.log(grid);

			// DEBUG - plot the binning grid on map
			if (this.cfg.heatBin && this.cfg.heatBin.showBinGrid) {
				L.geoJSON(grid, {
					style: function (feature) {
						return {
							weight: 1,
							fill: false
						};
					},
					onEachFeature: function (feature, layer) {
						layer.bindTooltip(`cell index: ${feature.properties.index}`);
					}
				}).addTo(this._map);
			}

			// calc XY lengths
			const xGridLength = turf.distance(turf.point(bottomLeft), turf.point(bottomRight), { units: 'kilometers' });
			const yGridLength = turf.distance(turf.point(bottomLeft), turf.point(topLeft), { units: 'kilometers' });
			console.log(`xGridLenth: ${xGridLength}, yGridLenth: ${yGridLength}`);

			// calc XY cell length of grid
			const xCellLength = Math.floor(xGridLength / lengthKm);
			const yCellLength = Math.floor(yGridLength / lengthKm);
			const totalCells = xCellLength * yCellLength;
			console.log(`xCellLenth: ${xCellLength}, yCellLenth: ${yCellLength}`);
			console.log(`total cells: ${totalCells}`);

			// PUT EACH POINT INTO A CELL
			const points = data.map(d => {
				return {
					lat: d[this._latField],
					lng: d[this._lngField]
				};
			});

			// for each point get its offset from minX and minY
			points.forEach(p => {

				// point dist from left
				const xDist = turf.distance(turf.point([p.lng, p.lat]), turf.point([bounds.getEast(), p.lat]), { units: 'kilometers' });
				// point dist from bottom
				const yDist = turf.distance(turf.point([p.lng, p.lat]), turf.point([p.lng, bounds.getSouth()]), { units: 'kilometers' });

				// find the XY cell indices
				let xCell = Math.round(xDist / lengthKm);
				let yCell = Math.round(yDist / lengthKm);

				// translate 2D index into 1D index
				let i = xCell * yCellLength + yCell;
				if (i >= totalCells) i = totalCells - 1;

				if (grid.features[i].properties.count) {
					grid.features[i].properties.count++;
				} else {
					grid.features[i].properties['count'] = 1;
				}
			});
			grid.features.forEach(f => {
				if (f.properties.count > 0) ;
			});

			// USE EACH CELL AS A HEATMAP DATA POINT
			let heatmapCells = [];
			grid.features.forEach(f => {
				if (f.properties.count) {
					let centroid = turf.centroid(f);
					heatmapCells.push({
						lat: centroid.geometry.coordinates[1],
						lng: centroid.geometry.coordinates[0],
						value: f.properties.count
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
//# sourceMappingURL=leaflet-heatbin-standalone.js.map
