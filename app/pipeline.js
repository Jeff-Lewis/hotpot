var fs = require("fs"),
    path = require("path"),
    express = require("express"),
    responseTime = require("response-time"),
    cookieParser = require("cookie-parser"),
    methodOverride = require("method-override"),
    bodyParser = require("body-parser"),
    compression = require("compression"),
    ejs = require("ejs"),
    sanitize = require("google-caja").sanitize,
    validator = require("validator"),
    uuid = require("node-uuid"),
    sessionProvider = require("express-session"),
    passport = require("passport"),
    DynamoDBStore = require("connect-dynamodb")({ session: sessionProvider }),
    logger = require("../util/logger");


//////////////////////////////////////////////////////////////////////
// BASE APP
//////////////////////////////////////////////////////////////////////
var app = express();


//////////////////////////////////////////////////////////////////////
// CONFIGURATION
//////////////////////////////////////////////////////////////////////
var config = JSON.parse(fs.readFileSync(__dirname + "/config.json").toString());

module.exports = app;
exports.listen = function(port, cb) {
    app.listen(port);
    if (cb) cb();
};

if (process.env.NODE_ENV == "development" || config.app.env == "development") app.set("env", "development");
else app.set("env", "production");

app.set('port', process.env.PORT || config.app.port || 3000);
app.set('views', path.join(__dirname, 'src/views'));

require("../util/shrink");
app.set('view engine', 'ejs');

app.enable('trust proxy');
app.disable("x-powered-by");


//////////////////////////////////////////////////////////////////////
// HELPERS
//////////////////////////////////////////////////////////////////////
var helpers = express.Router();
helpers.use(function(req, res, next) {
    
    res.setHeader("Cache-Control", "private, max-age=0, no-cache");
    
    req.uuid = uuid;
    
    req.check = validator;
    
    req.sanitize = sanitize;
    
    res.rateLimit = function(wait) {
        res.statusCode = 429;
        if (!wait) res.end();
    };
    
    res.unauthorized = function(wait) {
        res.statusCode = 401;
        if (!wait) res.end();
    };
    
    res.forbidden = function(wait) {
        res.statusCode = 403;
        if (!wait) res.end();
    };
    
    res.notFound = function() {
        res.statusCode = 404;
        res.render("errors/404", { req: req, res: res });
    }
    
    res.redirectToLogin = function(wait) {
        res.writeHead(302, { 'Location': "/" });
        if (!wait) res.end();
    };

    res.serve = function(file, data) {
        if (data == null) data = { };
        try {
            res.render(file, { 
                req: req, 
                res: res,
                data: data 
            });
        }
        catch (ex) {
            res.statusCode = 500;
            next(ex);
        }
    };
    
    res.cache = function(age) {
        res.setHeader("Cache-Control", "max-age=" + age);
        return res;
    };
    
    res.success = function(result) {
        result = result || { };
        result.success = true;
        res.json(result);
    };
    
    res.fail = function(result) {
        result = result || { };
        result.success = false;
        res.json(result);
    };
    
    res.error = function(err) {
        res.json({ 
            success: false, 
            errors: [ err ? err.message : "Epic fail." ] 
        });
    };
    
    next();
});


//////////////////////////////////////////////////////////////////////
// SESSION STATE
//////////////////////////////////////////////////////////////////////
var session = express.Router();
session.use(responseTime());
session.use(cookieParser(config.encrpytion.cookie));

if (app.get("env") == "production") {
    logger.info("Using DynamoDB session store.");
    app.use(sessionProvider({ 
        name: 'sid',
        secret: config.encrpytion.session,
        store: null, // new DynamoDBStore({ client: ciusi.dynamo, table: "CIUSI_Sessions" }), 
        proxy: true,
        cookie: { 
            path: '/', 
            httpOnly: true, 
            secure: true
        },
        resave: false,
        saveUninitialized: false
    }));
} 
else {
    logger.info("Using memory session store in env '" + app.get("env") + "'.");
    session.use(sessionProvider({
        name: 'sid.local',
        secret: 'local-secret-is-not-so-secret',
        cookie: { 
            path: '/', 
            httpOnly: true, 
            secure: false 
        },
        resave: false,
        saveUninitialized: false
    }));
}


//////////////////////////////////////////////////////////////////////
// BODY PARSERS
//////////////////////////////////////////////////////////////////////
var body = express.Router();
body.use(bodyParser.urlencoded({ extended: true }));
body.use(bodyParser.json());


//////////////////////////////////////////////////////////////////////
// SECURITY
//////////////////////////////////////////////////////////////////////
var security = express.Router();
security.use(function(req, res, next) { 
    if (!req.session) {
        logger.warn("No session object found in security module.");
        res.forbidden();
    }
    else {
        if (req.session.user) next();
        else res.unauthorized();
    }
});


//////////////////////////////////////////////////////////////////////
// LOGGING
//////////////////////////////////////////////////////////////////////
function requestLog(prefix) {
    return function(req, res, next) {
        logger.info(Date.create().format(req.method + " " + (prefix ? prefix : "") + req.url));
        next();
    };
}

app.use(methodOverride());

if (app.get('env') == "development") {
    logger.info("Using development request logging.");
    app.use(requestLog());
}


//////////////////////////////////////////////////////////////////////
// STATIC FILES
//////////////////////////////////////////////////////////////////////
app.use(compression({ threshold: 1024 }));
app.use(express.static(path.join(__dirname, 'static')));


//////////////////////////////////////////////////////////////////////
// BUILD ROUTES
//////////////////////////////////////////////////////////////////////
fs.readdirSync(__dirname + "/../routes").filter(function(file) {
    return file.endsWith(".js");
}).forEach(function(file) {
    var router = express.Router();
    file = "/" + file.replace(".js", "");
    router.use(requestLog(file));
    
    require(__dirname + "/../routes" + file)(router, {
        helpers: helpers,
        session: session,
        body: body,
        passport: passport,
        security: security,
        log: requestLog(file),
        env: app.get('env')
    });
    
    if (file == "/index") app.use("/", router);
    else app.use(file, router);
});


//////////////////////////////////////////////////////////////////////
// ERROR HANDLING
//////////////////////////////////////////////////////////////////////
app.get("/errors/:code", function(req, res, next) {
    logger.error("ERROR PAGE REQUEST FOR STATUS CODE " + req.params.code);
    res.statusCode = req.params.code;
    res.render("errors/generic", { req: req, res: res });
});

app.use(function(req, res, next){
    res.statusCode = 404;
    res.render("errors/404", { req: req, res: res });
});

app.use(function(err, req, res, next) {
    if (err) {
        if (err.stack) logger.error(err.stack);
        else logger.error(err);
    }
    
    if (res.statusCode == 200 || res.statusCode >= 500) {
        if (res.statusCode == 200) res.statusCode = 500;
        res.render("errors/500", { err: err, req: req, res: res });
    }
    else if (res.statusCode >= 400 && res.statusCode < 404) {
        res.render("errors/400", { err: err, req: req, res: res });
    }
    else {
        res.render("errors/other", { err: err, req: req, res: res });
    }
});