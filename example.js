var spawn = require('child_process').spawn;
var challenger = require('./index.js')(process.env['SUDOPWD']);
var cmd = 'echo "token" 1>&2 && sudo -S -k echo "my token" 1>&2 && sudo -S -k echo "my token22" 1>&2';
var child = challenger.spawn('sh', ['-c', cmd], {stdio:'pipe'});
child.stderr.pipe(process.stderr);
child.stdout.pipe(process.stdout);
child.on('exit', function () {
  console.log('exit')
})
child.on('close', function () {
  console.log('close')
})
