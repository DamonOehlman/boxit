/* jshint node: true */
'use strict';

var async = require('async');
var debug = require('debug')('boxit-scaffold');
var fs = require('fs');
var path = require('path');
var getit = require('getit');
var manifest = require('manifest');
var handlebars = require('handlebars');
var Processor = require('../lib/processor');


function scaffold(scaffolder, scaffoldPath, opts, callback) {
  // determine the template location of the specified template
  debug('scaffolding new project from: ' + scaffoldPath);

  // initialise some additional default opts
  opts.title = opts.title || 'New BoxIt Package';
  async.parallel([
    function(callback) {
      manifest.download(scaffoldPath, opts, callback);
    },

    function(callback) {
      getit(scaffoldPath + 'index.json', opts, function(err, data) {
        var targetFile;
        var template;

        if (err) {
          return callback(err);
        }

        targetFile = path.join(
          opts.path,
          path.basename(opts.filename || 'index', '.json') + '.json'
        );

        // compile the template
        template = handlebars.compile(data);

        // write the file to the output path
        fs.writeFile(targetFile, template(opts), 'utf8', callback);
      });
    },

    scaffolder.copy.bind(
      scaffolder,
      'assets/scaffold/files',
      path.join(opts.path, 'files')
    )
  ], callback);
}

// action description
exports.desc = 'Scaffold a boxit project';
exports.args = {
  'path': path,
  'template': String,
  'title': String
};

// export runner
exports.run = function(opts, callback) {
  var processor = new Processor('', opts);
  var templateLocation;

  // if no template is specified, then report an error
  if (! opts.template) {
    this.out('!{red}No template specified, ' +
      'use "boxit scaffold --template <templatename>"');

    return;
  }

  // find the templatelocation
  templateLocation = processor.getTemplateLocation(opts.template);

  // if we have a template location then scaffold the project
  if (templateLocation) {
    scaffold(this, templateLocation + '/scaffold/', opts, callback);
  }
};
