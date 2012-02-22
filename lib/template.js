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
    
    // read options into template properties
    this.templateFile = opts.template || '';
    this.basePath = opts.basePath || '';
    this.processor = null;
    
    this.downloader = new Downloader(opts);
}

module.exports = Template;