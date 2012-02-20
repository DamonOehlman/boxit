module.exports = function(processor, input, callback) {
    processor.tryRequire('markdown', function(err, markdown) {
        callback(err, markdown ? markdown.markdown.toHTML(input) : input);
    });

};