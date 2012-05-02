var path = require('path'),
    debug = require('debug')('boxit-downloader'),
    fs = require('fs'),
    mkdirp = require('mkdirp'),
    async = require('async'),
    getit = require('getit'),
    util = require('util'),
    events = require('events'),
    reDownload = /^\[?(head|body)?\]?\s*(.*?)\s?<\=\s?(.*)$/;

function Downloader(processor, opts) {
    opts = opts || {};
    
    // save a reference to the processor
    this.processor = processor;
    
    // initialise members
    this.aliases = opts.aliases || {};
    this.basePath = opts.basePath || '';
    this.resources = opts.resources || [];
}

util.inherits(Downloader, events.EventEmitter);

Downloader.prototype.download = function(resource, callback) {
    var match = reDownload.exec(resource),
        downloader = this,
        processor = this.processor;
        
    function ok() {
        // include the file in the processor
        processor.include(match[2], match[1]);
        
        // trigger the callback
        callback();
    }
        
    if (match) {
        var targetSection = match[1],
            outputFile = path.resolve(this.processor.outputPath, match[2]),
            getResource = (! getit.isRemote(getit.expandAliases(match[3], this.aliases)));
        
        // if the path does not already exist, then download it
        path.exists(outputFile, function(exists) {
            if (getResource || (! exists)) {
                mkdirp(path.dirname(outputFile), function(err) {
                    if (! err) {
                        var stream = getit(match[3], processor._getitOpts());
                        
                        downloader.emit('start', match[3], outputFile);

                        stream.pipe(fs.createWriteStream(outputFile));
                        stream.on('end', function() {
                            downloader.emit('done', match[3], outputFile);
                            ok();
                        });
                        
                        stream.on('error', function(err) {
                            callback(new Error('Unable to download: ' + match[3]));
                        });
                    }
                    else {
                        callback(err);
                    }
                });
            }
            else {
                ok();
            }
        });
    }
    else {
        debug('invalid resource specification: ' + resource);
        callback();
    }
};

Downloader.prototype.run = function(callback) {
    var actualResources = this.resources;
    
    // if the resources are not an array, then extract the meaningful sections
    if (! Array.isArray(this.resources)) {
        var optionalResources = this.resources.optional || {};
        
        actualResources = [].concat(this.resources.core || []);
        
        // iterate through the processor extras and include those resources also
        this.processor.extras.forEach(function(extra) {
            actualResources = actualResources.concat(optionalResources[extra] || []);
        });
    }
    
    debug('downloading ' + actualResources + ' resources');
    async.forEach(actualResources, this.download.bind(this), callback);
};

module.exports = Downloader;