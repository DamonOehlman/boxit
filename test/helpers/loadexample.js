var path = require('path');
var boxit = require('../../');
var configFile = path.resolve(__dirname, '../../examples/deck.js/presentation.json');

module.exports = boxit(configFile);