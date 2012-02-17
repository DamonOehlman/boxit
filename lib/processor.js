var async = require('async'),
    debug = require('debug')('processor'),
    path = require('path'),
    fs = require('fs'),
    getit = require('getit'),
    Template = require('./template'),
    defaultTemplate = path.resolve(__dirname, '../../templates/simple'),
    reItemSeparator = /^~~~(.*)$/,
    reLeadingBreaks = /^\n*/,
    reTrailingSlash = /\/$/,
    reExt = /\.\w+$/,
    rePackageJson = /\/(template\.json)?$/;

function Processor(targetfile, opts) {
    // ensure we have options
    opts = opts || {};
    
    // initialise members
    this.title = opts.title || 'Untitled';
    this.targetFile = targetfile;
    this.basePath = path.dirname(targetfile);
    this.sources = opts.sources || [];
    this.template = opts.template || '';
    
    debug('processor created for targetfile: ' + targetfile);
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

Processor.prototype.loadTemplate = function(callback) {
    var processor = this;
    
    if (this.template) {
        var isRemote = getit.isRemote(this.template),
            templateFile = (this.template || '').replace(rePackageJson, '') + '/template.json',
            templateBase = isRemote ? 
                this.template.replace(reTrailingSlash) : 
                path.resolve(this.basePath, this.template);
            
        // load the template definition
        getit(templateFile, { cwd: this.basePath }, function(err, data) {
            var template;

            if (! err) {
                try {
                    // parse the data from the template
                    var templateOpts = JSON.parse(data);
                    
                    // set the template base path and output directory
                    templateOpts.basePath = templateBase;
                    templateOpts.outputPath = path.resolve(processor.basePath, 'output');
                    
                    // create the template
                    template = new Template(processor, templateOpts);
                }
                catch (e) {
                    err = new Error('Unable to parse template.json definition');
                }
            }

            if (callback) {
                callback(err, template);
            }
        });
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
            processor.loadTemplate(function(err, template) {
                template.process(items, function(err, output) {
                    // strip the extension from the target file
                    var outputFile = path.join(template.outputPath, 
                            path.basename(processor.targetFile, '.json') + 
                            path.extname(template.templateFile));
                    
                    fs.writeFile(outputFile, output, 'utf8', function(err) {
                        if (callback) {
                            callback(err, {
                                output: output,
                                outputFile: outputFile,
                                items: items
                            });
                        }
                    });
                });
            });
        });
    });
    
    // if we have sources, then load the template
};

module.exports = Processor;