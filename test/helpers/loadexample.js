var path = require('path'),
    boxit = require('../../'),
    configFile = path.resolve(__dirname, '../../examples/deck.js/presentation.json');

module.exports = boxit(configFile);