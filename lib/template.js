var async = require('async'),
    debug = require('debug')('template'),
    getit = require('getit'),
    handlebars = require('handlebars'),
    mkdirp = require('mkdirp'),
    path = require('path'),
    fs = require('fs'),
    reDownload = /^(.*?)\s?\<\=\s?(.*)$/;

function Template(processor, opts) {
    this.processor = processor;
    
    // initialise opts
    opts = opts || {};
    
    // read options into template properties
    this.aliases = opts.aliases || {};
    this.resources = opts.resources || [];
    this.templateFile = opts.template || '';
    this.basePath = opts.basePath || '';
    this.outputPath = opts.outputPath || '';
    this.processor = null;
}

Template.prototype.downloadResource = function(resource, callback) {
    var match = reDownload.exec(resource),
        opts = {
            aliases: this.aliases,
            cwd: this.basePath
        };
        
    if (match) {
        var outputFile = path.resolve(this.outputPath, match[1]);
        
        // if the path does not already exist, then download it
        path.exists(outputFile, function(exists) {
            if (! exists) {
                mkdirp(path.dirname(outputFile), function(err) {
                    if (! err) {
                        var stream = getit(match[2], opts);

                        stream.pipe(fs.createWriteStream(outputFile));
                        stream.on('end', callback);
                        stream.on('error', function(err) {
                            callback(err);
                        });
                    }
                    else {
                        callback(err);
                    }
                });
            }
            else {
                callback();
            }
        });
    }
    else {
        debug('invalid resource specification: ' + resource);
        callback();
    }
};

Template.prototype.loadContent = function(callback) {
    var template = this;
    
    getit(this.basePath + '/' + this.templateFile, function(err, data) {
        if (! err) {
            template.processor = handlebars.compile(data);
            
            // get the resources
            async.forEach(
                template.resources, 
                template.downloadResource.bind(template),
                function() {
                    callback();
                }
            );
        }
        else {
            callback(err);
        }
    });
};

Template.prototype.process = function(items, callback) {
    var template = this;
    
    this.loadContent(function(err) {
        var output;
        
        if (! err) {
            output = template.processor({
                title: template.processor.title,
                items: items
            });
        }

        if (callback) {
            callback(err, output);
        }
    });
};

module.exports = Template;