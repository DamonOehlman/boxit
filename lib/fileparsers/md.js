var marked = require('marked'),
    reCodeBlock = /^`{3}(\w+)/;

module.exports = function(processor, input, callback) {
    var lines = input.split(/\n/);
    
    // parse the lines to see if a GHFM code block exists
    lines.forEach(function(line) {
        var match = reCodeBlock.exec(line);
        
        // if we have a match, then include the language specified
        if (match) {
            processor.highlight(match[1]);
        }
    });
    
    // run through the markdown processor
    callback(null, marked(input));
};