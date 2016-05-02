var spawn = require('child_process').spawn;
var challenger = require('./index.js')(process.env['SUDOPWD']);
var token = 'token';
var child = challenger.spawn('sh', ['-c', 'echo "'+token+'" 1>&2 && sudo -S -k echo "my token" 1>&2 && sudo -S -k echo "my token22" 1>&2']);
child.stderr.pipe(process.stderr);
// child.stdout.pipe(process.stdout);
child.on('exit', function () {
  console.log('exit')
})
child.on('close', function () {
  console.log('close')
})
