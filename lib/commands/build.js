/* jshint node: true */
'use strict';

var async = require('async');
var debug = require('debug')('boxit');
var fs = require('fs');
var path = require('path');
var Boxer = require('../..');
var _ = require('underscore');

// action description
exports.desc = 'Produce your output files';
exports.args = {
  'path': path,
  'output': path,
  'silent': Boolean,
  'refresh': Boolean
};

// export runner
exports.run = function(opts, callback) {
  var scaffolder = this;
  
  // create the boxer
  boxer = new Boxer(opts);
  boxer.on('scanned', function(processors) {
    async.forEachSeries(
      processors,
      
      function(processor, itemCallback) {
        processor.out = opts.silent ? function() {} : scaffolder.out;
        processor.run(itemCallback);
      },
      
      function(err) {
        if (err && (! opts.silent)) {
          scaffolder.out('!{red}{0}', err);
        }

        callback(err);
      }
    );
  });
  
  boxer.findConfig(opts.path || path.resolve('src'));
};