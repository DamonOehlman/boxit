module.exports = function(processor, input, callback) {
  // don't need to do anything to the content, just send it straight back
  callback(null, input);
};