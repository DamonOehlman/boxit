___I'm thinking about building:___

# TextSetter

TextSetter is a command-line tool designed to make compiling a single HTML page (or even plain text) from multiple snippets locally a lot simpler.  This project was created as a follow-up project to [deckem](https://github.com/DamonOehlman/deckem) which I started as to help with creating [deck.js](https://github.com/imakewebthings/deck.js) presentations.  Deckem wasn't really the right solution though, as it was too narrow in it's focus.

By comparison, TextSetter is __incredibly flexible__ and allows you to use both __local and remote__ resources to create static local files (suitable for offline bundling).

Creating a deck.js presentation is one potential use, but it could just as easily be used to assist with collating multiple HTML sections of a single page mobile app, or even possibly creating a CSV file.  

## Getting Started

The first thing you need to do is to create a configuration file that defines your project file that instructs TextSetter how to behave.  A reference example has been [created in this repository](/DamonOehlman/textsetter/tree/master/examples/deck.js) and the json configuration file from that example is shown below:

```json
{
    "title": "Test Presentation",
    "template": "../../templates/deck.js/"
    "files": [
        "files/file1.html",
        "files/file2.md",
        "files/file3.jade",
        "files/subdir/",
        "github://DamonOehlman/textsetter/examples/deck.js/files/test.md"
    ]
}
```

## Defining a Template

To be completed, but you could look at the [deck.js example](/DamonOehlman/textsetter/tree/master/templates/deck.js) for my current thoughts.

## Feedback?

Before I start writing any code on this it would be great to get some feedback on whether there are already good tools that do this kind of thing, and/or whether this approach is worth exploring.
