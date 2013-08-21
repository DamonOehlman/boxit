/* jshint node: true */
'use strict';

var path = require('path');
var util = require('util');
var events = require('events');
var rePlugin = /^(?:<p\>)?\[\[\s*([^\s]*)\s*(.*)\]\](?:<\/p\>)?$/;

function PluginParser(processor, lines) {
  this.processor = processor;
  this.lines = lines || [];
  this.lineIndex = 0;
  this.output = '';
}

util.inherits(PluginParser, events.EventEmitter);

PluginParser.prototype.includePlugin = function(match, callback) {
  var parser = this;
  
  this.requirePlugin(match[1], function(err, plugin) {
    if (err) {
      parser.processor.out('!{red}warn:    {0}', err.message);
      return callback();
    }

    plugin(parser.processor, match[2], function(err, content) {
      if (! err) {
        parser.output += content + '\n';
      }
      
      callback(err);
    });
  });
};

PluginParser.prototype.nextLine = function(err) {
  var line = this.lines[this.lineIndex];
  var match;
      
  // if the line index is beyond the lines length, then add the last item and return
  if (err || this.lineIndex > this.lines.length) {
    this.emit('end', err, this.output);
    return;
  }
  
  // increment the line index
  this.lineIndex += 1;
  
  // run the regex
  match = rePlugin.exec(line);
  if (match) {
    this.includePlugin(match, this.nextLine.bind(this));
  }
  else {
    this.output += (line || '') + '\n';
    this.nextLine();
  }
};

PluginParser.prototype.process = function() {
  this.nextLine();
};

PluginParser.prototype.requirePlugin = function(plugin, callback) {
  var mod;
  var err;
  var projectPlugin = path.join(this.processor.basePath, 'plugins', plugin);

  try {
    // first try to include the module from the base path
    mod = require(projectPlugin);
  }
  catch (e) {
    try {
      mod = require('./' + plugin);
    }
    catch (e2) {
        err = new Error('Unable to load "' + plugin + '" plugin');
    }
  }

  if (callback) {
    callback(err, mod);
  }
};

module.exports = PluginParser;