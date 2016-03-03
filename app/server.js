var cluster = require('cluster'),
    logger = require("../util/logger"),
    app = null;

var workers = { },
    count = require('os').cpus().length;

function spawn(){
    try {
        var worker = cluster.fork();
        workers[worker.process.pid] = worker;
        return worker;
    }
    catch (ex) {
        logger.error("Error spawning new Web Server.");
        logger.error(ex.stack);
    }
}
    
if (cluster.isMaster) {
    try {
        if (process.env.NODE_ENV != "production" || process.argv[2] == "dev") {
            count = 1;
            process.env.NODE_ENV = "development";
            logger.info("Web Cluster launching in local mode.");
        }
        else {
            process.env.NODE_ENV = "production";
            logger.info("Web Cluster launching in hosted mode.");
        }
    }
    catch(ex) {
        logger.error(ex.stack);
    }
    
    for (var i = 0; i < count; i++) {
        spawn();
    }
    
    cluster.on('exit', function(worker) {
        logger.warn('Web Server ' + worker.process.pid + ' died. Spawning a new process...');
        delete workers[worker.process.pid];
        spawn();
    });
} 
else {
    try {
        app = require('./pipeline.js');
        app.listen(app.get('port'), function() {
            logger.info('Web Server ' + cluster.worker.process.pid + ' listening on port ' + app.get('port') + ".");
        });
    }
    catch (ex) {
        logger.error(ex.stack);
    }
}

process.on('uncaughtException', function(err) {
    logger.error("Uncaught exception!!! " + (err ? err.message : ""));
    logger.error(err.stack);
});