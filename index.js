var TextSetter = require('./lib/textsetter'),
    Processor = require('./lib/processor');
    
exports = module.exports = function(target) {
    return new TextSetter(target);
};

exports.TextSetter = TextSetter;
exports.Processor = Processor;