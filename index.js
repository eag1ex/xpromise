
var xpromise = require('./x.promise')()
const debug = true
const opts = { showRejects: true, allowPipe: true }
var uid = null
const xp = new xpromise(uid, opts, debug)
xp.test()
