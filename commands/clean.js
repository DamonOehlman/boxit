/* jshint node: true */
'use strict';

var rimraf = require('rimraf');
var path = require('path');
var Boxer = require('../');

// action description
exports.desc = 'Clean the output directory';
exports.args = {
  'output': path
};

// export runner
exports.run = function(opts, callback) {
  rimraf(new Boxer(opts).opts.output, callback);
};
