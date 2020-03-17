
const XPipe = require('../xpromise/x.pipe')()
const debug = true
const opts = { allowPipe: true } //
const x = new XPipe(null, opts, debug)
const jobID1 = 'job01'

setTimeout(() => {
    var resolution = true // resolve()
    x.initPipe(jobID1, { type: 'bank transaction', processing: 0 }, resolution)
}, 2000)
x.pipe(null, jobID1).then(z => {
    z.processing++
    console.log('promise pipe 1', z)
    return z
})

x.pipe(null, jobID1).then(z => {
    console.log('promise pipe 2', z)
    return z
})
