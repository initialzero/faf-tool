var spawnFn = require('child_process').spawn,
    fs = require('fs'),
    async = require("async"),
    colors = require('colors'),
    inquirer = require("inquirer");

var cwd, ftwd, params = {
    verbose: false
};

exports.init = function(options) {
    cwd = options.cwd;
    ftwd = options.ftwd;
};

exports.set = function(param, value) {
    params[param] = value;
};

function readJSON(file, encoding, wd) {
    encoding = encoding || "utf8";
    if (wd === "ft") {
        file = ftwd + "/" + file;
    }

    if (fs.existsSync(file)) {
        return JSON.parse(fs.readFileSync(file, encoding));
    } else {
        return null;
    }
}

exports.ask = function(options, callback) {
    console.log("------------------------------".green);
    inquirer.prompt(options, callback);
};
exports.answer = {
    confirm: function(name, yesFn, noFn) {
        return function(answer) {
            if (answer[name]) {
                yesFn();
            } else {
                noFn();
            }
        }
    }
};

exports.separator = function() {
    return new inquirer.Separator();
};

exports.createSettingsFile = function(callback) {
    copyFile(ftwd + "/settings.json.example", cwd + "/settings.json", callback);
};
function copyFile(source, target, cb) {
    var cbCalled = false;

    var rd = fs.createReadStream(source);
    rd.on("error", done);

    var wr = fs.createWriteStream(target);
    wr.on("error", done);
    wr.on("close", function(ex) {
        done();
    });
    rd.pipe(wr);

    function done(err) {
        if (!cbCalled) {
            cb(err);
            cbCalled = true;
        }
    }
}

exports.readJSON = readJSON;
exports.copyFile = copyFile;


// process spawning

function spawn(command, params, callback) {
    var process = spawnFn(command, params),
        output = "",
        error;

    process.on("close", function(code, signal) {
        //console.log("spawn close: ", code, signal);
        callback(error, output);
    });

    process.stdout.on("data", function(data) {
        output += data;
    });

    process.stderr.on("data", function(err) {
        error = err;
        console.log("spawn error: " + err);
        //callback(err);
    });

}

exports.spawn = spawn;


exports.runParallel = function(fn, modules, callback) {
    var tasks = [];
    modules.forEach(function(module) {
        tasks.push(async.apply(fn, module));
    });
    async.parallel(tasks, function(err, res) {
        callback(err, res)
    });
};

