
/**
 * XPromise example
 * simulate bank transaction and process
 */
module.exports = () => {
    const notify = require('notifyx')
    const { merge } = require('lodash')
    var Xpromise = require('../xpromise/x.promise')()
    const debug = true
    const opts = {
        // relSufix: '--', // preset default
        showRejects: true, // show reject message in console
        allowPipe: true } // if set Xpipe is enabled and you can pipe stream results of each (base) job
    var uid = null
    const xp = new Xpromise(uid, opts, debug)

    /**
     * to create relational operation, make sure job number is the same with new sufix, `--{number}`
     */
    var uid1 = '1233535' // base operation
    var uid1a = '1233535--1' // relational operation (note same number with sufix)
    var uid1b = '1233535--2'

    const broker = (id) => {
        const data = { broker: 'Pannama Bank', code: '007', agent: 'Boris', fee: 100 }
        return xp.resolve(id, data)
    }

    // security layer
    const proxy = (id) => {
        const data = { secret_code: 'xpr3457689', verified: true }
        xp.resolve(id, data)
    }

    /**
     * transaction
     */
    const transaction = (id) => {
        const data = { account: 'savings',
            balance: 10000,
            name: 'John Doe',
            bank: 'Swiss Bank',
            number: '000123456789' }
        xp.resolve(id, data)

        broker(uid1a)
        /**
         * @get
         * dealing with single uid
         * 1. update broker after transaction was updated
         * 2. and again update transaction after broker
         *
         * You must return each new data to take effect, or null will be resolved!
         */

        // NOTE get `uid1a` < // broker
        // .get(d => {
        //     d.fee = 0
        //     return d

        // // get `id` < // transaction
        // }).get(d => {
        //     d.balance = 500
        //     return d
        // }, id)

        /**
         * @get
         * dealing with multiple uids [uid1,uid2,...]
         */
        // combine results, then update `banker` and `transaction`
            .get(d => {
                var nData = merge.apply(null, d)
                nData.balance = nData.balance - nData.fee
                delete nData.fee

                return nData // NOTE must return data to resolve it
            }, [id, uid1a])
    }

    // NOTE assing promise to each ID
    xp.defer(uid1)
        .defer(uid1a)
        .defer(uid1b)

    // NOTE simulate transaction, and wait for broker, then combine return
    xp.delay(() => {
        transaction(uid1)
    }, 1000, uid1)
    // NOTE simulate proxy
        .delay(() => {
            proxy(uid1b)
        }, 1500, uid1b)

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

    // NOTE onReady similar to asPromise, returns promise from callback, but can further munipulate data and send to pipe stream
    xp.onReady(data => {
        var d = merge.apply(null, data)
        notify.ulog({ message: `[onReady] process complete for job ${uid1}`, d })
        return d
    }, err => {
        notify.ulog({ message: 'onReady err', err })
    }, uid1)
    xp.pipe((d, err) => {
        d.status = 'complete'
        notify.ulog({ message: '[pipe] 1', d })
        //  throw ('ups') // NOTE can handle errors
        return d
    })
        .fail() // enforce reject()
        .pipe((d, err) => {
            err.status = 'error'
            notify.ulog({ message: '[pipe] 2', err }, true)
            return err
        })
    // .end()// end this pipe sequence and delete all data
    // .pipe().pipe() // and so on
}
