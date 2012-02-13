var debug = require('debug')('textsetter'),
    path = require('path'),
    fs = require('fs'),
    util = require('util'),
    events = require('events'),
    Processor = require('./processor'),
    reJsonFile = /\.json$/;
    
function TextSetter(target) {
    if (target) {
        this.findConfig(target);
    }
}

util.inherits(TextSetter, events.EventEmitter);


TextSetter.prototype._createProcessors = function(configFiles) {
    var setter = this;
    
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
                    setter.emit('processor', new Processor(JSON.parse(data)));
                }
                catch (err) {
                    setter.emit('error', new Error('Invalid configuration file: ' + filename));
                }
            }
        });
    });
};

// ## findConfig
// 
TextSetter.prototype.findConfig = function(target) {
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

module.exports = TextSetter;