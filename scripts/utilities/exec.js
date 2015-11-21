const execSync = require('child_process').execSync;

module.exports = function exec() {
  const args = Array.prototype.slice.call(args);

  console.log(`${args[1] && args[1].cwd || ''}$ ${args[0]}`);
  process.stdout.write(execSync(...args));
};
