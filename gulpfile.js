let gulp = require('gulp');
let typescript = require('gulp-tsc');
let replace = require('gulp-replace-path');

gulp.task('compile', function(){
    gulp.src(['src/*.ts'])
      .pipe(typescript({
        target: "es2017",
        module: "es2015",
        lib: ["es2017", "dom"],
        declaration: true,
        sourceMap: true,
        inlineSources: true,
        outDir: "./lib",
        baseUrl: ".",
        strict: true,
        noUnusedLocals: true,
        noUnusedParameters: true,
        noImplicitReturns: true,
        noFallthroughCasesInSwitch: true
      }))
      .pipe(replace(/..\/node_modules/g, '..'))
      .pipe(gulp.dest('.'));

    gulp.src('lit-element.js')
      .pipe(gulp.dest('node_modules/lit-html-element'));
  });