var path = require('path'),
    fs = require('fs'),
    getit = require('getit'),
    reExtension = /.*\.(\w+)$/;

module.exports = function(processor, input, callback) {
    // split the fields on spaces
    var fields = (input || '').split(/\s/); 
        
    if (fields.length > 0) {
        var extensionMatch = reExtension.exec(fields[0]),
            extension = (extensionMatch ? extensionMatch[1] || 'js' : 'js').toLowerCase(),
            content = '<pre><code>' + fields[0] + ' not found</code></pre>';
        
        getit(fields[0], processor._getitOpts(), function(err, data) {
            if (! err) {
                // require hljs for the appropriate language and style
                var language = processor.highlight(extension, fields[1]);

                // wrap the content in a pre code block
                content = '<pre><code class="' + language + '">' + data + '</pre></code>';
            }

            // TODO: include highlight js library in the base of the doc
            callback(null, content);
        });
    }
};