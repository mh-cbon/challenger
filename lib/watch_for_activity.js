var pkg       = require('../package.json')
var debug     = require('debug')(pkg.name)
var through2  = require('through2')

function watchForActivity(opt){
  opt = opt || {timeout: 100}
  var waitForInactive;
  var state = 'inactive'
  var stream = through2(function (chunk, enc, cb) {
    var that = this;
    if (state==='inactive') {
      debug('enter active state %j', chunk.toString())
      that.emit('active')
      state = 'active'
    }
    clearTimeout(waitForInactive)
    waitForInactive = setTimeout(function (){
      debug('enter inactive state')
      state = 'inactive'
      that.emit('inactive')
    }, opt.timeout);
    cb(null, chunk)
  }, function (cb) {
    clearTimeout(waitForInactive)
    debug('watchForActivity flush')
    cb()
  })
  return stream;
}

module.exports = watchForActivity;
