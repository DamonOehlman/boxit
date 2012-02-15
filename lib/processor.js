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

Processor.prototype.run = function(callback) {
    var items = [],
        processor = this;
        
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
            }
            
            // fire the callback, but don't pass on the err
            itemCallback();
        });
    }
    
    // load the sources
    async.forEachSeries(this.sources, loadSource, function(err) {
        if (callback) {
            callback(err, items);
        }
    });
    
    // if we have sources, then load the template
};

module.exports = Processor;