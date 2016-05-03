# challenger
Challenge sudo over the streams

# Install

```sh
npm i @mh-cbon/challenger --save
```

# Usage

```js

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

```

It resolves the sudo challenge given the password provided in `env['SUDOPWD']`.

If the password is incorrect, prompt user for a new password until the challenge is solved, or dies.

When the new password is correct, save it in memory for later use.

Also cleans up stderr of any sudo challenge output.

To get the complete about of the child_process you may proceed so,


```js
var spawn = require('child_process').spawn;

var challenger = require('./index.js')(process.env['SUDOPWD']);

var cmd = 'echo "token" 1>&2 && sudo -S -k echo "my token" 1>&2 && sudo -S -k echo "my token22" 1>&2';

var child = spawn('sh', ['-c', cmd], {stdio:'pipe'});

var cleanStderr = challenger(child);

//cleanStderr.pipe(process.stderr);
child.stderr.pipe(process.stderr);

child.stdout.pipe(process.stdout);

child.on('exit', function () {
  console.log('exit')
})
child.on('close', function () {
  console.log('close')
})

```

# Notes

- All sudo commands must use `-S`, otherwise sudo writes directly onto the terminal device, which this module does not listen.
- the child process must pipe both `stderr` and `stdin`
