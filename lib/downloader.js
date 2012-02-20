var path = require('path'),
    debug = require('debug')('downloader'),
    fs = require('fs'),
    mkdirp = require('mkdirp'),
    async = require('async'),
    getit = require('getit'),
    reDownload = /^(.*?)\s?\<\=\s?(.*)$/;

function Downloader(opts) {
    opts = opts || {};
    
    this.aliases = opts.aliases || {};
    this.basePath = opts.basePath || '';
    this.resources = opts.resources || [];
}

Downloader.prototype.download = function(targetPath, resource, callback) {
    var match = reDownload.exec(resource),
        opts = {
            aliases: this.aliases,
            cwd: this.basePath
        };
        
    if (match) {
        var outputFile = path.resolve(targetPath, match[1]),
            getResource = (! getit.isRemote(getit.expandAliases(match[2], this.aliases)));
        
        // if the path does not already exist, then download it
        path.exists(outputFile, function(exists) {
            if (getResource || (! exists)) {
                mkdirp(path.dirname(outputFile), function(err) {
                    if (! err) {
                        var stream = getit(match[2], opts);

                        stream.pipe(fs.createWriteStream(outputFile));
                        stream.on('end', callback);
                        stream.on('error', function(err) {
                            callback(err);
                        });
                    }
                    else {
                        callback(err);
                    }
                });
            }
            else {
                callback();
            }
        });
    }
    else {
        debug('invalid resource specification: ' + resource);
        callback();
    }
};

Downloader.prototype.run = function(targetPath, callback) {
    debug('downloading ' + this.resources.length + ' resources');
    async.forEach(this.resources, this.download.bind(this, targetPath), callback);
};

module.exports = Downloader;