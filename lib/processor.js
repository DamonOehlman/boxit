var async = require('async'),
    debug = require('debug')('boxit-processor'),
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
    reTagged = /^\s*</,
    reExtension = /^.*\.(\w+)$/,
    rePackageJson = /\/(template\.json)?$/,
    reDirectiveInclude = /^\s*<\=\s*(.*)$/,
    reHeadFirstResource = /\.css$/,
    includeReplacer = {
        js: function(match) {
            return '<script src="' + match[0] + '"></script>';
        },
        
        css: function(match) {
            return '<link rel="stylesheet" type="text/css" href="' + match[0] + '" />';
        }
    },
    
    // define some language aliases for highlighting purposes
    languageLookups = {
        js: 'javascript'
    };
    

function Processor(targetfile, opts) {
    // ensure we have options
    opts = opts || {};
    
    this.targetFile = targetfile;
    this.basePath = path.dirname(targetfile);
    this.outputPath = path.resolve(this.basePath, 'output');
    this.output = '';
    this.items = [];

    // iterate through the opts and write to the processor
    for (var key in opts) {
        if (typeof this[key] == 'undefined') {
            this[key] = opts[key];
        }
    }
    
    // ensure aliases are defined
    this.aliases = this.aliases || {};
    
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
    
    // create the downloader
    this.downloader = new Downloader(this, _.extend(opts, {basePath: this.basePath}));
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

/**
## highlight(language, style)

Use the highlight method to pull in highlight.js styles
*/
Processor.prototype.highlight = function(language, style) {
    var config = this.plugins.code || {};
    
    // check if the specified language is an alias
    language = languageLookups[language] || language;
    
    // use defaults if not provided
    style = (style || config.style || 'default').toLowerCase();
    
    // include the highlight.js files
    this.require('js/highlight.js <= github://isagalaev/highlight.js/src/highlight.js');
    this.include('js/highlight.js');
    this.include('<script>hljs.initHighlightingOnLoad();</script>');

    // include the highlight.js style files
    this.require('css/highlight.' + style + '.css <= github://isagalaev/highlight.js/src/styles/' + style + '.css');
    this.include('css/highlight.' + style + '.css');
    
    // if we have a language for the snippet, get the language specific inclusion
    if (language) {
        this.require('js/highlight-' + language + '.js <= github://isagalaev/highlight.js/src/languages/' + language + '.js');
        this.include('js/highlight-' + language + '.js');
    }
    
    // return the language that we are highlighting
    return language;
};

Processor.prototype.include = function(target, section) {
    var defaultSection = reHeadFirstResource.test(target) ? 'head' : 'body',
        includes = this.includes[section || defaultSection],
        included = false;
        
    // if the includes are not defined, then create them now
    if (! includes) {
        includes = this.includes[section || defaultSection] = [];
    }
    
    // if the target does not already exist, then add it to the list now
    if (includes.indexOf(target) < 0) {
        includes.push(target);
    }
        
    debug('include requested: ' + target + ', into section: ' + (section || defaultSection));
};

Processor.prototype.includeExtras = function(callback) {
    var includes = [],
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
                });
            }
        }
    }
    
    // retrieve the includes
    async.forEach(
        includes,
        function(item, itemCallback) {
            getit(item.include, processor._getitOpts(), function(err, data) {
                if (! err) {
                    processor[item.key] = data;
                }
                else {
                    processor.out('!{red}unable to include: !{red,underline}' + item.include);
                }
                
                itemCallback();
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
            
            getit(source, processor._getitOpts(), function(err, data) {
                if (! err) {
                    var parser = new Parser(processor, source, data.split(/\n/));
                    
                    parser.on('item', function(item) {
                        // debug('found item: ', item);
                        processor.items.push(item);
                    });
                    
                    parser.on('end', itemCallback);
                    parser.on('error', itemCallback);

                    processor.out('!{grey}parsing: !{underline}{0}', source);
                    parser.process();
                }
                else {
                    processor.out('!{red}unable to load source: !{red,underline}' + source);
                    itemCallback();
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
            templateBase = this.templateFile.replace(rePackageJson, ''),
            templateFile = templateBase + '/template.json';
            
        // determine whether the template is a default template from the 
        // packing instructions repo or actually a local template
        if (! isRemote) {
            var localPath = path.resolve(this.basePath, templateBase);
            
            if (path.existsSync(localPath)) {
                templateBase = localPath;
            }
            else {
                templateBase = 'github://DamonOehlman/packing-instructions/' + templateBase;
                templateFile = templateBase.replace(reTrailingSlash, '') + '/template.json';
            }
        }
            
        // load the template definition
        this.out('!{grey}loading: !{underline}{0}', templateFile);
        getit(templateFile, processor._getitOpts(), function(err, data) {
            if (! err) {
                var templateOpts;
                
                try {
                    // parse the data from the template
                    templateOpts = JSON.parse(data);
                }
                catch (e) {
                    err = new Error('Unable to parse template.json definition');
                }
                
                if (! err) {
                    // set the template base path and output directory
                    templateOpts.basePath = templateBase;

                    // extend the aliases with the template aliases
                    _.extend(processor.aliases, templateOpts.aliases);

                    // create the template
                    processor.template = new Template(templateOpts);
                    processor.template.downloader = new Downloader(processor, templateOpts);
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
    getit(targetFile, this._getitOpts(), function(err, content) {
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
        debug('requiring: ' + target);
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
    
    this.out('!{magenta}processing: {0}', this.templateFile);
    
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
            
            processor.out(' ');
            
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
        catch (e2) {
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
    this.out('!{grey}writing: !{underline}{0}', this.outputFile);
    mkdirp(path.dirname(this.outputFile), function(err) {
        fs.writeFile(processor.outputFile, processor.output, 'utf8', callback);
    });
};

Processor.prototype._getitOpts = function() {
    return {
        aliases: this.aliases,
        cwd: this.basePath,
        cachePath: path.resolve(__dirname, '../.cache'),
        preferLocal: false
    };
};

module.exports = Processor;