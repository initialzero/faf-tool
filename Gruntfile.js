module.exports = function(grunt) {
    var settings,
        async = require("async"),
        cwd = grunt.option("cwd") || ".",
        ftwd = grunt.option("ftwd");

    require('load-grunt-tasks')(grunt);
    !grunt.option("no-time") && require('time-grunt')(grunt);

    grunt.file.setBase(cwd);

    try {
        settings = grunt.file.readJSON('settings.json');
    } catch (e) {
        writeHelp();
        grunt.file.copy(ftwd + "/settings.json.example", cwd + "/settings.json.example");
        grunt.fatal(e.message + "\r\nUse settings.json.example to create settings.json");
    }

    var username = grunt.option("username") || settings["username"];
    var password = grunt.option("password") || settings["password"];

    grunt.initConfig({
        clean: settings.modules.concat(["jasperserver", "jasperserver-pro"]),
        run: {
            mock: {
                cmd: ""
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

    grunt.registerTask('update-init', 'Update all feature branches and setup FAF.', [
        "update-all",
        "init"
    ]);

    grunt.registerTask('downmerge', 'Downmerge project from trunk', function() {
        executeAsyncTaskForAllModules.call(this, svnUpModuleAndDownmerge, "Downmerge module: ", true);
    });

    grunt.registerTask('removecl', 'Remove all modules from downmerge changelists', function() {
        executeAsyncTaskForAllModules.call(this, svnRemoveFromChangelist, "Remove all svn changelists from: ", true);
    });

    grunt.registerTask('default', 'Default task.', function() {
        writeHelp();
    });


    // Private tasks

    grunt.registerTask('create-branches', 'Creates svn branches for modules.', function() {
        executeAsyncTaskForAllModules.call(this, createBranch, "Create svn branch for: ", true, settings["modules"]);
    });

    grunt.registerTask('checkout-settings-files', 'Checkout bower.json and package.json for modules for updating it.', function() {
        executeAsyncTaskForAllModules.call(this, checkoutSettingsFiles, "Checkout required files for: ", true);
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
        executeAsyncTaskForAllModules.call(this, checkinSettings, "Checking in updated settings files for: ", true, settings["modules"]);
    });

    grunt.registerTask('init', 'Setup FAF. Install npm modules, init grunt.', [
        "load-init-settings",
        "run-wait"
    ]);

    grunt.registerTask('checkout-full', 'Checkout full selected repos', function() {
        executeAsyncTaskForAllModules.call(this, checkoutFull, "Checkout module: ", true);
    });

    grunt.registerTask('update-all', 'Update all selected repos', function() {
        executeAsyncTaskForAllModules.call(this, svnUpModule, "Update module: ", true);
    });

    grunt.registerTask('run-wait', 'run-wait', function() {
        settings["modules"].forEach(function(task) {
            grunt.task.run("run:" + task);
        });

        if (grunt.option("parallel") !== false) {
            //only wait for tasks to complete in parallel build
            settings["modules"].forEach(function(task) {
                grunt.task.run("wait:" + task);
            });
        }
    });


    grunt.registerTask('load-init-settings', 'Load settings and create config for initialization commands.', function(){

        grunt.log.writeln("Load settings and create config for initialization commands.");

        var run_config = {
            options: {
                wait: grunt.option("parallel") === false,
                quiet: false,
                failOnError: false
            }
        };

        settings["modules"].forEach(function(module) {
            run_config[module] = {
                exec: "npm install && npm prune && grunt init --config.storage.packages=./.cache/bower/packages",
                options: {
                    cwd: "./" + module
                }
            };
        });

        grunt.log.ok("Settings loaded");

        if (grunt.option("dry-run")) {
            grunt.log.writeln(JSON.stringify(run_config, null, 2));
        } else {
            grunt.config.set("run", run_config);
        }
    });


    function executeAsyncTaskForAllModules(taskFunc, logMessagePrefix, allowParallel, modules) {
        var tasks = [],
            done = this.async();

        if (modules) {
            //Execute only for specified modules
            modules.forEach(function(module) {
                grunt.log.writeln(logMessagePrefix + module);
                tasks.push(async.apply(taskFunc, module));
            });
        } else {
            //Execute for all modules
            settings["modules"].forEach(function(module) {
                grunt.log.writeln(logMessagePrefix + module);
                tasks.push(async.apply(taskFunc, module));
            });

            if (settings["jasperserver-branch"]) {
                grunt.log.writeln(logMessagePrefix + "jasperserver");
                tasks.push(async.apply(taskFunc, "jasperserver"));
            }
            if (settings["jasperserver-pro-branch"]) {
                grunt.log.writeln(logMessagePrefix + "jasperserver-pro");
                tasks.push(async.apply(taskFunc, "jasperserver-pro"));
            }
        }

        if (grunt.option("dry-run")) {
            done();
        } else if (grunt.option("parallel") === false || !allowParallel) {
            async.series(tasks, done);
        } else {
            async.parallel(tasks, done);
        }
    }

    function getSettingsBranchPath(module) {
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

        var defaultSchema = "https:/",
            domain = settings["svn-server"],
            repoPath = [domain, module, path];

          if(domain.indexOf(':/') == -1){
            repoPath = [defaultSchema].concat(repoPath);
          }

        return repoPath.join("/");
    }

    function getBranchName() {
        if (settings["feature-name"] === "trunk") {
            return "trunk";
        } else {
            return (settings["release-cycle"] ? settings["release-cycle"] + "-" : "") + settings["feature-name"];
        }
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

    function svnRemoveFromChangelist(module, callback) {
        execSvn([
            "changelist",
            "--remove",
            "--changelist",
            module, //name of changelist == name of the module
            "--depth",
            "infinity",
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
        if (module === "jasperserver-pro") {
            checkoutSettingsFilesJrsPro(module, callback);
        } else if (module === "jasperserver") {
            checkoutSettingsFilesJrs(module, callback);
        } else {
            checkoutSettingsFilesFAF(module, callback);
        }
    }

    function checkoutSettingsFilesFAF(module, callback) {
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
        grunt.log.writeln(tab(2) + "\"update-init\":");
        grunt.log.writeln(tab(3) + "update all modules from svn, install node modules,");
        grunt.log.writeln(tab(3) + "initialize node modules and grunt for each module, specified in settings.json");
        grunt.log.writeln(tab(2) + "\"checkout-full\":");
        grunt.log.writeln(tab(3) + "checkout FAF modules and JRS");
        grunt.log.writeln(tab(2) + "\"downmerge\":");
        grunt.log.writeln(tab(3) + "runs svn merge from trunk command for each FAF module,");
        grunt.log.writeln(tab(3) + "specified in settings.json and JRS if \"jasperserver-branch\" option specified");
        grunt.log.writeln(tab(3) + "accepts one argument \"--accept=postpone\". Default \"postpone\".");
        grunt.log.writeln(tab(2) + "\"removecl\":");
        grunt.log.writeln(tab(3) + "removes all changelists which was created during downmerge task");
        grunt.log.writeln();
    }
};
