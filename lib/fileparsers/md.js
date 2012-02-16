module.exports = function(input, callback) {
    try {
        var markdown = require('markdown').markdown;

        callback(null, markdown.toHTML(input));
    }
    catch (e) {
        callback(new Error('markdown not available, install markdown package'));
    }
};