/* jshint node: true */
'use strict';

var async = require('async');
var debug = require('debug')('boxit');
var path = require('path');
var fs = require('fs');
var util = require('util');
var events = require('events');
var Processor = require('./lib/processor');
var _ = require('underscore');
var reJsonFile = /\.json$/;

/**
  # BoxIt

  BoxIt is a command-line tool designed to make compiling a single HTML page
  (or even plain text) from multiple snippets locally a lot simpler.  This
  project was created as a follow-up project to
  [deckem](https://github.com/DamonOehlman/deckem) which I started as to
  help with creating [deck.js](https://github.com/imakewebthings/deck.js)
  presentations.  Deckem wasn't really the right solution though, as it was
  too narrow in it's focus.

  By comparison, BoxIt is __incredibly flexible__ and allows you to use
  both __local and remote__ resources to create static local files
  (suitable for offline bundling).

  Creating a deck.js presentation is one potential use, but it could just
  as easily be used to assist with collating multiple HTML sections of a
  single page mobile app, or even possibly creating a CSV file.  

  ## Getting Started

  The first thing you need to do is to create a configuration file that
  defines your project file that instructs BoxIt how to behave.  A reference
  example has been[created in this repository](examples/deck.js) and the
  json configuration file from that example is shown below:

  <<< examples/deck.js/presentation.json

  This config file is parsed and converted into a html file (by default) with
  the same name as the json file.  For instance, this example file is
  [presentation.json](/examples/deck.js/presentation.json) so would be
  converted to [presentation.html](examples/deck.js/output/presentation.html).

  ## How it works

  ### File Loading

  To be completed.

  ### Template Parsing

  To be completed.

  ## Defining a Template

  To be completed, but take a look at the
  [packing instructions](/DamonOehlman/packing-instructions) repository for
  some examples.  Essentially, you have a `json` file that defines the
  template and an accompanying [handlebars](http://handlebarsjs.com/) template
  file that source files are passed through.

  ## Reference

**/


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