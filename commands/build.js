/* jshint node: true */
'use strict';

var path = require('path');

// action description
exports.desc = 'Produce your output files';
exports.args = {
  'path': path,
  'output': path,
  'silent': Boolean,
  'refresh': Boolean
};

// export runner
exports.run = require('..');
