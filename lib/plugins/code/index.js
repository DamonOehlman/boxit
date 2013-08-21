/* jshint node: true */
'use strict';

var path = require('path');
var fs = require('fs');
var getit = require('getit');
var reExtension = /.*\.(\w+)$/;

module.exports = function(processor, input, callback) {
  // split the fields on spaces
  var fields = (input || '').split(/\s/);
  var extensionMatch;
  var extension;
  var content;
      
  if (fields.length > 0) {
    // TODO: check to see if a line range was requested
    
    extensionMatch = reExtension.exec(fields[0]);
    extension = (extensionMatch ? extensionMatch[1] || 'js' : 'js').toLowerCase();
    content = '<pre><code>' + fields[0] + ' not found</code></pre>';
    
    getit(fields[0], processor._getitOpts(), function(err, data) {
      if (! err) {
        // require hljs for the appropriate language and style
        var language = processor.highlight(extension, fields[1]);

        // wrap the content in a pre code block
        content = '<pre><code class="' + language + '">' + data + '</pre></code>';
      }

      // TODO: include highlight js library in the base of the doc
      callback(null, content);
    });
  }
};