var Boxer = require('./lib/boxer'),
    Processor = require('./lib/processor');
    
exports = module.exports = function(target) {
    return new Boxer(target);
};

exports.Boxer = Boxer;
exports.Processor = Processor;