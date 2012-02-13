var path = require('path'),
    textsetter = require('../../'),
    configFile = path.resolve(__dirname, '../../examples/deck.js/presentation.json');

module.exports = textsetter(configFile);