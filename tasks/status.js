var colors = require("colors");
var util = require("../util.js");
var faf = require("../faf/faf");
var Table = require('cli-table');
fs = require('fs');


// shows status of current project

// read settings.json
// look at current dir content.

var tasks;
exports.init = function(globalTasks) {
    tasks = globalTasks;
};


exports.run = function(callback) {
    console.log("status".green);

    getFolderContent();
    processSettingsFile();
    runMenu();

};
function runMenu() {
    // TODO check is project configured, if not, show only "configure" task
    util.ask({
        type: "list",
        name: "topMenu",
        message: "choose action",
        choices: [
            "configure",
            util.separator(),
            "setup",
            "checkout",
            "init",
            "update",
            "downmerge",
            "clean-full",
            "exit"
        ]
    }, function(answers) {
        if (answers.topMenu === "exit") {
            process.exit();
        } else if (answers.topMenu === "configure") {
            // TODO
require("../svn").getModuleDependencies("jrs-ui-pro", runMenu);
        } else {
            tasks.run([answers.topMenu], runMenu);
        }
    });
}

function getFolderContent() {
    var modules = faf.modules();
    var table = new Table({
        head: [
            "module",
            "branch",
            "commits between"
        ]
        //colWidths: [100, 200]
    });

    for (var i = 0, l = modules.length; i < l; i++) {
        table.push(checkModuleStatus(modules[i]));
    }
    console.log(table.toString());
}
function checkModuleStatus(module) {
    var row = [module];
    // is folder exists
    var exists = fs.existsSync(module);
    if (!exists) {
        return [module, colors.yellow("not exists")];
    } else {
        row.push(colors.green("exists"));
    }
    // does it contain svn
    // svn info - branch name
    // check remote svn last version
    // svn status result... analise

    return row;
}


function processSettingsFile() {
    var settings = util.readJSON("./settings.json");
    if (settings === null) {
        console.log(colors.red("settings.json doesn't exist."));
        // TODO run prompt, ask to copy file from skeleton
        util.ask({
            type: "confirm",
            name: "createSettingsFile",
            message: "Do you want to create settings.json from template?",
            default: true
        }, util.answer.confirm("createSettingsFile", copySettingsFile, showSettingsFile));
    } else {
        showSettingsFile();
    }
}

function copySettingsFile() {
    util.createSettingsFile(function() {
        faf.loadSettings();
        showSettingsFile();
    });
}

function showSettingsFile() {
    // TODO prettify output


    /*
    * svn-server: svnserver.jaspersoft.com
    * release-cycle:
    *
    * modules:
    *   bi-report:
    *       exclude from faf-tool commands
    *       branch
    *       revision / remote revision
    *       last updated
    *       last initialized
    *       last check (need to extend faf-grunt with check task - test+jshint)
    *
    *
    *
    * command - exclude module from faf-tool
    *
    *
    * */


    var settings = faf.settings();
    if (settings) {
        console.log(settings);
    }
}