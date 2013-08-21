# BoxIt

BoxIt is a command-line tool designed to make compiling a single HTML page
(or even plain text) from multiple snippets locally a lot simpler.  This
project was created as a follow-up project to
[deckem](https://github.com/DamonOehlman/deckem) which I started as to
help with creating [deck.js](https://github.com/imakewebthings/deck.js)
presentations.  Deckem wasn't really the right solution though, as it was
too narrow in it's focus.

By comparison, BoxIt is __incredibly flexible__ and allows you to use
both __local and remote__ resources to create static local files
(suitable for offline bundling).

Creating a deck.js presentation is one potential use, but it could just
as easily be used to assist with collating multiple HTML sections of a
single page mobile app, or even possibly creating a CSV file.  


[![NPM](https://nodei.co/npm/boxit.png)](https://nodei.co/npm/boxit/)

[![Build Status](https://travis-ci.org/DamonOehlman/boxit.png?branch=master)](https://travis-ci.org/DamonOehlman/boxit)
[![stable](http://hughsk.github.io/stability-badges/dist/stable.svg)](http://github.com/hughsk/stability-badges)

## Getting Started

The first thing you need to do is to create a configuration file that
defines your project file that instructs BoxIt how to behave.  A reference
example has been[created in this repository](examples/deck.js) and the
json configuration file from that example is shown below:

```json
{
    "title": "Test Presentation",
    "template": "github://DamonOehlman/packing-instructions/deck.js",
    "sources": [
        "files/file1.html",
        "files/file2.md",
        "files/file3.jade",
        "files/subdir/"
    ]
}
```

This config file is parsed and converted into a html file (by default) with
the same name as the json file.  For instance, this example file is
[presentation.json](/examples/deck.js/presentation.json) so would be
converted to [presentation.html](examples/deck.js/output/presentation.html).

## How it works

### File Loading

To be completed.

### Template Parsing

To be completed.

## Defining a Template

To be completed, but take a look at the
[packing instructions](/DamonOehlman/packing-instructions) repository for
some examples.  Essentially, you have a `json` file that defines the
template and an accompanying [handlebars](http://handlebarsjs.com/) template
file that source files are passed through.

## Reference

### Boxer(opts)

### Boxer.findConfig(target)

### Boxer.isValidData(data)

### Boxer._createProcessors(configFiles)

## License(s)

### MIT

Copyright (c) 2013 Damon Oehlman <damon.oehlman@gmail.com>

Permission is hereby granted, free of charge, to any person obtaining
a copy of this software and associated documentation files (the
'Software'), to deal in the Software without restriction, including
without limitation the rights to use, copy, modify, merge, publish,
distribute, sublicense, and/or sell copies of the Software, and to
permit persons to whom the Software is furnished to do so, subject to
the following conditions:

The above copyright notice and this permission notice shall be
included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY
CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT,
TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
