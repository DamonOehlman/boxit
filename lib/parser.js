var path = require('path'),
    fs = require('fs'),
    getit = require('getit'),
    util = require('util'),
    events = require('events');

function Parser(processor, source, lines) {
    this.processor = processor;
    
    // determine the source type and next source type
    this.nextSourceType = this.sourceType = path.extname(source).slice(1);

    // initialise the buffer and current item attributes
    this.buffer = '';
    this.itemAttributes = [];
    this.lines = lines || [];
    this.lineIndex = 0;
    
    this.regexes = {
        addItem: /^\-{3,}(.*)$/,
        addAttribute: /^\:(.*)\:\>\s*(.*)$/
    };
}

util.inherits(Parser, events.EventEmitter);

Parser.prototype.addAttribute = function(match, callback) {
    this.itemAttributes.push({
        key: match[1],
        val: match[2]
    });
    
    if (callback) {
        callback();
    }
};

Parser.prototype.addItem = function(match, callback) {
    this.emit('item', {
        type: this.nextSourceType,
        content: this.buffer,
        attributes: this.itemAttributes
    });
    
    // reset the buffer and next source type
    this.nextSourceType = match ? match[1] || this.sourceType : this.sourceType;
    this.buffer = '';
    this.itemAttributes = [];

    if (callback) {
        callback();
    }
};

Parser.prototype.nextLine = function(err) {
    var line = this.lines[this.lineIndex],
        key, match;
        
    // if we have received an error, then report the error
    if (err) {
        this.emit('error', err);
        return;
    }
        
    // if the line index is beyond the lines length, then add the last item and return
    if (this.lineIndex > this.lines.length) {
        this.addItem();
        this.emit('end');
        return;
    }
    
    // increment the line index
    this.lineIndex += 1;
    
    // run the the regexes and look for a match
    for (key in this.regexes) {
        match = this.regexes[key].exec(line);
        if (match) {
            this[key].call(this, match, this.nextLine.bind(this));

            break;
        }
    }
    
    if (! match) {
        this.buffer += (line || '') + '\n';
        this.nextLine();
    }
};

Parser.prototype.process = function(source, lines) {
    this.lineIndex = 0;
    this.nextLine();
};

module.exports = Parser;