var async = require('async'),
    debug = require('debug')('processor'),
    path = require('path'),
    fs = require('fs'),
    getit = require('getit'),
    findit = require('findit'),
    handlebars = require('handlebars'),
    util = require('util'),
    events = require('events'),
    Template = require('./template'),
    Downloader = require('./downloader'),
    Parser = require('./parser'),
    PluginParser = require('./plugins/parser'),
    mkdirp = require('mkdirp'),
    _ = require('underscore'),
    defaultTemplate = path.resolve(__dirname, '../../templates/simple'),
    reLeadingBreaks = /^\n*/,
    reTrailingSlash = /\/$/,
    reExt = /\.\w+$/,
    reTagged = /^\s*\</,
    reExtension = /^.*\.(\w+)$/,
    rePackageJson = /\/(template\.json)?$/,
    reDirectiveInclude = /^\s*\<\=\s*(.*)$/,
    reHeadFirstResource = /\.css$/,
    includeReplacer = {
        js: function(match) {
            return '<script src="' + match[0] + '"></script>';
        },
        
        css: function(match) {
            return '<link rel="stylesheet" type="text/css" href="' + match[0] + '" />';
        }
    };

function Processor(targetfile, opts) {
    // ensure we have options
    opts = opts || {};
    
    this.targetFile = targetfile;
    this.basePath = path.dirname(targetfile);
    this.outputPath = path.resolve(this.basePath, 'output');
    this.output = '';
    this.downloader = new Downloader(this, _.extend(opts, {basePath: this.basePath}));
    this.items = [];

    // iterate through the opts and write to the processor
    for (var key in opts) {
        if (typeof this[key] == 'undefined') {
            this[key] = opts[key];
        }
    }
    
    // initialise option based members
    this.title = this.title || 'Untitled';
    this.templateFile = this.template || '';
    this.includes = this.includes || {};
    this.extras = this.extras || [];
    this.resources = this.resources || [];

    // initialise the plugin configuration section
    this.plugins = this.plugins || {};
    
    // remove the template option that would have been mapped to the processor
    delete this.template;

    debug('processor created for targetfile: ' + targetfile);
}

util.inherits(Processor, events.EventEmitter);

Processor.prototype.convert = function(callback) {
    var parser,
        processor = this;

    async.forEach(
        this.items,
        
        function(item, itemCallback) {
            // reset the parser
            parser = null;
            
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
                parser(processor, item.content, function(err, parsedContent) {
                    if (! err) {
                        item.content = parsedContent;
                    }

                    itemCallback(err);
                });
            }
            else {
                itemCallback(new Error('no parser for item type: ' + item.type));
            }            
        },
        
        callback
    );
};

Processor.prototype.expandDirs = function(callback) {
    var processor = this,
        toRemove = [];
    
    async.forEach(
        [].concat(this.sources),
        function(item, itemCallback) {
            var targetPath = path.resolve(processor.basePath, item);
            
            fs.stat(targetPath, function(err, stats) {
                if ((! err) && stats.isDirectory()) {
                    var finder = findit.find(targetPath);
                    
                    finder.on('file', function(file, stat) {
                        processor.sources.push(file);
                    });
                    
                    finder.on('end', itemCallback);
                    
                    // remove the item from the sources
                    processor.sources.splice(processor.sources.indexOf(item), 1);
                }
                else {
                    itemCallback();
                }
            });
        },
        
        callback
    );
};

Processor.prototype.getResources = function(callback) {
    var processor = this;
    
    async.forEach(
        [this.downloader, this.template.downloader], 
        function(item, itemCallback) {
            item.on('start', processor.out.bind(null, '!{blue}getting: !{blue,underline}{0}'));
            item.run(itemCallback);
        }, 
        callback
    );
};

Processor.prototype.include = function(target, section) {
    var defaultSection = reHeadFirstResource.test(target) ? 'head' : 'body',
        includes = this.includes[section || defaultSection],
        included = false;
    
    if (includes) {
        for (var ii = includes.length; ii--; ) {
            included = included || includes[ii] === target;
        }
        
        if (! included) {
            includes.push(target);
        }
    }
};

Processor.prototype.includeExtras = function(callback) {
    var includes = [],
        opts = {
            cwd: this.basePath,
            aliases: this.aliases || {}
        },
        processor = this;
    
    // iterate through the keys of the processor, and look for any strings
    // that are include directives
    for (var key in this) {
        if (typeof this[key] == 'string') {
            var match = reDirectiveInclude.exec(this[key]);
            if (match) {
                includes.push({
                    key: key,
                    include: match[1]
                })
            }
        }
    }
    
    // retrieve the includes
    async.forEach(
        includes,
        function(item, itemCallback) {
            getit(item.include, opts, function(err, data) {
                if (! err) {
                    processor[item.key] = data;
                }
                
                itemCallback(err);
            });
        },
        callback
    );
};

Processor.prototype.loadSources = function(callback) {
    var processor = this;
    
    // reset the items array
    this.items = [];
    
    async.forEachSeries(
        this.sources || [],
        function(source, itemCallback) {
            if (getit.isRemote(source)) {
                processor.out('!{grey}loading: !{underline}{0}', source);
            }
            
            getit(source, { cwd: processor.basePath }, function(err, data) {
                if (! err) {
                    var parser = new Parser(processor, source, data.split(/\n/));
                    
                    parser.on('item', function(item) {
                        debug('found item: ', item);
                        processor.items.push(item);
                    });
                    
                    parser.on('end', itemCallback);
                    parser.on('error', itemCallback);

                    processor.out('!{grey}parsing: !{underline}{0}', source);
                    parser.process();
                }
                else {
                    itemCallback(err);
                }
            });
            
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
        this.out('!{grey}loading: !{underline}{0}', templateFile);
        getit(templateFile, { cwd: this.basePath }, function(err, data) {
            if (! err) {
                try {
                    // parse the data from the template
                    var templateOpts = JSON.parse(data);
                    
                    // set the template base path and output directory
                    templateOpts.basePath = templateBase;
                    
                    // create the template
                    processor.template = new Template(templateOpts);
                    processor.template.downloader = new Downloader(processor, templateOpts);
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

Processor.prototype.out = function() {
};

Processor.prototype.parseIncludes = function(callback) {
    
    // process the head and body includes
    for (var key in this.includes) {
        var includes = this.includes[key];
        
        for (var ii = includes.length; ii--; ) {
            if (! reTagged.test(includes[ii])) {
                var matchExt = reExtension.exec(includes[ii]),
                    replacer = matchExt ? includeReplacer[matchExt[1]] : null;
                    
                if (replacer) {
                    includes[ii] = replacer.call(null, matchExt);
                }
            }
        }
    }
    
    callback();
};

Processor.prototype.parsePlugins = function(callback) {
    var processor = this;
    
    async.forEach(
        this.items,
        function(item, itemCallback) {
            var parser = new PluginParser(processor, item.content.split(/\n/));
            parser.on('end', function(err, content) {
                if (! err) {
                    item.content = content;
                }
                
                itemCallback(err);
            });
            
            parser.process();
        },
        callback
    );
};

Processor.prototype.processItems = function(callback) {
    var processor = this,
        targetFile = this.template.basePath + '/' + this.template.templateFile;
    
    this.out('!{grey}loading: !{underline}{0}', targetFile);
    getit(targetFile, function(err, content) {
        if (! err) {
            var data = _.extend({}, processor.template, processor);
            
            processor.output = handlebars.compile(content)(data);
        }
        
        callback(err);
    });
};

Processor.prototype.require = function(target) {
    var included = false;
    
    // check whether we have already included the resource or not
    for (var ii = this.resources.length; ii--;) {
        included = included || this.resources[ii] === target;
    }
    
    if (! included) {
        this.resources.push(target);
    }
};

Processor.prototype.run = function(opts, callback) {
    var items = [],
        processor = this,
        parser = new Parser(this);
        
    if (typeof opts == 'function') {
        callback = opts;
        opts = {};
    }
    
    async.series([
        this.expandDirs.bind(this),
        this.loadSources.bind(this),
        this.convert.bind(this),
        this.parsePlugins.bind(this),
        this.loadTemplate.bind(this), 
        this.getResources.bind(this), 
        this.parseIncludes.bind(this),
        this.includeExtras.bind(this),
        this.processItems.bind(this),
        this.writeOutput.bind(this)
    ], function(err) {
        if (callback) {
            var completionData = {
                output: processor.output,
                outputFile: processor.outputFile,
                items: processor.items
            };
            
            // trigger a done event passing the completion data
            if (! err) {
                processor.emit('done', completionData);
            }
            
            // if we have a callback then trigger it now
            if (callback) {
                callback(err, completionData);
            }
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
    var processor = this;
    
    // update the output file location
    this.outputFile = path.join(this.outputPath, 
        path.basename(this.targetFile, '.json') + 
        path.extname(this.template.templateFile));

    debug('writing ' + this.output.length + ' characters to output file: ' + this.outputFile);
    mkdirp(path.dirname(this.outputFile), function(err) {
        fs.writeFile(processor.outputFile, processor.output, 'utf8', callback);
    });
};

module.exports = Processor;