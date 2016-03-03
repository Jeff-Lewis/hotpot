module.exports = function(router, modules, env) {
    
    router.use(modules.helpers);
    router.use(modules.session);
    router.use(modules.body);
    router.use(modules.security);
    
};