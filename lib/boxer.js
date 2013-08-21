/* jshint node: true */
'use strict';

var async = require('async');
var debug = require('debug')('boxit-boxer');
var path = require('path');
var fs = require('fs');
var util = require('util');
var events = require('events');
var Processor = require('./processor');
var _ = require('underscore');
var reJsonFile = /\.json$/;

/**
  ### Boxer(opts)

**/
function Boxer(opts) {
  var out;

  if (! (this instanceof Boxer)) {
    return new Boxer(opts);
  }

  // default the opts
  opts = _.defaults(opts, {
    output: path.resolve('-')
  });

  out = this.out = opts.silent ? function() {} : require('out');

  if (! opts.silent) {
    this.on('error', function(err) {
      out('!{bold}{0}', err);
    });
  }

  // save the opts
  this.opts = opts;

  // if the refresh option is set, then preferLocal will not be used for getit
  this.refresh = opts.refresh;
}

util.inherits(Boxer, events.EventEmitter);
module.exports = Boxer;

/**
  ### Boxer.findConfig(target)

**/
Boxer.prototype.findConfig = function(target) {
  var boxer = this;
  
  debug('looking for config files in: ' + target);
  fs.stat(target, function(err, stats) {
    var configFiles = [];
    var isJsonFile = reJsonFile.test.bind(reJsonFile);

    if (err) {
      return boxer.emit('error', err);
    }

    if (stats.isDirectory()) {
      fs.readdir(target, function(rderr, files) {
        (files || []).filter(isJsonFile).forEach(function(file) {
          configFiles.push(path.join(target, file));
        });
        
        boxer._createProcessors(configFiles);
      });
    }
    else {
      boxer._createProcessors([target]);
    }
  });
};

/**
  ### Boxer.isValidData(data)
**/
Boxer.prototype.isValidData = function(data) {
  return data && data.sources && data.sources.length > 0;
};

/**
  ### Boxer._createProcessors(configFiles)
**/
Boxer.prototype._createProcessors = function(configFiles) {
  var boxer = this;
  
  debug('creating processors for config files: ', configFiles);
  
  // iterate through the config files and create processors
  async.map(
    configFiles,
    function(filename, itemCallback) {
      fs.readFile(filename, 'utf8', function(err, data) {
        var processor;

        if (err) {
          return itemCallback(
            new Error('Unable to open config file: ' + filename)
          );
        }


        try {
          data = JSON.parse(data);
        }
        catch (e) {
          return itemCallback(
            new Error('Unable to parse configuration file: ' + filename)
          );
        }
        
        // if we have sources for the data then process
        if (boxer.isValidData(data)) {
          // create the processor
          processor = new Processor(filename, _.defaults(data, boxer.opts, {
            refresh: boxer.refresh
          }));
          
          boxer.emit('processor', processor);
        }
        
        itemCallback(err, processor);
      });
    },

    function(err, processors) {
      if (err) {
        boxer.emit('error', err);
      }
      else {
        boxer.emit('scanned', processors.filter(Boolean));
      }
    }
  );
};