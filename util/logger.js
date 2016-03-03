var winston = require('winston');

module.exports = winston;

/////////////////////////////////////////////////////////////////
// Configure log output as you will
/////////////////////////////////////////////////////////////////
/*

require('winston-loggly');
winston.add(winston.transports.Loggly, {
    inputToken: "****",
    subdomain: "****",
    handleExceptions: true
});


var papertrail = require('winston-papertrail').Papertrail;
winston.add(papertrail, {
    host: 'logs.papertrailapp.com',
    port: 0,
    colorize: true
});

*/