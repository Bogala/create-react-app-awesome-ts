// @remove-file-on-eject
/**
 * Copyright (c) 2015-present, Facebook, Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
'use strict';

// Makes the script crash on unhandled rejections instead of silently
// ignoring them. In the future, promise rejections that are not handled will
// terminate the Node.js process with a non-zero exit code.
process.on('unhandledRejection', err => {
  throw err;
});

const fs = require('fs-extra');
const path = require('path');
const chalk = require('chalk');
const spawn = require('react-dev-utils/crossSpawn');

module.exports = function(
  appPath,
  appName,
  verbose,
  originalDirectory,
  template
) {
  const ownPackageName = require(path.join(__dirname, '..', 'package.json'))
    .name;
  const ownPath = path.join(appPath, 'node_modules', ownPackageName);
  const appPackage = require(path.join(appPath, 'package.json'));
  const useYarn = fs.existsSync(path.join(appPath, 'yarn.lock'));

  // Copy over some of the devDependencies
  appPackage.dependencies = appPackage.dependencies || {};

  // Setup the script rules
  appPackage.scripts = {
    start: 'react-ats-scripts start',
    build: 'react-ats-scripts build',
    test: 'react-ats-scripts test --env=jsdom',
    eject: 'react-ats-scripts eject',
    storybook: 'start-storybook -p 6006',
    'build-storybook': 'build-storybook'
  };

  appPackage.jest = {
    "collectCoverageFrom": [
      "src/**/*.ts?(x)",
      "!src/**/*.d.ts",
      "!src/**/*.stories.tsx",
      "!src/**/*.feature.impl.ts",
      "!src/**/*.feature.tools.tsx",
      "!src/store/**/index.ts",
      "!src/store/epic.ts",
      "!src/store/reducer.ts",
      "!src/index.tsx",
      "!src/registerServiceWorker.ts"
    ]
  }

  fs.writeFileSync(
    path.join(appPath, 'package.json'),
    JSON.stringify(appPackage, null, 2)
  );

  const readmeExists = fs.existsSync(path.join(appPath, 'README.md'));
  if (readmeExists) {
    fs.renameSync(
      path.join(appPath, 'README.md'),
      path.join(appPath, 'README.old.md')
    );
  }

  // Copy the files for the user
  const templatePath = template
    ? path.resolve(originalDirectory, template)
    : path.join(ownPath, 'template');
  if (fs.existsSync(templatePath)) {
    fs.copySync(templatePath, appPath);
  } else {
    console.error(
      `Could not locate supplied template: ${chalk.green(templatePath)}`
    );
    return;
  }

  // Rename gitignore after the fact to prevent npm from renaming it to .npmignore
  // See: https://github.com/npm/npm/issues/1862
  fs.move(
    path.join(appPath, 'gitignore'),
    path.join(appPath, '.gitignore'),
    [],
    err => {
      if (err) {
        // Append if there's already a `.gitignore` file there
        if (err.code === 'EEXIST') {
          const data = fs.readFileSync(path.join(appPath, 'gitignore'));
          fs.appendFileSync(path.join(appPath, '.gitignore'), data);
          fs.unlinkSync(path.join(appPath, 'gitignore'));
        } else {
          throw err;
        }
      }
    }
  );

  let command;
  let args;
  let argsDev;
  let argsPlus;

  if (useYarn) {
    command = 'yarn';
    args = ['add'];
    argsDev = ['add', '-D'];
    argsPlus = ['add'];
  } else {
    command = 'npm';
    args = ['install', '--save', verbose && '--verbose'].filter(e => e);
    argsDev = ['install', '--save', verbose && '--verbose'].filter(e => e);
    argsPlus = ['install', '--save', verbose && '--verbose'].filter(e => e);
  }
  args.push('react', 'react-dom');
  //argsPlus.push('recompose@0.26.0', 'redux@3.7.2', 'react-redux@5.0.7', 'rxjs@5.5.9', 'redux-observable@0.18.0', 'moment@2.22.0');

  const newDeps = [
    "moment",
    "react-redux@5.0.7",
    "recompose@0.26.0",
    "redux@3.7.2",
    "redux-observable@0.18.0",
    "rxjs@5.5.9"
  ];

  argsPlus.push(...newDeps);

  // Install dev dependencies
  const types = [
    "@storybook/addon-actions@3.4.1",
    "@storybook/addon-knobs@3.4.1",
    "@storybook/addon-links@3.4.1",
    "@storybook/react@3.4.1",
    "@types/enzyme@3.1.9",
    "@types/enzyme-adapter-react-16@1.0.2",
    "@types/jest@22.2.3",
    "@types/node@9.6.4",
    "@types/react",
    "@types/react-dom",
    "@types/react-redux@5.0.16",
    "@types/react-test-renderer@16.0.1",
    "@types/recompose@0.24.7",
    "@types/redux@3.6.0",
    "@types/redux-mock-store@0.0.12",
    "@types/storybook__addon-knobs@3.3.1",
    "@types/storybook__react@3.0.7",
    "enzyme@3.3.0",
    "enzyme-adapter-react-16@1.1.1",
    "jest-enzyme@6.0.0",
    "react-test-renderer@16.3.1",
    "redux-mock-store@1.4.0"
  ];

  console.log(`Installing other dependencies ${command}...`);
  console.log();

  const plusProc = spawn.sync(command, argsPlus, { stdio: 'inherit' });
  if (plusProc.status !== 0) {
    console.error(`\`${command} ${argsPlus.join(' ')}\` failed`);
    return;
  }

  console.log(`Installing ${types.join(', ')} as dev dependencies ${command}...`);
  console.log();

  const devProc = spawn.sync(command, argsDev.concat(types), { stdio: 'inherit' });
  if (devProc.status !== 0) {
    console.error(`\`${command} ${args.concat(types).join(' ')}\` failed`);
    return;
  }

  // Install additional template dependencies, if present
  const templateDependenciesPath = path.join(
    appPath,
    '.template.dependencies.json'
  );
  if (fs.existsSync(templateDependenciesPath)) {
    const templateDependencies = require(templateDependenciesPath).dependencies;
    args = args.concat(
      Object.keys(templateDependencies).map(key => {
        return `${key}@${templateDependencies[key]}`;
      })
    );
    fs.unlinkSync(templateDependenciesPath);
  }

  // Install react and react-dom for backward compatibility with old CRA cli
  // which doesn't install react and react-dom along with react-scripts
  // or template is presetend (via --internal-testing-template)
  if (!isReactInstalled(appPackage) || template) {
    console.log(`Installing react and react-dom using ${command}...`);
    console.log();

    const proc = spawn.sync(command, args, { stdio: 'inherit' });
    if (proc.status !== 0) {
      console.error(`\`${command} ${args.join(' ')}\` failed`);
      return;
    }
  }

  // Display the most elegant way to cd.
  // This needs to handle an undefined originalDirectory for
  // backward compatibility with old global-cli's.
  let cdpath;
  if (originalDirectory && path.join(originalDirectory, appName) === appPath) {
    cdpath = appName;
  } else {
    cdpath = appPath;
  }

  // Change displayed command to yarn instead of yarnpkg
  const displayedCommand = useYarn ? 'yarn' : 'npm';

  console.log();
  console.log(`Success! Created ${appName} at ${appPath}`);
  console.log('Inside that directory, you can run several commands:');
  console.log();
  console.log(chalk.cyan(`  ${displayedCommand} start`));
  console.log('    Starts the development server.');
  console.log();
  console.log(
    chalk.cyan(`  ${displayedCommand} ${useYarn ? '' : 'run '}build`)
  );
  console.log('    Bundles the app into static files for production.');
  console.log();
  console.log(chalk.cyan(`  ${displayedCommand} test`));
  console.log('    Starts the test runner.');
  console.log();
  console.log(chalk.cyan(`  ${displayedCommand} test --coverage`));
  console.log('    Starts the test runner with coverage reporter.');
  console.log();
  console.log(
    chalk.cyan(`  ${displayedCommand} ${useYarn ? '' : 'run '}storybook`)
  );
  console.log('    Starts storybook.');
  console.log();
  console.log(
    chalk.cyan(`  ${displayedCommand} ${useYarn ? '' : 'run '}eject`)
  );
  console.log(
    '    Removes this tool and copies build dependencies, configuration files'
  );
  console.log(
    '    and scripts into the app directory. If you do this, you can’t go back!'
  );
  console.log();
  console.log('We suggest that you begin by typing:');
  console.log();
  console.log(chalk.cyan('  cd'), cdpath);
  console.log(`  ${chalk.cyan(`${displayedCommand} start`)}`);
  if (readmeExists) {
    console.log();
    console.log(
      chalk.yellow(
        'You had a `README.md` file, we renamed it to `README.old.md`'
      )
    );
  }
  console.log();
  console.log('Happy hacking!');
};

function isReactInstalled(appPackage) {
  const dependencies = appPackage.dependencies || {};

  return (
    typeof dependencies.react !== 'undefined' &&
    typeof dependencies['react-dom'] !== 'undefined'
  );
}
