let preprocessor = 'sass'; // Preprocessor (sass, scss, less, styl)
let fileswatch   = 'pug,html,htm,txt,json,md,woff2'; // List of files extensions for watching & hard reload (comma separated)
let imageswatch  = 'jpg,jpeg,png,webp,svg'; // List of images extensions for watching & compression (comma separated)

const { src, dest, parallel, series, watch, lastRun } = require('gulp');
const sass         = require('gulp-sass');
const scss         = require('gulp-sass');
const less         = require('gulp-less');
const styl         = require('gulp-stylus');
const cleancss     = require('gulp-clean-css');
const concat       = require('gulp-concat');
const browserSync  = require('browser-sync').create();
const uglify       = require('gulp-uglify-es').default;
const autoprefixer = require('gulp-autoprefixer');
const imagemin     = require('gulp-imagemin');
const newer        = require('gulp-newer');
const rsync        = require('gulp-rsync');
const del          = require('del');
const named        = require('vinyl-named');
const webpack      = require('webpack');
const webpackStream = require('webpack-stream');
const VueLoaderPlugin = require('vue-loader/lib/plugin');
var   ENV          = 'development';
var   pug          = require('gulp-pug');
const plumber      = require('gulp-plumber');
const notify	   = require('gulp-notify');

// Local Server
function browsersync() {
	browserSync.init({
		server: { baseDir: 'app' },
		notify: false,
		open: false
		// online: false, // Work offline without internet connection
	})
}

// Custom Styles

function styles() {
	return src([
		'app/sass/main.sass'
	])
	.pipe(named())
	.pipe(eval(preprocessor)())
	.pipe(autoprefixer({ overrideBrowserslist: ['last 10 versions'], grid: true }))
	.pipe(cleancss( {inline: ['none'], level: { 1: { specialComments: 0 } } }))
	.pipe(dest('app/css'))
	.pipe(browserSync.stream())
}

// Scripts & JS Libraries

function libs() {
	return src([
		'node_modules/jquery/dist/jquery.min.js', // npm vendor example (npm i --save-dev jquery)
		])
	.pipe(concat('libs.js'))
	.pipe(uglify()) // Minify JS (opt.)
	.pipe(dest('app/js'))
	.pipe(browserSync.stream())
}

function scripts() {
	return src([
		'app/js/src/app.js'
		])
	.pipe(named())
	.pipe(webpackStream({
		mode: ENV,
		module: {
			rules: [
				{
					test: /\.(js)$/,
					exclude: /(node_modules)/,
					loader: 'babel-loader',
					query: {
						presets: ["@babel/preset-env"]
					}
				},
				{
					test: /\.css$/i,
					use: ['style-loader', 'css-loader'],
				},
				{
					test: /\.vue$/,
					loader: 'vue-loader'
				},
				{
					test: /\.s[ac]ss$/i,
					use: [
						// Creates `style` nodes from JS strings
						'style-loader',
						// Translates CSS into CommonJS
						'css-loader',
						// Compiles Sass to CSS
						'sass-loader',
					],
				},
			]
		},
		plugins: [
			// make sure to include the plugin!
			new VueLoaderPlugin()
		]
	}))
	.pipe(dest('app/js'))
	.pipe(browserSync.stream())
}

// Images

function images() {
	return src('app/images/src/**/*')
	.pipe(newer('app/images/dest'))
	.pipe(imagemin())
	.pipe(dest('app/images/dest'))
}

function cleanimg() {
	return del('app/images/dest/**/*', { force: true })
}

// Deploy

function deploy() {
	return src('app/')
	.pipe(rsync({
		root: 'app/',
		hostname: 'username@yousite.com',
		destination: 'yousite/public_html/',
		// include: ['*.htaccess'], // Included files
		exclude: ['**/Thumbs.db', '**/*.DS_Store'], // Excluded files
		recursive: true,
		archive: true,
		silent: false,
		compress: true
	}))
}

// Watching

function startwatch() {
	watch('app/' + preprocessor + '/**/*', styles);
	watch(['app/js/src/**/*.js'], scripts);
	watch(['app/**/*.{' + imageswatch + '}'], images);
	watch(['app/**/*.pug']).on('change', views);
	watch(['app/**/*.{' + fileswatch + '}']).on('change', browserSync.reload);
}

function env (done) {
	ENV = 'production'

	done()
}

function views () {
	return src('app/pug/pages/*.pug')
		.pipe(plumber({ errorHandler: notify.onError("<%= error.message %>") }))
		.pipe(pug({
			pretty: true
		}))
		.pipe(dest('app/'))
}

exports.browsersync = browsersync;
exports.assets      = series(cleanimg, styles, libs, scripts, images);
exports.libs        = libs;
exports.styles      = styles;
exports.scripts     = scripts;
exports.images      = images;
exports.cleanimg    = cleanimg;
exports.deploy      = deploy;
exports.default     = parallel(images, styles, libs, scripts, views, browsersync, startwatch);
exports.build       = series(env, parallel(images, styles, libs, scripts, views));
