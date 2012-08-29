var async = require('async'),
    debug = require('debug')('boxit'),
    path = require('path'),
    fs = require('fs'),
    util = require('util'),
    events = require('events'),
    Processor = require('./processor'),
    _ = require('underscore'),
    reJsonFile = /\.json$/;
    
function Boxer(opts) {
    opts = opts || {};
    
    this.out = opts.silent ? function() {} : require('out');
    
    // save the opts
    this.opts = opts;
    
    // if the refresh option is set, then preferLocal will not be used for getit
    this.refresh = opts.refresh;
}

util.inherits(Boxer, events.EventEmitter);

Boxer.prototype._createProcessors = function(configFiles) {
    var boxer = this;
    
    debug('creating processors for config files: ', configFiles);
    
    function truthy(item) {
        return item;
    }
    
    // iterate through the config files and create processors
    async.map(
        configFiles,
        function(filename, itemCallback) {
            fs.readFile(filename, 'utf8', function(err, data) {
                var processor;
                
                if (err) {
                    itemCallback(new Error('Unable to open config file: ' + filename));
                }
                else {
                    try {
                        data = JSON.parse(data);
                    }
                    catch (e) {
                        itemCallback(new Error('Unable to parse configuration file: ' + filename));
                    }
                    
                    // if we have sources for the data then process
                    if (boxer.isValidData(data)) {
                        // create the processor
                        processor = new Processor(filename, _.defaults(data, boxer.opts, {
                            refresh: boxer.refresh
                        }));
                        
                        boxer.emit('processor', processor);
                    }
                }
                
                itemCallback(err, processor);
            });
        }, 
        function(err, processors) {
            if (err) {
                boxer.emit('error', err);
            }
            else {
                boxer.emit('scanned', processors.filter(truthy));
            }
        }
    );
};

// ## findConfig
// 
Boxer.prototype.findConfig = function(target) {
    var boxer = this;
    
    debug('looking for config files in: ' + target);
    
    fs.stat(target, function(err, stats) {
        if (err) {
            boxer.emit('error', err);
        }
        else {
            if (stats.isDirectory()) {
                var configFiles = [],
                    isJsonFile = reJsonFile.test.bind(reJsonFile);
                
                fs.readdir(target, function(rderr, files) {
                    (files || []).filter(isJsonFile).forEach(function(file) {
                        configFiles.push(path.join(target, file));
                    });
                    
                    boxer._createProcessors(configFiles);
                });
            }
            else {
                boxer._createProcessors([target]);
            }
        }
    });
};

Boxer.prototype.isValidData = function(data) {
    return data && data.sources && data.sources.length > 0;
};

module.exports = Boxer;