// simple pipe example
const notify = require('notifyx')
const XPipe = require('../xpromise/x.pipe')()
const debug = true
const opts = { allowPipe: true } //
const x = new XPipe(null, opts, debug)
const jobID1 = 'job01'
const jobID2 = 'job02'
setTimeout(() => {
    var resolution = true // resolve()
    x.initPipe(jobID1, { type: 'bank transaction', processing: 0 }, resolution)
}, 2000)

setTimeout(() => {
    var resolution = true // resolve()
    x.initPipe(jobID2, { type: 'client transaction', processing: 0 }, resolution)
}, 2000)

const asyncData = (time = 2000, data) => {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            resolve(data)
        }, time)
    })
}

x.pipe(d => {
    d.age = 50
    d.job = x.lastUID
    notify.ulog({ d })
    d.index = 1
    d.processing = 20
    notify.ulog({ d, message: 'pipe 1' })
    return d
}, jobID2)

x.pipe(d => {
    d.age = 50
    d.job = x.lastUID
    notify.ulog({ d })
    d.index = 1
    d.processing = 20
    notify.ulog({ d, message: 'pipe 1' })
    return d
}, jobID1)
    .fail() // reject() status
    .pipe(async(d, err) => {
        err.status = 'failed'
        err.processing = 30
        err.index++

        var errd = await asyncData(1000, err)
        // notify.ulog({ d, errd, message: 'pipe 2' })
        return errd
    })
    .pass() // change back to resolve()
    .pipe(d => {
        d.status = 'corrected'
        d.index++
        d.processing = 60
        notify.ulog({ d, message: 'pipe 3' })

        return d
    })
    // .end(jobID1) // NOTE would end future pipe  for this uid

setTimeout(() => {
    x.pipe(d => {
        d.status = 'complete'
        d.processing = 100
        d.index++
        // notify.ulog({ d, message: 'pipe 4' })

        return d
    }, jobID1)
        .end()
        // NOTE this one would never call, we already end that sequence with end()
        // .pipe(d => {
        //     console.log('ha?', d)
        //     return d
        // })
}, 2000)
/// pipe().pipe() on and on
