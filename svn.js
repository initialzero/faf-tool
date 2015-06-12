var faf = require("./faf/faf"),
    util = require("./util");



function checkout(module, callback) {
    util.spawn("svn", [
        "checkout",
        getSettingsBranchPath(module),
        module
    ], callback);
}
exports.checkout = checkout;

function getModuleDependencies(module, callback) {
    catRemoteBowerConfig(module, function(error, data) {
        if (!data || error) {
            console.log(error);
            callback();
            return;
        }
        var moduleDeps = JSON.parse(data).dependencies;
        console.log(moduleDeps)
        callback();
    });
}
exports.getModuleDependencies = getModuleDependencies;

function catRemoteBowerConfig(module, callback) {
    util.spawn("svn", [
        "cat",
        getSettingsBranchPath(module) + "/bower.json"
    ], callback);
}

function getSettingsBranchPath(module) {
    var settings = faf.settings();

    if (getBranchName() === "trunk") {
        return getTrunkBranchPath(module);
    }

    if (module === "jasperserver") {
        return getRepoPath(module, "branches/" + settings["jasperserver-branch"]);
    }
    if (module === "jasperserver-pro") {
        return getRepoPath(module, "branches/" + settings["jasperserver-pro-branch"]);
    }
    return getRepoPath(module, "branches/" + getBranchName());
}

function getTrunkBranchPath(module) {
    return getRepoPath(module, "trunk");
}

function getRepoPath(module, path) {
    var settings = faf.settings();

    var defaultSchema = "https:/",
        domain = settings["svn-server"],
        repoPath = [domain, module, path];

    if(domain.indexOf(':/') == -1){
        repoPath = [defaultSchema].concat(repoPath);
    }

    return repoPath.join("/");
}

function getBranchName() {
    var settings = faf.settings();

    if (settings["feature-name"] === "trunk") {
        return "trunk";
    } else {
        return (settings["release-cycle"] ? settings["release-cycle"] + "-" : "") + settings["feature-name"];
    }
}
