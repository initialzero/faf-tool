// TODO provide option --hard to run npm install && prune

var tasks;
exports.init = function(globalTasks) {
    tasks = globalTasks;
};

exports.run = function(callback) {
    console.log("init".green);
};