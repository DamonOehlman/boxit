var path = require('path'),
    fs = require('fs'),
    getit = require('getit'),
    reExtension = /.*\.(\w+)$/,
    languageLookups = {
        js: 'javascript'
    };

module.exports = function(processor, input, callback) {
    var fields = (input || '').split(/\s/), // split the fields on spaces
        config = processor.plugins.code || {};
        
    if (fields.length > 0) {
        var extensionMatch = reExtension.exec(fields[0]),
            extension = (extensionMatch ? extensionMatch[1] || 'js' : 'js').toLowerCase(),
            language = languageLookups[extension] || extension,
            style = (fields[1] || config.style || 'default').toLowerCase(),
            content = '<pre><code>' + fields[0] + ' not found</code></pre>';
        
        getit(fields[0], processor._getitOpts(), function(err, data) {
            if (! err) {
                // wrap the content in a pre code block
                content = '<pre><code class="' + language + '">' + data + '</pre></code>';
                
                // include the highlight.js files
                processor.require('js/highlight.js <= github://isagalaev/highlight.js/src/highlight.js');
                processor.include('js/highlight.js');
                processor.include('<script>hljs.initHighlightingOnLoad();</script>');

                // include the highlight.js style files
                processor.require('css/highlight.' + style + '.css <= github://isagalaev/highlight.js/src/styles/' + style + '.css');
                processor.include('css/highlight.' + style + '.css');
                
                // if we have a language for the snippet, get the language specific inclusion
                if (language) {
                    processor.require('js/highlight-' + language + '.js <= github://isagalaev/highlight.js/src/languages/' + language + '.js');
                    processor.include('js/highlight-' + language + '.js');
                }
            }

            // TODO: include highlight js library in the base of the doc
            callback(null, content);
        });
    }
};