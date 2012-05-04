var async = require('async'),
    debug = require('debug')('boxit'),
    nopt = require('nopt'),
    fs = require('fs'),
    path = require('path'),
    out = require('out'),
    util = require('util'),
    Boxer = require('./boxer'),
    _ = require('underscore'),
    
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
    boxer = new Boxer(opts);
    
    if (! opts.silent) {
        boxer.on('error', function(err) {
            out('!{bold}{0}', err);
        });
    }
    
    boxer.on('scanned', function(processors) {
        async.forEachSeries(
            processors,
            
            function(processor, itemCallback) {
                processor.out = opts.silent ? function() {} : out;
                processor.run(itemCallback);
            },
            
            function(err) {
                if (err && (! opts.silent)) {
                    out('!{red}{0}', err);
                }

                callback(err);
            }
        );
    });
    
    boxer.findConfig(opts.path || process.cwd());
}

module.exports = boxit;