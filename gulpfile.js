var gulp = require('gulp');
var del = require('del');
var ts = require('gulp-typescript');
var path = require('path');

var BUILT_PATH = 'built';
var SRC_PATH = 'src';

var tsProject = ts.createProject('tsconfig.json');


gulp.task('clean', function (paths) {
  del([BUILT_PATH]).then(paths => {
    console.info('Deleted files and folders:\n', paths.join('\n'));
  });
});

gulp.task('default', function () {
  return tsProject.src()
    .pipe(tsProject())
    .js
    .pipe(gulp.dest(BUILT_PATH));
});

gulp.task('watch', ['default'], function () {
  gulp.watch([path.join(SRC_PATH, '**/*')], ['default']);
});
