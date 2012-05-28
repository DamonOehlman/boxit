var async = require('async'),
    debug = require('debug')('boxit'),
    fs = require('fs'),
    path = require('path'),
    Boxer = require('../boxer'),
    _ = require('underscore');

// action description
exports.desc = 'Produce your output files';

exports.args = {
    'path': path,
    'output': path,
    'silent': Boolean,
    'refresh': Boolean
};

// export runner
exports.run = function(opts, callback) {
    var scaffolder = this;
    
    // create the boxer
    boxer = new Boxer(opts);
    
    if (! opts.silent) {
        boxer.on('error', function(err) {
            scaffolder.out('!{bold}{0}', err);
        });
    }
    
    boxer.on('scanned', function(processors) {
        async.forEachSeries(
            processors,
            
            function(processor, itemCallback) {
                processor.out = opts.silent ? function() {} : scaffolder.out;
                processor.run(itemCallback);
            },
            
            function(err) {
                if (err && (! opts.silent)) {
                    scaffolder.out('!{red}{0}', err);
                }

                callback(err);
            }
        );
    });
    
    boxer.findConfig(opts.path || process.cwd());
};