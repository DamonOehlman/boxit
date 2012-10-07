var rimraf = require('rimraf'),
    path = require('path'),
    Boxer = require('../boxer');

// action description
exports.desc = 'Clean the output directory';

exports.args = {
    'output': path
};

// export runner
exports.run = function(opts, callback) {
    rimraf(new Boxer(opts).opts.output, callback);
};