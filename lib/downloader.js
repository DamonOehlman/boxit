var path = require('path'),
    debug = require('debug')('boxit-downloader'),
    fs = require('fs'),
    mkdirp = require('mkdirp'),
    async = require('async'),
    getit = require('getit'),
    util = require('util'),
    events = require('events'),
    _ = require('underscore'),
    reAlias = /^([\w\-]+)\!(.*)$/,
    reDownload = /^\[?(head|body)?\]?\s*(.*?)\s?<\=\s?(.*)$/,
    reLeadingSlash = /^\//,
    reTrailingSlash = /\/$/;

function expandAliases(target, aliases) {
    var match = reAlias.exec(target),
        base;
    
    // if the target is an aliases, then construct into an actual target
    if (match) {
        // update the base reference
        base = (aliases[match[1]] || '').replace(reTrailingSlash, '');
        
        // update the target, recursively expand
        target = expandAliases(base + '/' + match[2].replace(reLeadingSlash, ''), aliases);
        debug('found alias, ' + match[1] + ' expanding target to: ' + target);
    }
    
    return target;
}

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
            target = expandAliases(match[3], this.aliases),
            getResource = !getit.isRemote(target);
        
        // if the path does not already exist, then download it
        fs.exists(outputFile, function(exists) {
            if (getResource || (! exists)) {
                mkdirp(path.dirname(outputFile), function(err) {
                    if (! err) {
                        var stream = getit(target, processor._getitOpts());
                        
                        debug('attempting to download: ' + match[3]);
                        downloader.emit('start', match[3], outputFile);

                        stream.pipe(fs.createWriteStream(outputFile));
                        stream.on('end', function() {
                            debug('finished download of: ' + match[3]);
                            downloader.emit('done', target, outputFile);
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
    var actualResources = _.uniq((this.processor.resources || []).concat(this.resources));
    
    // if the resources are not an array, then extract the meaningful sections
    if (! Array.isArray(this.resources)) {
        var optionalResources = this.resources.optional || {};
        
        actualResources = [].concat(this.resources.core || []);
        
        // iterate through the processor extras and include those resources also
        this.processor.extras.forEach(function(extra) {
            actualResources = actualResources.concat(optionalResources[extra] || []);
        });
    }
    
    debug('downloading ' + actualResources.length + ' resources', actualResources);
    async.forEachSeries(actualResources, this.download.bind(this), callback);
};

module.exports = Downloader;