var faf = require("../faf/faf"),
    svn = require("../svn"),
    util = require("../util"),
    tasks;

exports.init = function(globalTasks) {
    tasks = globalTasks;
};

exports.run = function(callback) {
    console.log("checkout".green);

    //var modules = faf.getActiveModules();

    // check settings. is there settings

    var settings = faf.settings();
    var projectModules = settings.modules;
    if (!projectModules.length) {
        // TODO checkout serial and read deps

    } else {
        util.runParallel(svn.checkout, projectModules, function(err, res) {
            console.log("checkout done".green);
            callback();
        });
    }
};

