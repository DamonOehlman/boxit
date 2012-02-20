var async = require('async'),
    debug = require('debug')('processor'),
    path = require('path'),
    fs = require('fs'),
    getit = require('getit'),
    handlebars = require('handlebars'),
    Template = require('./template'),
    Downloader = require('./downloader'),
    mkdirp = require('mkdirp'),
    defaultTemplate = path.resolve(__dirname, '../../templates/simple'),
    reItemSeparator = /^~~~(.*)$/,
    rePlugin = /^\<\<\<\s*(.*)$/,
    reAttribute = /^\:(.*)\:\>\s*(.*)$/,
    reLeadingBreaks = /^\n*/,
    reTrailingSlash = /\/$/,
    reExt = /\.\w+$/,
    rePackageJson = /\/(template\.json)?$/;

function Processor(targetfile, opts) {
    // ensure we have options
    opts = opts || {};
    
    this.targetFile = targetfile;
    this.basePath = path.dirname(targetfile);
    this.outputPath = path.resolve(this.basePath, 'output');
    this.output = '';
    this.downloader = new Downloader(opts);

    // iterate through the opts and write to the processor
    for (var key in opts) {
        if (typeof this[key] == 'undefined') {
            this[key] = opts[key];
        }
    }
    
    // initialise option based members
    this.title = this.title || 'Untitled';
    this.templateFile = this.template || '';
    
    // remove the template option that would have been mapped to the processor
    delete this.template;

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
        parser(this, item.content, function(err, parsedContent) {
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

Processor.prototype.getResources = function(callback) {
    var processor = this;
    
    async.forEach(
        [this.downloader, this.template.downloader], 
        function(item, itemCallback) {
            item.run(processor.outputPath, itemCallback);
        }, 
        callback
    );
};

Processor.prototype.loadTemplate = function(callback) {
    var processor = this;
    
    if (this.templateFile) {
        var isRemote = getit.isRemote(this.templateFile),
            templateFile = (this.templateFile || '').replace(rePackageJson, '') + '/template.json',
            templateBase = isRemote ? 
                this.templateFile.replace(reTrailingSlash) : 
                path.resolve(this.basePath, this.templateFile);
            
        // load the template definition
        getit(templateFile, { cwd: this.basePath }, function(err, data) {
            if (! err) {
                try {
                    // parse the data from the template
                    var templateOpts = JSON.parse(data);
                    
                    // set the template base path and output directory
                    templateOpts.basePath = templateBase;
                    
                    // create the template
                    processor.template = new Template(templateOpts);
                }
                catch (e) {
                    err = new Error('Unable to parse template.json definition');
                }
            }

            if (callback) {
                callback(err);
            }
        });
    }
};

Processor.prototype.processItems = function(items, callback) {
    var processor = this;
    
    this.template.load(function(err, data) {
        if (! err) {
            var template = handlebars.compile(data);
            
            processor.items = items;
            processor.output = template(processor);
        }
        
        callback(err);
    });
};

Processor.prototype.run = function(opts, callback) {
    var items = [],
        processor = this;
        
    if (typeof opts == 'function') {
        callback = opts;
        opts = {};
    }
        
    function addItem(sourceType, content, attributes) {
        // clean up the content
        content = (content || '').replace(reLeadingBreaks, '');
        
        // if we have content, then add the item
        if (content) {
            items.push({
                type: sourceType,
                content: content,
                attributes: attributes
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
                    buffer = '',
                    attributes = [];
                
                lines.forEach(function(line) {
                    var breakMatch = reItemSeparator.exec(line);
                    if (breakMatch) {
                        addItem(nextSourceType, buffer, attributes);
                        
                        // reset the buffer and next source type
                        nextSourceType = breakMatch[1] || sourceType;
                        buffer = '';
                    }
                    else {
                        // check for an attribute line
                        var attrMatch = reAttribute.exec(line);
                        if (attrMatch) {
                            attributes.push({
                                key: attrMatch[1],
                                val: attrMatch[2]
                            });
                        }
                        else {
                            var pluginMatch = rePlugin.exec(line);
                            if (pluginMatch) {
                                // TODO: get the plugin data
                            }
                            else {
                                buffer += line + '\n';
                            }
                        }
                    }
                });
                
                // add the last item to the items
                addItem(nextSourceType, buffer, attributes);
                
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
    
    async.series([
        async.forEach.bind(async, this.sources || [], loadSource),
        async.forEach.bind(async, items, processor.convert.bind(processor)),
        this.loadTemplate.bind(this), 
        this.processItems.bind(this, items),
        this.getResources.bind(this), 
        this.writeOutput.bind(this)
    ], function(err) {
        if (callback) {
            callback(err, {
                output: processor.output,
                outputFile: processor.outputFile,
                items: processor.items
            });
        }
    });
};

Processor.prototype.tryRequire = function(targetModule, callback) {
    var mod, err;
    
    try {
        // first try to include the module from the base path
        mod = require(path.join(this.basePath, 'node_modules', targetModule));
    }
    catch (e) {
        try {
            mod = require(targetModule);
        }
        catch (e) {
            err = new Error('Unable to load module "' + targetModule + '", either install it in the project folder or globally');
        }
    }
    
    if (callback) {
        callback(err, mod);
    }
};

Processor.prototype.writeOutput = function(callback) {
    // strip the extension from the target file
    var output = this.output,
        outputFile = path.join(this.outputPath, 
            path.basename(this.targetFile, '.json') + 
            path.extname(this.template.templateFile));

    debug('writing ' + this.output.length + ' characters to output file: ' + outputFile);
    mkdirp(path.dirname(outputFile), function(err) {
        fs.writeFile(outputFile, output, 'utf8', callback);
    });
};

module.exports = Processor;