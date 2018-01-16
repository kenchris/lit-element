const gulp = require('gulp');
const typescript = require('gulp-tsc');
const replace = require('gulp-replace-path');

const config = {
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
  noFallthroughCasesInSwitch: true,
  experimentalDecorators: true,
  emitDecoratorMetadata: true
};

gulp.task('compile', function(){
    gulp.src(['src/*.ts'])
      .pipe(typescript(config))
      .pipe(replace(/..\/node_modules/g, '..'))
      .pipe(gulp.dest('.'));

    gulp.src('lit-element.js')
      .pipe(gulp.dest('node_modules/lit-html-element'));

    let testConfig = config;
    testConfig.emitDecoratorMetadata = true;

    gulp.src(['test/ts/*.ts'])
      .pipe(typescript(config))
      .pipe(gulp.dest('.'));
  });