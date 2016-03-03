require("sugar");

var gulp = require("gulp"),
    rimraf = require("rimraf"),
    path = require("path"),
    fs = require("fs"),
    concat = require("gulp-concat"),
    sourcemaps = require("gulp-sourcemaps"),
    uglify = require("gulp-uglify"),
    less = require("gulp-less"),
    csso = require("gulp-csso"),
    imagemin = require("gulp-imagemin"),
    ejs = require("gulp-ejs"),
    changed = require("gulp-changed"),
    minifyHTML = require("gulp-minify-html"),
    minifyCSS = require("gulp-minify-css"),
    rename = require("gulp-rename"),
    argv = require("yargs").argv;


//////////////////////////////////////////////////////////////////////////////////////////
// Clean
//////////////////////////////////////////////////////////////////////////////////////////
gulp.task("clean", function(cb) {
    return rimraf("static/", cb);
});


//////////////////////////////////////////////////////////////////////////////////////////
// Styles
//////////////////////////////////////////////////////////////////////////////////////////
gulp.task("watch-styles", function() { 
    return gulp.watch([ "src/styles/**/*" ], [ "build-styles" ]); 
});

gulp.task("build-styles", [ 
    "build-fonts", "build-css", "build-less" 
]);

gulp.task("build-fonts", function() {
    return gulp.src("src/styles/fonts/**/*")
        .pipe(changed("static/styles/fonts"))
        .pipe(gulp.dest("static/styles/fonts"));
});

gulp.task('build-css', function() {
    return gulp.src("src/css/**/*")
        .pipe(sourcemaps.init())
        .pipe(concat("styles.css"))
        .pipe(csso())
        .pipe(sourcemaps.write('../maps'))
        .pipe(gulp.dest('static/css'));
});

gulp.task('build-less', function() {    
    return gulp.src("src/less/main.less")
        .pipe(sourcemaps.init())
        .pipe(less())
        .pipe(csso())
        .pipe(sourcemaps.write('../maps'))
        .pipe(gulp.dest('static/css'));
});


//////////////////////////////////////////////////////////////////////////////////////////
// Javascript
//////////////////////////////////////////////////////////////////////////////////////////
gulp.task("watch-scripts", function() { 
    return gulp.watch([ "src/scripts/**/*" ], [ "build-scripts" ]); 
});

gulp.task("build-scripts", [ 
    "build-javascript"
]);

gulp.task('build-javascript', function() {
    return gulp.src("src/scripts/**/*.js")
        .pipe(sourcemaps.init())
        .pipe(concat("script.js"))
        .pipe(uglify())
        .pipe(sourcemaps.write('../maps'))
        .pipe(gulp.dest('static/js'));
});



//////////////////////////////////////////////////////////////////////////////////////////
// Images
//////////////////////////////////////////////////////////////////////////////////////////
gulp.task("watch-media", function() { 
    return gulp.watch([ "src/media/**/*" ], [ "build-media" ]); 
});

gulp.task("build-media", [ 
    "build-images", "build-video" 
]);

gulp.task("build-images", function() {
    return gulp.src("src/media/images/**/*")
        .pipe(changed("static/images"))
        .pipe(imagemin({
            optimizationLevel: 7,
            progressive: true,
            svgoPlugins: [ { removeViewBox: false } ],
        }))
        .pipe(gulp.dest("static/images"));
});

gulp.task("build-video", function() {
    return gulp.src("src/media/video/**/*")
        .pipe(changed("static/video"))
        .pipe(imagemin({
            optimizationLevel: 7,
            progressive: true,
            svgoPlugins: [ { removeViewBox: false } ],
        }))
        .pipe(gulp.dest("static/video"));
});


//////////////////////////////////////////////////////////////////////////////////////////
// Pages
//////////////////////////////////////////////////////////////////////////////////////////
gulp.task("watch-pages", function() { 
    return gulp.watch([ "src/views/pages/static/**/*" ], [ "build-pages" ]); 
});

gulp.task("build-pages", [ 
    "build-static-pages"
]);

gulp.task("build-static-pages", [ "build-static-index" ], function() {
    return gulp.src([ "src/views/pages/static/**/*", "!src/views/pages/static/index.ejs" ])
        .pipe(ejs({ root: "" }, { ext: '/index.html' }))
        .pipe(minifyHTML({ conditionals: true }))
        .pipe(gulp.dest("static"));
});

gulp.task("build-static-index", function() {
    return gulp.src([ "src/ejs/static/index.ejs" ])
        .pipe(ejs({ root: "" }, { ext: '.html' }))
        .pipe(minifyHTML({ conditionals: true }))
        .pipe(gulp.dest("static"));
});


//////////////////////////////////////////////////////////////////////////////////////////
// Core
//////////////////////////////////////////////////////////////////////////////////////////
gulp.task("watch", [ 
    "watch-media", "watch-styles", "watch-scripts", "watch-pages" 
]);

gulp.task("build", [ 
    "build-media", "build-styles", "build-scripts", "build-pages" 
]);

gulp.task("rebuild", [ 
    "clean", "build" 
]);

gulp.task("default", [ 
    "watch", "build" 
]);