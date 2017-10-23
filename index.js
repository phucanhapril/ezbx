#!/usr/bin/env node
'use strict';

const Inquirer = require('inquirer');
const { spawn } = require('child_process');
const { name, version } = require('../package.json');

const shell = (file, env) => {
  return new Promise((resolve, reject) => {
    // Execute 'sh' OS command and pass environment variables & stdio stream
    const child = spawn('sh', [file], {
      env: Object.assign({}, process.env, env),
      stdio: 'inherit'
    });
    child.on('error', reject);
    child.on('exit', (code, signal) => {
      return (code !== 0)
        ? reject(`ShellError: code ${code} from signal ${signal}`)
        : resolve(code);
    });
  });
};

(async() => {
  try {
    // TODO change arg length & dir root for use as npm package
    if (process.argv.length < 3)
      throw 'ArgumentError: You must provide the path to your bluemix config file, for example \'ezbx bx-config.json\''
    const configFile = require(`../${process.argv[2]}`);

    // Prompt for action, i.e. deploy or route
    const { action } = await Inquirer.prompt([{
      'message': 'Action >',
      'name': 'action',
      'type': 'rawlist',
      'choices': [
        'deploy',
        'route'
      ]
    }]);
    const { unmap } = await Inquirer.prompt([{
      'message': 'Unmap >',
      'name': 'unmap',
      'type': 'rawlist',
      'choices': [
        { name: 'map & unmap', value: true },
        { name: 'map only', value: false }
      ],
      'when': action === 'route'
    }]);

    // Prompt for the config key, then get config from the user-provided file
    const configChoices = Object.entries(configFile).map(([config, value]) => {
      return {
        name: `${config} ${value.description ? `- ${value.description}` : ''}`,
        value: config
      };
    });
    const { configKey } = await Inquirer.prompt([{
      'message': 'Config >',
      'name': 'configKey',
      'type': 'rawlist',
      'choices': configChoices
    }]);
    const config = configFile[configKey];

    // Prompt for app name. If routing, also prompt for old app name to unmap
    const defaultName = config.appName || name;
    const { appName } = await Inquirer.prompt([{
      'message': action === 'route' ? 'New App Name >' : 'App Name >',
      'name': 'appName',
      'default': defaultName && version && `${defaultName}-${version}`
    }]);
    const { oldAppName } = await Inquirer.prompt([{
      'message': 'Old App Name >',
      'name': 'oldAppName',
      'when': action === 'route' && unmap === true
    }]);

    // Prompt for build directory/command if deploying & not defined in config
    const { buildDirectory } = await Inquirer.prompt([{
      'message': 'Build Directory >',
      'name': 'buildDirectory',
      'when': action === 'deploy' && !config.buildDirectory
    }]);
    const { buildCommand } = await Inquirer.prompt([{
      'message': 'Build Command >',
      'name': 'buildCommand',
      'when': action === 'deploy' && !config.buildCommand
    }]);

    // Confirm before taking action
    if (action === 'deploy') {
      console.log('\x1b[33m', `
        ACTION        ${action}
        APP_NAME      ${appName}
        API           ${config.apiEndpoint}
        ORG           ${config.orgName}
        SPACE         ${config.spaceName}
        NODE_ENV      ${config.environment}
        MANIFEST      ${config.manifestPath}
        USE_SSO       ${config.sso}
        BUILD_DIR     ${config.buildDirectory || buildDirectory}
        BUILD_CMD     ${config.buildCommand || buildCommand}
      `);
    }
    else if (action === 'route') {
      const routes = config.route.map(r => {
        return r.hostName ? `${r.hostName}.${r.domain}` : r.domain;
      });
      console.log('\x1b[33m', `
        ACTION        ${action}
        MAP           ${appName}
        UNMAP         ${oldAppName || '-'}
        API           ${config.apiEndpoint}
        ORG           ${config.orgName}
        SPACE         ${config.spaceName}
        NODE_ENV      ${config.environment}
        ROUTES        ${routes}
        USE_SSO       ${config.sso}
      `);
    }
    const { confirm } = await Inquirer.prompt([{
      'message': 'Confirm (y/n) >',
      'name': 'confirm'
    }]);
    if (confirm.toLowerCase() !== 'y' && confirm.toLowerCase() !== 'yes')
      throw 'Bailing out...';

    // Login then run action, i.e. deploy or route the app
    let exitCode;
    const start = Date.now();
    // TODO find route from node_modules
    await shell('./ezbx/login.sh', {
      'API': config.apiEndpoint,
      'ORGANIZATION': config.orgName,
      'SPACE': config.spaceName,
      'USE_SSO': config.sso
    });
    if (action === 'deploy') {
      exitCode = await shell('./ezbx/deploy.sh', {
        'APP_NAME': appName,
        'BUILD_CMD': config.buildCommand || buildCommand,
        'BUILD_DIR': config.buildDirectory || buildDirectory,
        'ENV': config.environment,
        'MANIFEST': config.manifestPath
      });
    }
    else if (action === 'route') {
      for (const route of config.route) {
        exitCode = await shell('./ezbx/route.sh', {
          'APP_NAME': appName,
          'OLD_APP_NAME': oldAppName || null,
          'DOMAIN': route.domain,
          'HOSTNAME': route.hostName || "''"
        });
      }
    }
    const time = Math.floor((Date.now() - start) / 1000);
    console.log('\x1b[32m',
      `${appName} ${action} completed with code ${exitCode} in ${time} seconds`
    );
  } catch (err) {
    console.error('\x1b[35m', err);
  }
})();
