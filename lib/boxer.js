var async = require('async'),
    debug = require('debug')('textsetter'),
    path = require('path'),
    fs = require('fs'),
    util = require('util'),
    events = require('events'),
    Processor = require('./processor'),
    reJsonFile = /\.json$/;
    
function Boxer(target) {
    if (target) {
        this.findConfig(target);
    }
}

util.inherits(Boxer, events.EventEmitter);

Boxer.prototype._createProcessors = function(configFiles) {
    var boxer = this,
        processors = [];
    
    debug('creating processors for config files: ', configFiles);
    
    // iterate through the config files and create processors
    async.forEach(
        configFiles,
        function(filename, itemCallback) {
            fs.readFile(filename, 'utf8', function(err, data) {
                var processor;
                
                if (err) {
                    itemCallback(err);
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
                        processor = processors[processors.length] = new Processor(filename, data);
                        boxer.emit('processor', processor);
                    }
                }
                
                itemCallback(err, processor);
            });
        }, 
        function(err) {
            boxer.emit('scanned', processors);
        }
    );
};

// ## findConfig
// 
Boxer.prototype.findConfig = function(target) {
    var setter = this;
    
    debug('looking for config files in: ' + target);
    
    fs.stat(target, function(err, stats) {
        if (err) {
            setter.emit('error', err);
        }
        else {
            if (stats.isDirectory()) {
                var configFiles = [];
                
                fs.readdir(target, function(rderr, files) {
                    (files || []).forEach(function(file) {
                        if (reJsonFile.test(file)) {
                            configFiles.push(path.join(target, file));
                        }
                    });
                    
                    setter._createProcessors(configFiles);
                });
            }
            else {
                setter._createProcessors([target]);
            }
        }
    });
};

Boxer.prototype.isValidData = function(data) {
    return data && data.sources && data.sources.length > 0;
};

module.exports = Boxer;