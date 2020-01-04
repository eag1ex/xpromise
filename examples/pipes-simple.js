// simple pipe example
const notify = require('../libs/notifications')()
const XPromise = require('../xpromise/x.promise')(notify)
const debug = true
const opts = { allowPipe: true } //
const x = new XPromise(null, opts, debug)
const jobID1 = 'job01'

setTimeout(() => {
    var resolution = true // resolve()
    x.initPipe(jobID1, { type: 'bank transaction', processing: 0 }, resolution)
}, 2000)

x.pipe(d => {
    d.age = 50
    d.job = x.lastUID
    notify.ulog({ d })
    d.index = 1
    d.processing = 20
    return d
}, jobID1)
    .fail() // reject() status
    .pipe((d, err) => {
        err.status = 'failed'
        err.processing = 30
        err.index++
        notify.ulog({ err })
        return err
    })
    .pass() // change back to resolve()
    .pipe(d => {
        d.status = 'corrected'
        d.index++
        d.processing = 60
        notify.ulog({ d })
        return d
    })
    // .end(jobID1) // NOTE would end future pipe  for this uid

setTimeout(() => {
    x.pipe(d => {
        d.status = 'complete'
        d.processing = 100
        d.index++
        notify.ulog({ d })
        return d
    }, jobID1)
}, 2000)
/// pipe().pipe() on and on
