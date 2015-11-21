#! /usr/env node

const _shelljs = require('shelljs');
const exit = _shelljs.exit;
const fs = require('fs');
const exec = require('./utilities/exec');
const format = require('format-date');

const args = process.argv.slice(2);

const versionBundles = {
  'spec': [
    'element',
    'parse',
    'patch',
    'spec',
  ],
};

if (args.length < 2) {
  process.stderr.write('Usage:  release.js <package name> <version keyword>\n');
  exit(1);
}

const packageName = args[0];
const versionKeyword = args[1];
const bundle = versionBundles[packageName] || [packageName];

const projectRoot = `${__dirname}/..`;
const packagesRoot = `${projectRoot}/packages`;
const bumpPackage = (params) => {
  exec(`npm --no-git-tag-version version ${params.version}`, {
    cwd: `${packagesRoot}/${params.name}`,
  });
};

console.log('\nBumping package versions…');
bumpPackage({name: packageName, version: versionKeyword});
const versionNumber = (
  require(`${packagesRoot}/${packageName}/package.json`).version
);
bundle
  .filter(name => name !== packageName)
  .forEach(name => bumpPackage({name, version: versionNumber}));
console.log('…done!');

console.log('Updating dependency versions…');
require('./utilities/packages').forEach(project => {
  // We must require `./utilities/packages` after the bumps.

  const dependencies = project.manifest.dependencies;

  if (dependencies) {
    const newDependencies = Object.keys(dependencies)
      .reduce((target, dep) => Object.assign(
        {},
        target,
        {[dep]: (bundle.includes(dep) ?
          versionNumber :
          dependencies[dep]
        )}
      ), {});

    const newManifest = `${
      JSON.stringify(
        Object.assign(project.manifest, {dependencies: newDependencies}), null, 2
      )
    }\n`;

    fs.writeFileSync(`${project.cwd}/package.json`, newManifest);
  }
});
console.log('…done!');

console.log('Updating the changelog…');
const changelogPath = `${projectRoot}/Changelog.yaml`;
const currentChangelog = fs.readFileSync(changelogPath, 'utf8');
const newChangelog = currentChangelog
  .replace(/^master:\n/, `${
    versionNumber
  }:\n  date:         ${
    format('{year}-{month}-{day}', new Date())
  }\n`);
fs.writeFileSync(changelogPath, newChangelog, 'utf8');
console.log('…done!');

console.log('Committing changes…');
exec(`git add packages/*/package.json Changelog.yaml`);
exec(`git commit --message='${packageName} v${versionNumber}'`);
console.log('…done!');

console.log('Publishing packages…');
bundle.forEach(name => {
  exec('npm publish', {cwd: `${packagesRoot}/${name}`});
});
exec('git push');
console.log('…done!');
