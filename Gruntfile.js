var path = require('path'),
    fs = require('fs');

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

    var Modules = function(settings) {
        this.modules = settings.modules;
    };
    Modules.prototype.getList = function() {
        return Object.keys(this.modules);
    };
    Modules.prototype.forEach = function(fn) {
        this.getList().forEach(fn);
    };
    Modules.prototype.contain = function(module) {
        return this.getList().hasOwnProperty(module);
    };

    Modules.prototype.getCeOverlayVersion = function() {
        if (this.modules["jrs-ui"]["feature-name"]) {
            return this.modules["jrs-ui"]["feature-name"] + "-SNAPSHOT";
        }
        if (settings["feature-name"]) {
            return settings["feature-name"] + "-SNAPSHOT";
        }
    };
    Modules.prototype.getProOverlayVersion = function() {
        if (this.modules["jrs-ui-pro"]["feature-name"]) {
            return this.modules["jrs-ui-pro"]["feature-name"] + "-SNAPSHOT";
        }
        if (settings["feature-name"]) {
            return settings["feature-name"] + "-SNAPSHOT";
        }
    };
    Modules.prototype.getSourcePath = function(module) {
        return this.modules[module]["source-repo-path"] || settings["faf-source-repo-path"] || "trunk";
    };

    var modules = new Modules(settings);

    function findLocalDeploymentPath(modules){


        var deployment = modules.slice(),
            jrsUiPro = deployment.indexOf('jrs-ui-pro');

        if (jrsUiPro !== -1){
            //push 'jrs-ui-pro' on top, it's next after faf-tool root folder to
            //search for '.workspaces' 
            jrsUiPro = deployment.splice(jrsUiPro, 1);
            deployment = jrsUiPro.concat(deployment);
        }

        deployment = [''].concat(deployment)
                        .map(function(module){
                            return path.join(cwd, module, '.workspace')
                        })
                        .filter(function (module){
                            return fs.existsSync(module);
                        }, '')
                        .map(function(file){
                            return grunt.file.readJSON(file).server
                        })
                        .filter(function(server){
                            return server;
                        });

        //use first settings from the stack, 
        //by default it's root of your project
        deployment = deployment.length > 0 ? deployment[0] : '';

        if (!fs.existsSync(deployment)){
            grunt.log.write('Deployment target doesn\'t exist: '+ deployment);
        }

        return deployment;
    }

    function srcPathes(modules){
        return modules.map(function(module){
                        return [
                            path.join(module, '/src/**'), 
                            "!" + path.join(module, 'src/bower_components/**')
                        ]
                    }).reduce(function(memo,pair){
                        return memo.concat(pair);
                    });
    }

    function themesPathes(modules){

        return modules.map(function(module){
                        return [
                            path.join(module, '/themes/**')
                        ]
                    }).reduce(function(memo,pair){
                        return memo.concat(pair);
                    });
    }


    grunt.initConfig({

        deployment: findLocalDeploymentPath(modules.getList()),

        clean: modules.getList().concat(["jasperserver", "jasperserver-pro"]),
        run: {
            mock: {
                cmd: ""
            }
        },
        watch: {
            scripts: {
                files: srcPathes(modules.getList()),
                tasks: ['copy'],
                options: {
                    nospawn: true
                }
            },
            themes: {
                files: themesPathes(modules.getList().concat([
                    "jasperserver/jasperserver-war/src/main/webapp", 
                    "jasperserver-pro/jasperserver-war/src/main/webapp"
                ])),
                tasks: ['ftp_push'],
                options: {
                    nospawn: true
                }
            }
        },
        ftp_push: {
            themes: {
                options: {
                    username: 'designer',
                    password: 'designer',
                    host: 'localhost',
                    dest: '/themes',
                    port: 2121
                },
                files: [{
                    expand: true,
                    cwd: 'themes',
                    src: [
                        'default/samples.css'
                    ]
                }]
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

    grunt.event.on('watch', function(action, filepath) {

        var log = grunt.log.writeln,
            contains = function (container, chunk) {
                return container.indexOf(path.sep + chunk + path.sep) !== -1;
            };

        if (contains(filepath, 'src') && !contains(filepath, 'webapp')) {

            //js and html templates assets here 
            var deploy = grunt.config.get(['deployment']),
                copyConfig = {
                    copy: {
                        main: {
                            expand: false,
                            cwd: ''
                        }
                    }
                };

            if (!deploy) {
                grunt.log.error('Can\'t find deployment path. Did you create .workspace ?');
            } else {
                dest = path.join(deploy, "scripts/");
            }

            if (!contains(filepath, 'jrs-ui-pro')) {
                dest = path.join(dest, 'bower_components/');
            } else {
                var cwdSrc = 'jrs-ui-pro/src';

                copyConfig.copy.main.cwd = path.join(cwd, cwdSrc);
                copyConfig.copy.main.expand = true;

                filepath = path.relative(cwdSrc, filepath);
            }

            copyConfig.copy.main.src = [filepath];
            copyConfig.copy.main.dest = dest;

            grunt.config.merge(copyConfig);

            log('Coping file to : ', path.join(dest, filepath));

        } else if (contains(filepath, 'themes')) {
            //themes assets here

            var cwdThemes = path.join(cwd, filepath.split('themes')[0], 'themes');
            filepath = path.relative(cwdThemes, filepath);

            var ftpConfig = [{
                expand: true,
                cwd: cwdThemes,
                src: [
                    filepath
                ]
            }];

            grunt.config(['ftp_push', 'themes', 'files'], ftpConfig);

        } else if(contains(filepath,'i18n')) {
            //TODO: i18n bundles here
        }

    });

    // Private tasks

    grunt.registerTask('create-branches', 'Creates svn branches for modules.', function() {
        executeAsyncTaskForAllModules.call(this, createBranch, "Create svn branch for: ", true, modules.getList());
    });

    grunt.registerTask('checkout-settings-files', 'Checkout bower.json and package.json for modules for updating it.', function() {
        executeAsyncTaskForAllModules.call(this, checkoutSettingsFiles, "Checkout required files for: ", true);
    });

    grunt.registerTask('resolve-deps', 'Resolve bower dependencies.', function() {
        modules.forEach(function(module) {
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
                if (modules.contain(depName)) {
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

        if (modules.contain("jrs-ui")) {
            grunt.verbose.writeln("Update jrs-ui overlay version");
            fileContent = grunt.file.readJSON("jrs-ui/package.json");
            //ceOverlayVersion = settings["feature-name"] + "-SNAPSHOT";
            fileContent.overlayVersion = ceOverlayVersion = modules.getCeOverlayVersion();
            grunt.file.write("jrs-ui/package.json", JSON.stringify(fileContent, null, "  "));

            if (settings["jasperserver-branch"] || settings["jasperserver-ci-path"]) {
                grunt.verbose.writeln("Update jrs-ui overlay version in jasperserver");
                filePath = (settings["jasperserver-ci-path"] || "jasperserver") + "/jasperserver-war/pom.xml";
                fileContent = grunt.file.read(filePath); // this is jasperserver/jasperserver-war/pom.xml file!
                fileContent = fileContent.replace(/(jrs-ui<\/artifactId>\s+<version>)[^<]+(<\/version>)/, "$1" + ceOverlayVersion + "$2");
                grunt.file.write(filePath, fileContent);
            }
        }

        if (modules.contain("jrs-ui-pro")) {
            grunt.verbose.writeln("Update jrs-ui-pro overlay version");
            fileContent = grunt.file.readJSON("jrs-ui-pro/package.json");
            fileContent.overlayVersion = proOverlayVersion = modules.getProOverlayVersion();
            grunt.file.write("jrs-ui-pro/package.json", JSON.stringify(fileContent, null, "  "));

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
        executeAsyncTaskForAllModules.call(this, checkinSettings, "Checking in updated settings files for: ", true, modules.getList());
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
        modules.forEach(function(task) {
            grunt.task.run("run:" + task);
        });

        if (grunt.option("parallel") !== false) {
            //only wait for tasks to complete in parallel build
            modules.forEach(function(task) {
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

        modules.forEach(function(module) {
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


    function executeAsyncTaskForAllModules(taskFunc, logMessagePrefix, allowParallel, currentModules) {
        var tasks = [],
            done = this.async();

        if (currentModules) {
            //Execute only for specified modules
            currentModules.forEach(function(module) {
                grunt.log.writeln(logMessagePrefix + module);
                tasks.push(async.apply(taskFunc, module));
            });
        } else {
            //Execute for all modules
            modules.forEach(function(module) {
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

    function getTargetUrl(module) {
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
    function getSourceUrl(module) {
        return getRepoPath(module, modules.getSourcePath(module));
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
            getSourceUrl(module),
            getTargetUrl(module),
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
            getTargetUrl(module),
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
            getTargetUrl(module),
            module,
            "--depth",
            "files"
        ], callback);
    }

    function checkoutSettingsFilesJrs(module, callback) {
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

    function checkoutSettingsFilesJrsPro(module, callback) {
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

    function checkinSettings(module, callback) {
        var args = [
            "commit",
            module,
            "-m",
            ["jasperserver", "jasperserver-pro"].indexOf(module) !== -1 ? "Resolved bower dependencies and updated overlay version" : "Updated overlay version"
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
