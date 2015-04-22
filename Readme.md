# FAF setup tool

- Create feature branches and do preparation routine work.
    - creates feature branches
    - checkouts bower.json, package.json
    - updates bower dependencies and overlay versions
    - commits changes (faf modules only)
- Checkout and setup all FAF and JRS feature repositories by one command
    - checkouts full repositories for selected modules
    - runs commands:
        - npm install
        - npm prune
        - grunt init
- Initialize FAF modules
    - runs commands:
        - npm install
        - npm prune
        - grunt init
- Downmerge project
    - updates modules from repos
    - runs merge from trunk command for FAF modules and JRS
    - argument "--accept=<value>" accepts. Default "postpone".
    - argment "--parallel=<true|false>" used for parallel/serial downmerge. Default "true"
    - argument "--separate-changelist=<true|false>" used to add module to it's own svn changelist. Default "true"


- Options
    - `--dry-run=true`
    - `--verbose`
    - `--no-time` - hide time report
    - `--username=<username>` - svn username
    - `--password=<password>` - svn password
    - `--accept=<value>` - argument for svn merge command, works for "downmerge" task. Default "postpone".
    - `--parallel=<true|false>` - argument for parallel command execution, works for "downmerge" task. Default "true".
    - `--separate-changelist=<true|false>` - argument for adding module changes to a separate svn changelist, works for "downmerge" task. Default "true"

## How to use

```
npm install -g faf-tool

// go to folder where you want to setup FAF branches

// create settings.json here or
// run 'faf-tool' without arguments. It will create settings.json.example here. Rename it to settings.json

// update settings.json

// At first try to --dry-run !!!

// create new feature branches and setup it
faf-tool create-feature

// or just checkout necessary branches and init it
faf-tool setup
```

## Commands

command options can be used in these ways:
```
faf-tool create-feature --dry-run
faf-tool create-feature --dry-run=true --no-time
faf-tool create-feature --verbose=true --dry-run=true
```

#### create-feature

```
"create-branches", // create new branches from trunk for all faf modules specified in settings.json
"checkout-settings-files", // checkout branches
"resolve-deps", // resolve bower dependencies in bower.json
"update-overlay-versions", // update overlay versions in jrs-ui, jrs-ui-pro and JRS poms
"checkin-settings", // commit resolved dependencies
```

#### setup
Checkout selected modules and init it

#### init
Initialize selected modules: npm install && npm prune && grunt init

#### checkout-full
Checking out faf modules and jrs if specified

#### downmerge
Runs svn up and svn merge from trunk command for FAF modules and JRS
Accepts "--accept=<value>" svn argument. Default "postpone".
Accepts "--parallel=<true|false>" svn argument. Default "true".
Accepts "--separate-changelist=<true|false>" svn argument. Default "true".

## settings.json
Remove unnecessary modules, set branch names for faf, ce and pro
```
{
    // by default it uses "https://" protocol but you can specify protocol in this property like "svn+ssh://falcon.jaspersoft.com"
  "svn-server": "svnserver.jaspersoft.com",

    // branch name parts
  "release-cycle": "<release name>", // optional parameter for features without release cycle like bugfix
  "feature-name": "<feature name>",

    // optional JRS branches names used for checkout JRS
  "jasperserver-branch": "<existing jrs ce branch name>",
  "jasperserver-pro-branch": "<existing jrs pro branch name>",

    // optional JRS location (if already checked out) - used to update faf overlays version in jasperserver-war/pom.xml (requires manual commit)
  "jasperserver-ci-path": "<path to ci jrs>",
  "jasperserver-pro-ci-path": "<path to ci jrs-pro>",

  // optional svn credentials
  "username": "username",
  "password":"password",

  "modules": [
    "bi-charts",
    "bi-dashboard",
    "bi-report",
    "bi-repository",
    "js-sdk",
    "visualize-js",
    "jrs-ui",
    "jrs-ui-pro"
  ]

}
```

## sample output

```
λ faf-tool create-feature
Running "create-branches" task

...
Done, without errors.


Execution Time (2015-01-19 14:13:05 UTC)
create-branches           9.8s  ■■■■■■■■■■■■ 18%
checkout-settings-files  39.8s  ■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■ 72%
checkin-settings            6s  ■■■■■■■■ 11%
Total 55.7s
```

#### `--dry-run` option:

```
λ faf-tool create-feature --dry-run
Running "create-branches" task
Create svn branch for bi-control
Create svn branch for bi-dashboard
Create svn branch for bi-report
Create svn branch for bi-repository
Create svn branch for js-sdk
Create svn branch for visualize-js
Create svn branch for jrs-ui
Create svn branch for jrs-ui-pro

Running "checkout-settings-files" task
Checkout required files for bi-control
Checkout required files for bi-dashboard
Checkout required files for bi-report
Checkout required files for bi-repository
Checkout required files for js-sdk
Checkout required files for visualize-js
Checkout required files for jrs-ui
Checkout required files for jrs-ui-pro
Checkout required files for jasperserver
Checkout required files for jasperserver-pro

Running "resolve-deps" task

Running "update-overlay-versions" task

Running "checkin-settings" task
Checking in updated settings files for bi-control
Checking in updated settings files for bi-dashboard
Checking in updated settings files for bi-report
Checking in updated settings files for bi-repository
Checking in updated settings files for js-sdk
Checking in updated settings files for visualize-js
Checking in updated settings files for jrs-ui
Checking in updated settings files for jrs-ui-pro


Done, without errors.


Execution Time (2015-01-26 08:08:49 UTC)
loading tasks             3ms  ■■■■■■ 4%
create-branches          13ms  ■■■■■■■■■■■■■■■■■■■■■■■■■■ 17%
checkout-settings-files  15ms  ■■■■■■■■■■■■■■■■■■■■■■■■■■■■■ 20%
resolve-deps              5ms  ■■■■■■■■■■ 7%
update-overlay-versions   1ms  ■■ 1%
checkin-settings         11ms  ■■■■■■■■■■■■■■■■■■■■■■ 15%

Total 75ms

```
