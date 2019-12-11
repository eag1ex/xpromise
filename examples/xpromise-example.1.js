
/**
 * XPromise example
 * simulate bank transaction and process
 */
module.exports = () => {
    const notify = require('../libs/notifications')()
    const { merge } = require('lodash')
    var Xpromise = require('../x.promise')()
    const debug = true
    const opts = { showRejects: true, // show reject message in console
        allowPipe: true } // if set Xpipe is enabled and you can pipe stream results of each (base) job
    var uid = null
    const xp = new Xpromise(uid, opts, debug)

    var uid1 = '1233535' // base operation
    var uid1a = '1233535--1' // relational operation (note same number with sufix)
    var uid1b = '1233535--2'

    const transaction = (id) => {
        const data = { account: 'savings', balance: 10000, name: 'John Doe', bank: 'Swiss Bank', number: '000123456789' }
        xp.resolve(id, data)
    }

    const broker = (id) => {
        const data = { broker: 'Pannama Bank', code: '007', agent: 'Boris', fee: 100 }
        xp.resolve(id, data)
    }

    // security layer
    const proxy = (id) => {
        const data = { secret_code: 'xpr3457689', verified: true }
        xp.resolve(id, data)
    }

    // NOTE assing promise to each ID
    xp.p(uid1)
        .p(uid1a)
        .p(uid1b)

    // NOTE simulate proxy
    setTimeout(() => {
        proxy(uid1b)
    }, 500)

    // NOTE simulate transaction
    setTimeout(() => {
        transaction(uid1)
    }, 1000)

    // NOTE simulate broker
    setTimeout(() => {
        broker(uid1a)
    }, 1500)

    // NOTE complete process once broker and transaction finished!
    // all operations need to resolve in order to complete
    // xp.asPromise(uid1).then(data => {
    //     var d = merge.apply(null, data)
    //     d.balance = d.balance - d.fee
    //     delete d.fee
    //     notify.ulog({ message: `process complete for job ${uid1}`, d })
    // }, err => {
    //     // something didnt resolve
    //     notify.ulog({ err }, true)
    // })

    // NOTE onReady similar to asPromise, returns promise from callback, but can further munipulate data and send to pipe streams
    xp.onReady(data => {
        var d = merge.apply(null, data)
        d.balance = d.balance - d.fee
        delete d.fee
        notify.ulog({ message: `process complete for job ${uid1}`, d })
        return d
    }, err => {
        notify.ulog({ message: 'onReady err', err })
    }, uid1)
        .pipe((d, err) => {
            d.status = 'complete'
            notify.ulog({ message: '[pipe] 1', d })
            return d
        })
        .fail() // enforce reject()
        .pipe((d, err) => {
            err.status = 'error'
            notify.ulog({ message: '[pipe] 2', err }, true)
            return err
        })
        // .pipe().pipe() // and so on
}
