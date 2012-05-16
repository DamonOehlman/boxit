var marked = require('marked');

module.exports = function(processor, input, callback) {
    callback(null, marked(input));
};