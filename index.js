/* jshint node: true */
'use strict';

var async = require('async');
var path = require('path');
var Boxer = require('./lib/boxer');

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

module.exports = function(opts, callback) {
  var boxer;

  // handle no opts
  if (typeof opts == 'function') {
    callback = opts;
    opts = {};
  }

  // if we have been passed a configuration file as opts, then pass it
  // the config directly
  if (typeof opts == 'string' || (opts instanceof String)) {
    opts = {
      path: opts
    };
  }

  // ensure we have a callback function
  callback = callback || function(err) {
    if (boxer.out) {
      if (err) {
        return boxer.out.error(err);
      }

      boxer.out('completed');
    }
  };

  // create the boxer
  boxer = new Boxer(opts);

  // once we have scanned the target path, run the processors
  boxer.on('scanned', function(processors) {
    async.forEachSeries(
      processors,
      
      function(processor, itemCallback) {
        processor.out = opts.silent ? function() {} : boxer.out;
        processor.run(itemCallback);
      },
      
      function(err) {
        if (err && (! opts.silent)) {
          boxer.out('!{red}{0}', err);
        }

        callback(err);
      }
    );
  });
  
  boxer.findConfig(opts.path || path.resolve('src'));
  return boxer;
};
