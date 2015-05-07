# FAF Tool

Command line utility which helps in setting up faf project

## Table of Contents

  1. [Install](#install)
  1. [Usage](#usage)
  1. [Settings File](#settings-file.json)

## Install

```
npm install -g faf-tool
```

## Usage

### Setup Project Localy

#### Get settings.json from some location

```
mkdir diamond-feature
wget http://someplace/blabla/settings.json
```

Settings file would be like 

```
cat settings.json
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

#### Prepare local project to work

```
faf-tool setup
```

**[⬆ back to top](#table-of-contents)**

### Create Project's Environemnt

#### Create settings.json file

```
faf-tool
mv settings.json.example settings.json
```

#### Create and prepare modules for commit

> At first try to --dry-run !!!
```
faf-tool create-feature --dry-run
```
If everithing is fine then run

```
faf-tool create-feature
```
**[⬆ back to top](#table-of-contents)**


## Settings File

```
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

## CLI Options

 - `--dry-run=true`
    - `--verbose`
    - `--no-time` - hide time report
    - `--username=<username>` - svn username
    - `--password=<password>` - svn password
    - `--accept=<value>` - argument for svn merge command, works for "downmerge" task. Default "postpone".
    - `--parallel=<true|false>` - argument for parallel command execution, works for most tasks which use svn. Default "true".
    - `--separate-changelist=<true|false>` - argument for adding module changes to a separate svn changelist, works for "downmerge" task. Default "true"

**[⬆ back to top](#table-of-contents)**


## Examples

Control verbosity level

```
faf-tool create-feature --dry-run
faf-tool create-feature --dry-run=true --no-time
faf-tool create-feature --verbose=true --dry-run=true
```

**[⬆ back to top](#table-of-contents)**
