var async = require('async'),
    path = require('path'),
    defaultTemplate = path.resolve(__dirname, '../../templates/simple');

function Processor(targetfile, opts) {
    // ensure we have options
    opts = opts || {};
    
    // initialise members
    this.title = opts.title || 'Untitled';
    this.basepath = path.dirname(targetfile);
    this.sources = opts.sources || [];
    
    // if a template was specified, initialise it
    if (opts.template) {
        this.templatePath = path.resolve(this.basepath, opts.template);
    }
    else {
        this.templatePath = defaultTemplate;
    }
}

Processor.prototype.run = function() {
    var items = [];
    
    function loadSource(source, itemCallback) {
        
    }
    
    // load the sources
    async.forEach(this.sources, loadSource, function(err) {
        
    });
    
    // load the sources
    
    // if we have sources, then load the template
};

module.exports = Processor;