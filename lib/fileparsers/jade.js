module.exports = function(processor, input, callback) {
  processor.tryRequire('jade', function(err, jade) {
    callback(err, jade ? jade.compile(input)() : input);
  });
};