var async = require('async'),
    debug = require('debug')('template'),
    getit = require('getit'),
    mkdirp = require('mkdirp'),
    path = require('path'),
    fs = require('fs'),
    Downloader = require('./downloader');

function Template(opts) {
    // initialise opts
    opts = opts || {};
    
    // initialise values
    this.processor = null;
    this.templateFile = opts.template || '';
    
    // read options into template properties
    for (var key in opts) {
        if (typeof this[key] == 'undefined') {
            this[key] = opts[key];
        }
    }
}

module.exports = Template;