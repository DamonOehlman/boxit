var debug = require('debug')('textsetter'),
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
    var boxer = this;
    
    debug('creating processors for config files: ', configFiles);
    
    // iterate through the config files and create processors
    configFiles.forEach(function(filename) {
        // load the file 
        fs.readFile(filename, 'utf8', function(err, data) {
            if (err) {
                setter.emit('error', err);
            }
            else {
                try {
                    data = JSON.parse(data);
                }
                catch (e) {
                    boxer.emit('error', new Error('Unable to parse configuration file: ' + filename));
                }
                
                // if we have sources for the data then process
                if (boxer.isValidData(data)) {
                    boxer.emit('processor', new Processor(filename, data));
                }
            }
        });
    });
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