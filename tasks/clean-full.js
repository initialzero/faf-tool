var faf = require("../faf/faf"),
    svn = require("../svn"),
    util = require("../util"),
    tasks;

exports.init = function(globalTasks) {
    tasks = globalTasks;
};

exports.run = function(callback) {
    console.log("clean full".green);

    util.ask({
        type: "confirm",
        name: "cleanFull",
        message: "Remove all modules from current project?",
        default: false
    }, util.answer.confirm("cleanFull", function() {
        faf.removeAllFolders(callback);
    }, callback));
};

