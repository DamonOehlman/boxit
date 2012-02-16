var async = require('async'),
    debug = require('debug')('processor'),
    path = require('path'),
    fs = require('fs'),
    getit = require('getit'),
    defaultTemplate = path.resolve(__dirname, '../../templates/simple'),
    reItemSeparator = /^~~~(.*)$/,
    reLeadingBreaks = /^\n*/;

function Processor(targetfile, opts) {
    // ensure we have options
    opts = opts || {};
    
    // initialise members
    this.title = opts.title || 'Untitled';
    this.basePath = path.dirname(targetfile);
    this.sources = opts.sources || [];
    
    debug('processor created for targetfile: ' + targetfile);
    
    // if a template was specified, initialise it
    if (opts.template) {
        this.templatePath = path.resolve(this.basepath, opts.template);
    }
    else {
        this.templatePath = defaultTemplate;
    }
}

Processor.prototype.convert = function(item, callback) {
    var parser;
    
    // get the parser for the type
    if (item && item.type) {
        try {
            parser = require('./fileparsers/' + item.type);
        }
        catch (e) {
            debug('unable to load parser for type: ' + item.type);
        }
    }
    
    // if we have a parser, then parse the content
    if (parser) {
        item.original = item.content;
        parser(item.content, function(err, parsedContent) {
            if (! err) {
                item.content = parsedContent;
            }
            
            callback(err, item);
        });
    }
    else {
        callback(new Error('no parser for item type: ' + item.type));
    }
};

Processor.prototype.run = function(opts, callback) {
    var items = [],
        processor = this;
        
    if (typeof opts == 'function') {
        callback = opts;
        opts = {};
    }
        
    function addItem(sourceType, content) {
        // clean up the content
        content = (content || '').replace(reLeadingBreaks, '');
        
        // if we have content, then add the item
        if (content) {
            items.push({
                type: sourceType,
                content: content
            });
        }
    }
    
    function loadSource(source, itemCallback) {
        var sourceType = path.extname(source).slice(1),
            nextSourceType = sourceType;
        
        debug('loading sources from: ' + source);
        getit(source, { cwd: processor.basePath }, function(err, data) {
            if (! err) {
                var lines = data.split(/\n/),
                    buffer = '';
                
                lines.forEach(function(line) {
                    if (reItemSeparator.test(line)) {
                        addItem(nextSourceType, buffer);
                        
                        // reset the buffer and next source type
                        nextSourceType = RegExp.$1 || sourceType;
                        buffer = '';
                    }
                    else {
                        buffer += line + '\n';
                    }
                });
                
                // add the last item to the items
                addItem(nextSourceType, buffer);
                
                // fire the callback, but don't pass on the err
                itemCallback();
            }
            // if this is a directory, then get each of the files in the directory
            else if (err.code == 'EISDIR') {
                readFiles(path.resolve(processor.basePath, source), itemCallback);
            }
            else {
                itemCallback(err);
            }
        });
    }
    
    function readFiles(targetDir, callback) {
        fs.readdir(targetDir, function(err, files) {
            async.forEach(files || [], function(file, itemCallback) {
                fs.readFile(path.resolve(targetDir, file), 'utf8', function(err, data) {
                    if (! err) {
                        var sourceType = path.extname(file).slice(1);

                        addItem(sourceType, data);
                    }
                    
                    itemCallback();
                });
            }, callback);
        });
    }
    
    // load the sources
    async.forEach(this.sources, loadSource, function(err) {
        // now parse each of the items into html
        async.forEach(items, processor.convert.bind(processor), function(err) {
            console.log(items);
            
            if (callback) {
                callback(err, items);
            }
        });
    });
    
    // if we have sources, then load the template
};

module.exports = Processor;