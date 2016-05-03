var pkg = require('./package.json')
var debug = require('debug')(pkg.name);
var activityWatcher = require('./lib/watch_for_activity.js')
var spawn = require('child_process').spawn;
var through2 = require('through2');
var split = require('split');

function challenger (password) {

  var needSudo = true;
  var prompt = null;
  var invalid = null;
  var pending = [];

  getDefaults(function (nSudo, p, i) {
    needSudo = nSudo;
    prompt = p;
    invalid = i;
    pending.forEach(function (fn) {
      fn();
    })
    pending = [];
  })

  var onceReady = function (fn) {
    if (prompt===null) pending.push(fn)
    else fn();
  }

  function challengerFn (child) {
    if (!child.stdin || !child.stderr) {
      return debug('cannot handle this child, pipes are not open')
    }
    if (!needSudo) return debug('you don t need sudo challenge');

    var stderr = child.stderr.pipe(through2()).pause();
    var clientStderr = through2();

    onceReady(function () {

      var detectChallenge = detectString(prompt)
      var detectFailure = detectString(invalid, true)

      detectChallenge.on('found', function () {
        debug('challenge detected')
        if (password) {
          debug('writing automatic password')
          child.stdin.write(password + '\n');
        } else {
          debug('no password')
          hasShowPrompt = true;
          process.stderr.write(''+prompt+'');
          enableStdin(function (input) {
            debug('wrote password from stdin')
            password = input;
            child.stdin.write(input + '\n');
            process.stderr.write('\n');
          })
        }
      })

      detectFailure.on('found', function () {
        debug('failure detected');
        process.stderr.write('' + invalid + '\n');
        password = null;
      })

      stderr.pipe(detectChallenge).pipe(detectFailure).pipe(clientStderr);
      stderr.resume();
    })

    return clientStderr.resume();
  }
  challengerFn.spawn = function (bin, args, opts) {
    if(!args) args = []
    if(!opts) opts = {}
    if(!opts.stdio) opts.stdio = ['pipe', 'ignore', 'pipe'];
    var child = spawn(bin, args, opts)
    child.stderr = challengerFn(child);
    return child;
  }
  return challengerFn;
}
function getDefaults (then) {
  var prompt = false;
  var invalid = false;
  var needSudo = true;
  var child = spawn('sudo', ['-S', '-k', 'echo "MY TOKEN"'], {stdio: 'pipe'});
  var stderrPrompt = '';
  var stderrInvalid = '';
  child.stderr.once('data', function (d) {
    stderrPrompt += d.toString();
  })
  var watcher = activityWatcher();
  child.stderr.pipe(watcher);
  watcher.once('inactive', function () {
    child.stderr.once('data', function (d) {
      stderrInvalid += d.toString();
    })
    child.stdin.end('\n');
  })
  child.on('exit', function () {
    if (stderrPrompt.match(/MY TOKEN/)) {
      needSudo = false;
      prompt = false;
    } else if (!stderrPrompt.length) {
      needSudo = false;
      prompt = false;
    } else {
      prompt = stderrPrompt.replace(/\s+$/, '');
      invalid = stderrInvalid.replace(/\s+$/, '');
    }
    debug('prompt=%j', prompt)
    debug('invalid=%j', invalid)
    debug('needSudo=%s', needSudo)
    then(needSudo, prompt, invalid);
  })
}
function enableStdin (then) {
  var input = '';
  var out = through2(function (d,e,n) {
    d = d.toString()
    if (d.match(/\n$/)) {
      rl.close();
      then(input.replace(/\n$/, '').replace(/\r$/, ''));
    } else {
      input += d;
    }
    n();
  });
  var rl = require('readline').createInterface({
    input: process.stdin,
    output: out,
    terminal: true
  });
}
function detectString (str, d) {
  var buf = '';
  var fn = function (l,e,n){
    var that = this;
    l = l.toString()
    d && debug('-------');
    d && debug('l=%j', l);
    if(!l.match('\n')) {
      buf += l;
      if (buf===str) {
        that.emit('found')
        buf = '';
      }
    } else {
      var k = (buf+l).split('\n');
      buf = '';
      d && debug('k=%j', k)
      var i = k.indexOf(str);
      if (i>-1) {
        k.splice(i, 1);
        that.emit('found')
      }
      if (k[k.length-1]!== '')
        buf = k.pop();
      that.push(k.join('\n'));
      d && debug('buf=%j', buf)
    }
    n();
  }
  var fnf = function (d) {
    if (buf===str) {
      that.emit('found')
      buf = '';
    }
    if (buf) this.push(buf);
    d();
  }
  return through2(fn, fnf);
}
function splitter(){
  var buf = []
  var stream = through2(function (d, e, next) {
    var that = this;
    d = d.toString().split('')
    buf = buf.concat(d)
    var k = buf.splice(0, 3).join('');
    k && this.push(k)
    var t = setInterval(function () {
      var k = buf.splice(0, 3).join('');
      k && that.push(k)
      if (!buf.length) {
        clearInterval(t)
        next();
      }
    }, 1)
  }, function (done){
    var that = this;
    var t = setInterval(function () {
      that.push(buf.splice(0, 3).join(''))
      if (!buf.length) {
        clearInterval(t)
        done();
      }
    }, 1)
  })
  return stream;
}
module.exports = challenger;
