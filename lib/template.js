var async = require('async'),
    debug = require('debug')('template'),
    getit = require('getit'),
    handlebars = require('handlebars'),
    mkdirp = require('mkdirp'),
    path = require('path'),
    fs = require('fs'),
    Downloader = require('./downloader');

function Template(processor, opts) {
    this.processor = processor;
    
    // initialise opts
    opts = opts || {};
    
    // read options into template properties
    this.templateFile = opts.template || '';
    this.basePath = opts.basePath || '';
    this.processor = null;
    
    this.downloader = new Downloader(opts);
}

Template.prototype.loadContent = function(callback) {
    var template = this;
    
    getit(this.basePath + '/' + this.templateFile, function(err, data) {
        if (! err) {
            template.processor = handlebars.compile(data);
        }
        
        callback(err);
    });
};

Template.prototype.process = function(processor, items, callback) {
    var template = this;
    
    this.loadContent(function(err) {
        var output;
        
        if (! err) {
            processor.output = template.processor({
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