module.exports = function(grunt) {
    var settings,
        async = require("async"),
        cwd = grunt.option("cwd") || ".";

    require('load-grunt-tasks')(grunt);
    !grunt.option("no-time") && require('time-grunt')(grunt);

    grunt.file.copy("settings.json.example", cwd + "/settings.json.example");

    grunt.file.setBase(cwd);

    try {
        settings = grunt.file.readJSON('settings.json');
    } catch (e) {
        writeHelp();
        grunt.fatal(e.message + "\r\nUse settings.json.example to create settings.json");
    }

    var username = grunt.option("username") || settings["username"];
    var password = grunt.option("password") || settings["password"];

    grunt.initConfig({
        clean: settings.modules.concat(["jasperserver", "jasperserver-pro"]),
        shell: {
            mock: {
                command: ""
            }
        }
    });


    // Public tasks

    // This task only for buildomatic usage
    grunt.registerTask('create-feature', 'Create new feature branches and setup it.', [
        "create-branches",
        "checkout-settings-files",
        "resolve-deps",
        "update-overlay-versions",
        "checkin-settings"
    ]);

    // This task for developers
    grunt.registerTask('setup', 'Checkout feature branches and setup FAF.', [
        "checkout-full",
        "init"
    ]);

    grunt.registerTask('downmerge', 'Downmerge project from trunk', function() {
        var tasks = [],
            done = this.async();

        settings["modules"].forEach(function(module) {
            grunt.log.writeln("Downmerge module: " + module);
            tasks.push(async.apply(svnUpModuleAndDownmerge, module));
        });

        if (settings["jasperserver-branch"]) {
            grunt.log.writeln("Downmerge module: jasperserver");
            tasks.push(async.apply(svnUpModuleAndDownmerge, "jasperserver"));
        }
        if (settings["jasperserver-pro-branch"]) {
            grunt.log.writeln("Downmerge module: jasperserver-pro");
            tasks.push(async.apply(svnUpModuleAndDownmerge, "jasperserver-pro"));
        }

        if (grunt.option("dry-run")) {
            done();
        } else if (grunt.option("parallel") === "false") {
            async.series(tasks, done);
        } else {
            async.parallel(tasks, done);
        }
    });

    grunt.registerTask('default', 'Default task.', function() {
        writeHelp();
    });


    // Private tasks

    grunt.registerTask('create-branches', 'Creates svn branches for modules.', function() {
        var tasks = [],
            done = this.async();

        settings["modules"].forEach(function(module) {
            grunt.log.writeln("Create svn branch for " + module);
            tasks.push(async.apply(createBranch, module));
        });

        if (grunt.option("dry-run")) {
            done();
        } else {
            async.series(tasks, done);
        }
    });

    grunt.registerTask('checkout-settings-files', 'Checkout bower.json and package.json for modules for updating it.', function() {
        var tasks = [],
            done = this.async();

        settings["modules"].forEach(function(module) {
            grunt.log.writeln("Checkout required files for " + module);
            tasks.push(async.apply(checkoutSettingsFiles, module));
        });
        if (settings["jasperserver-branch"]) {
            grunt.log.writeln("Checkout required files for jasperserver");
            tasks.push(async.apply(checkoutSettingsFilesJrs));
        }
        if (settings["jasperserver-pro-branch"]) {
            grunt.log.writeln("Checkout required files for jasperserver-pro");
            tasks.push(async.apply(checkoutSettingsFilesJrsPro));
        }

        if (grunt.option("dry-run")) {
            done();
        } else {
            async.series(tasks, done);
        }
    });

    grunt.registerTask('resolve-deps', 'Resolve bower dependencies.', function() {
        settings["modules"].forEach(function(module) {
            var bowerConfPath = module + "/bower.json",
                branchName = getBranchName();

            grunt.verbose.subhead("Resolve bower dependencies for " + module + ": ");

            if (grunt.option("dry-run")) {
                return;
            }

            var bowerConfig = grunt.file.readJSON(bowerConfPath);
            bowerConfig.resolutions = bowerConfig.resolutions || {};

            for (var depName in bowerConfig.dependencies) {
                if (!bowerConfig.dependencies.hasOwnProperty(depName)) continue;
                if (settings["modules"].indexOf(depName) !== -1) {
                    bowerConfig.dependencies[depName] = bowerConfig.dependencies[depName].replace(/#(.+)$/, "#" + branchName);
                    bowerConfig.resolutions[depName] = branchName;
                    grunt.verbose.writeln(depName + "#" + branchName);
                }
            }

            grunt.file.write(bowerConfPath, JSON.stringify(bowerConfig, null, " "));
        });
    });

    grunt.registerTask('update-overlay-versions', 'Update overlay versions in jrs-ui, jrs-ui-pro and in JRS poms.', function() {
        var fileContent, filePath, ceOverlayVersion, proOverlayVersion;

        grunt.verbose.subhead("Update overlay versions");

        if (grunt.option("dry-run")) {
            return;
        }

        if (settings.modules.indexOf("jrs-ui") !== -1) {
            grunt.verbose.writeln("Update jrs-ui overlay version");
            fileContent = grunt.file.readJSON("jrs-ui/package.json");
            ceOverlayVersion = settings["feature-name"] + "-SNAPSHOT";
            settings["jrs-ui-overlayVersion"] = fileContent.overlayVersion = ceOverlayVersion;
            grunt.file.write("jrs-ui/package.json", JSON.stringify(fileContent, null, "  "));
            grunt.file.write("settings.json", JSON.stringify(settings, null, "  "));

            if (settings["jasperserver-branch"] || settings["jasperserver-ci-path"]) {
                grunt.verbose.writeln("Update jrs-ui overlay version in jasperserver");
                filePath = (settings["jasperserver-ci-path"] || "jasperserver") + "/jasperserver-war/pom.xml";
                fileContent = grunt.file.read(filePath); // this is jasperserver/jasperserver-war/pom.xml file!
                fileContent = fileContent.replace(/(jrs-ui<\/artifactId>\s+<version>)[^<]+(<\/version>)/, "$1" + ceOverlayVersion + "$2");
                grunt.file.write(filePath, fileContent);
            }
        }

        if (settings.modules.indexOf("jrs-ui-pro") !== -1) {
            grunt.verbose.writeln("Update jrs-ui-pro overlay version");
            fileContent = grunt.file.readJSON("jrs-ui-pro/package.json");
            proOverlayVersion = settings["feature-name"] + "-SNAPSHOT";
            settings["jrs-ui-pro-overlayVersion"] = fileContent.overlayVersion = proOverlayVersion;
            grunt.file.write("jrs-ui-pro/package.json", JSON.stringify(fileContent, null, "  "));
            grunt.file.write("settings.json", JSON.stringify(settings, null, "  "));

            if (settings["jasperserver-pro-branch"] || settings["jasperserver-pro-ci-path"]) {
                grunt.verbose.writeln("Update jrs-ui-pro overlay version in jasperserver-pro");
                filePath = (settings["jasperserver-pro-ci-path"] || "jasperserver-pro") + "/jasperserver-war/pom.xml";
                fileContent = grunt.file.read(filePath); // this is jasperserver-pro/jasperserver-war/pom.xml file!
                fileContent = fileContent.replace(/(jrs-ui-pro<\/artifactId>\s+<version>)[^<]+(<\/version>)/, "$1" + proOverlayVersion + "$2");
                grunt.file.write(filePath, fileContent);
            }
        }



    });

    grunt.registerTask('checkin-settings', 'Checking in updated settings files to repos.', function() {
        var tasks = [],
            done = this.async();

        settings["modules"].forEach(function(module) {
            grunt.log.writeln("Checking in updated settings files for " + module);
            tasks.push(async.apply(checkinSettings, null, module));
        });

        // disable commits for JRS
        /*
        if (settings["jasperserver-branch"]) {
            tasks.push(async.apply(checkinSettings, true, "jasperserver"));
        }
        if (settings["jasperserver-pro-branch"]) {
            tasks.push(async.apply(checkinSettings, true, "jasperserver-pro"));
        }*/

        if (grunt.option("dry-run")) {
            done();
        } else {
            async.series(tasks, done);
        }
    });

    grunt.registerTask('init', 'Setup FAF. Install npm modules, init grunt.', [
        "load-init-settings",
        "shell"
    ]);

    grunt.registerTask('checkout-full', 'Checkout full selected repos', function() {
        var tasks = [],
            done = this.async();

        settings["modules"].forEach(function(module) {
            grunt.log.writeln("Checkout module: " + module);
            tasks.push(async.apply(checkoutFull, module));
        });

        if (settings["jasperserver-branch"]) {
            grunt.log.writeln("Checkout module: jasperserver");
            tasks.push(async.apply(checkoutFull, "jasperserver"));
        }
        if (settings["jasperserver-pro-branch"]) {
            grunt.log.writeln("Checkout module: jasperserver-pro");
            tasks.push(async.apply(checkoutFull, "jasperserver-pro"));
        }

        if (grunt.option("dry-run")) {
            done();
        } else {
            async.series(tasks, done);
        }
    });

    grunt.registerTask('load-init-settings', 'Load settings and create config for initialization commands.', function(){

        grunt.log.writeln("Load settings and create config for initialization commands.");

        var shell_config = {};
        settings["modules"].forEach(function(module) {
            shell_config[module] = {
                command: "npm install && npm prune && grunt init",
                options: {
                    execOptions: {
                        cwd: "./" + module
                    }
                }
            };
        });

        grunt.log.ok("Settings loaded");

        if (grunt.option("dry-run")) {
            grunt.log.writeln(JSON.stringify(shell_config, null, 2));
        } else {
            grunt.config.set("shell", shell_config);
        }
    });

    function getSettingsBranchPath(module) {
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

        var defaultSchema = "https:/",
            domain = settings["svn-server"],
            repoPath = [domain, module, path];

          if(domain.indexOf(':/') == -1){
            repoPath = [defaultSchema].concat(repoPath);
          }

        return repoPath.join("/");
    }

    function getBranchName() {
        return (settings["release-cycle"] ? settings["release-cycle"] + "-" : "") + settings["feature-name"];
    }

    function createBranch(module, callback) {
        var args = [
            "copy",
            getTrunkBranchPath(module),
            getSettingsBranchPath(module),
            "-m",
            "Created a feature branch from Jenkins with name: " + getBranchName()
        ];
        username && args.push("--username=" + username);
        password && args.push("--password=" + password);
        execSvn(args, callback);
    }

    function checkoutFull(module, callback) {
        execSvn([
            "checkout",
            getSettingsBranchPath(module),
            module
        ], callback);
    }

    function downmergeModule(module, callback) {
        execSvn([
            "merge",
            getRepoPath(module, "trunk"),
            module,
            "--accept=" + (grunt.option["accept"] || "postpone")
        ], callback);
    }

    function svnUpModule(module, callback) {
        execSvn([
            "up",
            module
        ], callback);
    }

    function svnAddToChangelist(module, changelist, callback) {
        grunt.log.writeln("Adding module [" + module + "] to a changelist [" + changelist + "]");
        execSvn([
            "changelist",
            "--recursive",
            changelist,
            module
        ], callback)
    }

    function svnUpModuleAndDownmerge(module, callback) {
        svnUpModule(module, function() {
            downmergeModule(module, function() {
                if (grunt.option("separate-changelist") === "false") {
                    callback.apply(this, arguments);
                } else {
                    svnAddToChangelist(module, module, callback);
                }
            })
        });
    }

    function checkoutSettingsFiles(module, callback) {
        execSvn([
            "checkout",
            getSettingsBranchPath(module),
            module,
            "--depth",
            "files"
        ], callback);
    }

    function checkoutSettingsFilesJrs(callback) {
        execSvn([
            "checkout",
            getRepoPath("jasperserver", "branches/" + settings["jasperserver-branch"]),
            "jasperserver",
            "--depth",
            "immediates"
        ], function() {
            execSvn([
                "up",
                "jasperserver/jasperserver-war",
                "--set-depth",
                "files"
            ], callback);
        });
    }
    function checkoutSettingsFilesJrsPro(callback) {
        execSvn([
            "checkout",
            getRepoPath("jasperserver-pro", "branches/" + settings["jasperserver-pro-branch"]),
            "jasperserver-pro",
            "--depth",
            "immediates"
        ], function() {
            execSvn([
                "up",
                "jasperserver-pro/jasperserver-war",
                "--set-depth",
                "files"
            ], callback);
        });
    }

    function checkinSettings(jrs, module, callback) {
        var args = [
            "commit",
            module,
            "-m",
            jrs ? "Resolved bower dependencies and updated overlay version" : "Updated overlay version"
        ];
        username && args.push("--username=" + username);
        password && args.push("--password=" + password);
        execSvn(args, callback);
    }


    function execSvn(args, callback) {
        grunt.util.spawn({
            cmd: "svn",
            args: args
        }, function(error, result, code) {
            if (error) grunt.log.error(error);
            grunt.log.writeln(result);
            callback(error, result);
        });
    }

    function tab(n) {
        return new Array((n || 1) * 4).join(" ");
    }
    function writeHelp() {
        grunt.log.writeln("Full description: https://github.com/Jaspersoft/faf-tool");
        grunt.log.writeln("Usage:");
        grunt.log.writeln(tab() + "1. Rename settings.json.example in current folder to settings.json.");
        grunt.log.writeln(tab() + "2. Update settings.json with your requirements.");
        grunt.log.writeln(tab() + "3. run task \"faf-tool <task>\"");
        grunt.log.writeln(tab(2) + "\"create-feature\" - do new feature routine work:");
        grunt.log.writeln(tab(3) + "creates faf branches");
        grunt.log.writeln(tab(3) + "resolve bower dependencies and commit it");
        grunt.log.writeln(tab(3) + "update overlay versions in JRS");
        grunt.log.writeln(tab(2) + "\"setup\":");
        grunt.log.writeln(tab(3) + "checkout FAF modules and JRS");
        grunt.log.writeln(tab(3) + "install node modules, initialize node modules and grunt for each module, specified in settings.json");
        grunt.log.writeln(tab(2) + "\"init\":");
        grunt.log.writeln(tab(3) + "install node modules, initialize node modules and grunt for each module, specified in settings.json");
        grunt.log.writeln(tab(2) + "\"checkout-full\":");
        grunt.log.writeln(tab(3) + "checkout FAF modules and JRS");
        grunt.log.writeln(tab(2) + "\"downmerge\":");
        grunt.log.writeln(tab(3) + "runs svn merge from trunk command for each FAF module, specified in settings.json and JRS if \"jasperserver-branch\" option specified");
        grunt.log.writeln(tab(3) + "accepts one argument \"--accept=postpone\". Default \"postpone\".");
        grunt.log.writeln();
    }
};
