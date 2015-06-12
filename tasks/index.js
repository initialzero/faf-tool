var colors = require("colors"),
    async = require("async"),
    normalizedPath = require("path").join(__dirname, "."),
    tasks = {};

require("fs").readdirSync(normalizedPath).forEach(function(file) {
    file = file.replace('.js', '');
    if (file === "index") return;
    tasks[file] = require("./" + file);
    tasks[file].init(tasks);

});


tasks.run = function(tasksArray, callback) {
    var tasksPull = [];

    tasksArray.forEach(function(task) {
        if (tasks.hasOwnProperty(task)) {
            tasksPull.push(async.apply(tasks[task].run));
        } else if (task) {
            console.log(colors.red("Unknown task " + task));
        }
    });

    if (!tasksPull.length) {
        tasksPull.push(async.apply(tasks["status"].run));
    }

    async.series(tasksPull, callback);

};

module.exports = tasks;