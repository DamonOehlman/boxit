# TextSetter

TextSetter is a command-line tool designed to make compiling a single HTML page (or even plain text) from multiple snippets locally a lot simpler.  This project was created as a follow-up project to [deckem](https://github.com/DamonOehlman/deckem) which I started as to help with creating [deck.js](https://github.com/imakewebthings/deck.js) presentations.  It's not really the right solution though, and is too restricted in what it does.  

By comparison, TextSetter is __incredibly flexible__ and allows you to use both __local and remote__ resources to create static local files (suitable for offline bundling).  Creating a deck.js presentation is one potential use, but it could just as easily be used to assist with collating multiple HTML sections of a single page mobile app, or even possibly creating a CSV file.  

## Getting Started

The first thing you need to do is to create a configuration file that defines your project file that instructs TextSetter how to behave.  An example file is shown below:

```json
{
    "template": "template.html"
    "sources": [
        "files/file1.html",
        "files/file2.md",
        "files/file3.jade",
        "files/subdir/",
        "github://DamonOehlman/textsetter/examples/files/test.md"
    ]
}
```

## Programmatic Usage

To be completed.

## Defining a Template
