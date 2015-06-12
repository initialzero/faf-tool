var tasks;

exports.init = function(globalTasks) {
    tasks = globalTasks;
};

exports.run = function(callback) {
    console.log("setup".green);
    tasks.run([
        "checkout",
        "init"
    ], callback);
};