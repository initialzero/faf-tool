# FAF Tool

Command line utility which helps in setting up faf project

## Table of Contents

  1. [Install](#install)
  1. [Basic Usage](#basic-usage)
  1. [Commands](#commands)
  1. [CLI Options](#cli-options)
  1. [Settings File](#settings-file)

## Install

```bash
npm install -g faf-tool

```

##Basic Usage


```bash

mkdir diamond-feature
cd diamond-feature
wget http://someplace/blabla/settings.json

```

Edit settings file, for example

```javascript
{
  "svn-server": "svnserver.jaspersoft.com",
  "feature-name": "diamond-feature",
  "jasperserver-branch": "diamond-ce-feature",
  "jasperserver-pro-branch": "diamond-pro-feature",
  "jasperserver-ci-path": "/path/to/my/jrs/ce/sources",
  "jasperserver-pro-ci-path": "/path/to/my/jrs/pro/sources",
  "modules": [
    "bi-charts",
    "bi-dashboard",
    "bi-report",
    "bi-repository",
    "js-sdk",
    "jrs-ui",
    "jrs-ui-pro"
  ]
}
```

Prepare local project to work

```bash
faf-tool setup

```

**[⬆ back to top](#table-of-contents)**

##Commands

#### setup

Checkout selected modules and run *npm* init

```bash

faf-tool setup

```

#### init

Initialize for each module: npm install && npm prune && grunt init

```bash

faf-tool init

```

#### watch

Start watchers assets like js,hml,css etc in all faf packages

```bash

faf-tool watch

```
> To find out local deployment you have to prepare .workspace file

#### update-init

Update and initialize for each module: svn up && npm install && npm prune && grunt init

```bash

faf-tool update-init


```

#### checkout-full

Checking out faf modules and jrs if specified

```bash

faf-tool create-feature

```


#### downmerge
Runs svn up and svn merge from trunk command for FAF modules and JRS
Accepts "--accept=<value>" svn argument. Default "postpone".
Accepts "--separate-changelist=<true|false>" svn argument. Default "true".

```bash

faf-tool downmerge

```


#### removecl
removes all changelists which was created during downmerge task
executed with --separate-changelist=true wich is set by default

```bash

faf-tool removecl


```

**[⬆ back to top](#table-of-contents)**

## CLI options

 - `--dry-run=true`
    - `--verbose`
    - `--no-time` - hide time report
    - `--username=<username>` - svn username
    - `--password=<password>` - svn password
    - `--accept=<value>` - argument for svn merge command, works for "downmerge" task. Default "postpone".
    - `--parallel=<true|false>` - argument for parallel command execution, works for most tasks which use svn. Default "true".
    - `--separate-changelist=<true|false>` - argument for adding module changes to a separate svn changelist, works for "downmerge" task. Default "true"

##Dry run example

```bash
faf-tool create-feature --dry-run

```

**[⬆ back to top](#table-of-contents)**

##Settings File

```javascript
{
  // by default it uses "https://" protocol
  "svn-server": "svnserver.jaspersoft.com",
  
  // branch name parts
  //name of the feature branch or "trunk"
  "feature-name": "<feature name>", 
  
  // optional parameter for features without release cycle like bugfix
  "release-cycle": "<release name>", 
  

  // optional JRS branches names used for checkout JRS
  "jasperserver-branch": "<existing jrs ce branch name>",
  "jasperserver-pro-branch": "<existing jrs pro branch name>",

  // optional JRS location 
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
    "jrs-ui",
    "jrs-ui-pro"
  ]
}
```

**[⬆ back to top](#table-of-contents)**
