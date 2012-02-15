var expect = require('chai').expect,
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
            expect(items).to.exist;
            expect(items.length).to.be.above(0);
            
            done(err);
        });
    });
});