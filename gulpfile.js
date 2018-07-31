const gulp          = require('gulp');
const babel         = require('rollup-plugin-babel');
const rollup        = require('rollup');
const commonjs      = require('rollup-plugin-commonjs');
const nodeResolve   = require('rollup-plugin-node-resolve');

// Concatenate & Minify src and dependencies
gulp.task('scripts', function() {

	return rollup.rollup({
		input: './src/L.HeatBin.js',
		output: {
			format: 'umd',
			name: 'leaflet-heatbin',
			globals: {
				'heatmap.js': 'h337',
				'turf': 'turf'
			}
		},
		plugins: [
			babel({
				exclude: 'node_modules/**' // only transpile our source code
			}),
			nodeResolve({
				// pass custom options to the resolve plugin
				customResolveOptions: {
					moduleDirectory: 'node_modules'
				},
				jsnext: true,
				module: true,
				main: true,  // for commonjs modules that have an index.js
				browser: true
			}),
			commonjs({
				include:
					'node_modules/**'
			})
		],
		// indicate which modules should be treated as external
		external: ['heatmap.js', 'turf']
	})

	// and output to ./dist/app.js as normal.
	.then(bundle => {
		return bundle.write({
			file: './dist/leaflet-heatbin.js',
			format: 'umd',
			name: 'leaflet-heatbin',
			sourcemap: true
		});
	});

});

// Watch Files For Changes
gulp.task('watch', function() {
	return gulp.watch('src/*.js', gulp.series('scripts'));
});

// Default Task
gulp.task('default', gulp.series('scripts', 'watch'));