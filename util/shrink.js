require("sugar");

var ejs = require("ejs");

String.prototype.shrink = function(removeLinePadding, removeNewlines, removeInternalSpacing) {
    var str = this;
    //str = str.replace(/\<\!\-\-.*\-\-\>/gm, '');
    //str = str.replace(/\/\/[^\n]+/gm, '');
    
    if (removeLinePadding) str = str.replace(/^\s+|\s+$/gm, '');
    if (removeNewlines) str = str.replace(/\n/gm, ' ');
    if (removeInternalSpacing) str = str.replace(/\s+/gm, ' ');
    return str;
};

var parse = ejs.parse;
ejs.parse = function(str, options) {
    str = str.shrink(true, true, false);
    return parse.apply(this, [str, options]);
};