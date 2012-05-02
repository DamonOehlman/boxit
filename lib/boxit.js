var async = require('async'),
    debug = require('debug')('boxit'),
    nopt = require('nopt'),
    fs = require('fs'),
    path = require('path'),
    out = require('out'),
    util = require('util'),
    Boxer = require('./boxer'),
    
    cmdline = {
        known: {
            'path': path,
            'silent': Boolean
        },
        
        shorthand: {}
    },
    
    reLeadingDashes = /^\-+/;

function boxit(opts, callback) {
    var boxer;
    
    // if we have no arguments, then check the command line args
    if (arguments.length === 0) {
        opts = nopt(cmdline.known, cmdline.shorthand, process.argv, 2);
    }
    else if (typeof opts == 'function') {
        callback = opts;
        opts = {};
    }

    // ensure we have options
    opts = opts || {};
    
    // ensure we have a callback
    callback = callback || function(err) {
        if (err) {
            out('!{red}{0}', err);
        }
    };
    
    // create the boxer
    boxer = new Boxer();
    
    // when processors are discovered set them running
    // TODO: consider collecting processors and running them in series for better console output
    boxer.on('processor', function(processor) {
        processor.out = opts.silent ? function() {} : require('out');

        processor.run(function(err) {
            if (err) {
                processor.out('!{red}{0}', err);
            }
        });
    });
    
    boxer.findConfig(opts.path || process.cwd());
}

module.exports = boxit;