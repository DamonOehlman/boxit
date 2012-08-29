var assert = require('assert'),
    setter, _processor;

describe('loader tests', function() {
    it('should be able to capture a processor being created', function(done) {
        setter = require('./helpers/loadexample');
        
        setter.on('processor', function(processor) {
            _processor = processor;
            done();
        });
    });
    
    it('should be able to run a processor', function(done) {
        _processor.run(function(err, items) {
            assert.ifError(err);
            assert(items);
            assert(items.output);
            
            done(err);
        });
    });
});