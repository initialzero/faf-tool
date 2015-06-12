var util = require("../util");


var settings, modules;

function loadModules() {
    modules = util.readJSON("faf/faf-modules.json", null, "ft");
    return modules;
}

exports.modules = function() {
    if (!modules) loadModules();
    return modules;
};

function loadSettings() {
    settings = util.readJSON("settings.json");
    return settings;
}

exports.settings = function() {
    if (!settings) loadSettings();
    return settings;
};


exports.loadSettings = loadSettings;


exports.removeAllFolders = removeAllFolders;
function removeAllFolders(callback) {
    var modules = exports.modules();
    modules.unshift("-rf");
    util.spawn("rm", modules, callback);
}


/*
* fafBranch
*
*
*
* */
exports.fafBranchName = function() {
    return settings["release-cycle"] + "-" + settings["feature-name"];
};