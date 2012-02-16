module.exports = function(input, callback) {
    // try including jade
    try {
        var jade = require('jade'),
            translate = jade.compile(input);
        
        callback(null, translate());
    }
    catch (e) {
        callback(new Error('jade not installed, unable to parse .jade files'));
    }
};