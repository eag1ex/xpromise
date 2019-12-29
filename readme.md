#### [ Developed by Eaglex ](http://eaglex.net)
##### Name: XPromise
* License: `CC BY` 


#### Description
Smart Javascript Promise Manager with stream piping support, similar to Q/defer, uses prototype getter/setter with dynamic callbacks to set resolve states.
* Manage and control all `resolve()` and `reject()` promises.
* Group promises `relative` to main `job` and resolving all as part of one.
* Easy to maintain all promises in one framework
* Manage async functionality with `.pipe(d=>).pipe(d=>)`, allows piping streamed events

#### What is XPipe ?
Pipe `.pipe((d)=>).pipe(...)` is an event that returns a promise as a callback. Every pipe call creates new defer promise to wait for next pipe call. Within each `pipe` callback you can return new data for the next pipe event. `.pipe(null,uid).then(d=>), prm.pipe().then` You can also return pipe as promise, but cannot return new data for the next pipe, until you change it back to callback method, 
example: `.pipe(null,uid).then(d=>), prm.pipe((d)=>).pipe(...`

###### Why use it?
- Your application is promise, async driven


#### Methods
* `defer(uid)`: Set new promise with its uniq ref/id

* `set(uid)` : Reset previously set promise again

* `resolve(uid, data)`: will set resolve() with `onReady` or `asPromise().then(..)`, `data` is optional,  when not set will return `true`

* `reject(uid, data)`: same as `resolve` but return as rejecte(), `data` is optional, when not set will return `false`

* `get(cb=>, [uid])` : you want to resolve early, update and to return final data to `onReady` or `asPromise`
    - `[uid] single`: callback data provides single item, do some logic calculation and return it so its data can be resolved.,  `./examples/xpromise-example.1.js`
    - `[uid1,uid2,..] multiple`: callback data provides array from each uid, do some logic calculation and return it so its data can be resolved. `./examples/xpromise-example.1.js`

* `delay(cb=>,timeDelay:ms, uid)` : do not use setTimeout with `get()` if you want to handle promise early before it hits `onReady` or `asPromise`, delay allows to track each uid and tells final call to wait until ready, provide your logic in delay callback as you would in setTimeout, spetify `timeDelay`< time to wait, and must provide uid for each main transaction. Examples provided in `./examples/xpromise-example.1.js`

* `ref(uid)` : will set uid/ref and continue on path of that job

* `onReady(done=>,err=>,uid)` return data as promise from callback. Additionaly when using pipe `opts.allowPipe=true` you can further munipupate data, checkout examples at: `./examples/xpromise-example.1.js`
    
* `asPromise(uid)`: will return as promise: asPromise().then(d=>...)

* `all`: variable will return all current promises, so you can assign it to Promise.all(all)...

* `pending`: variable return index of currently active promises

* `exists(uid)` : check if uid/ref exists, if promise exists!

* `initPipe(uid, initialData, resolution:bolean)` :  Xpipe can be used without Xpromise, if you are waiting for something before piping starts, its where you would use it.
    - `initialData`: provide data you want to start piping, 
    - `resolution` : you wish the pipe to `resolve()` or `reject()` provide `true` or `false`, default is `true`.
    - examples available at `$/ node ./examples/pipes-simple.js`

* `pipe(cb=>,uid)` :  Refers to extended XPipe class refer to `x.pipe.js`
    - pipe/stream jobs beond resolution (job consumption), very usefull when working in async environment
    - every pipe if using without XPromise need to be initiated first with: `initPipe`, take a look at examples in `./examples/pipes..`

* `pass(uid)` : specify before `.pipe()` if you want it to pass or fail, regardless, uid not needed 
when chaining 

* `fail(uid)`: opposite of `pass()`

##### Stack
 - Lodash, ES6, Javascript, Node.js, ES6 Promise

#### Instalation 
* `$/ npm install`


##### Usage/Examples
* XPromise bank transaction example:
* more examples at: `./examples`
* `$/ node ./examples/pipes-simple.js`
* `$/ node ./examples/xpromise-example.1.js`

```
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
        xp.get(d => {
            var nData = merge.apply(null, d)
            nData.balance = nData.balance - nData.fee - 500
            delete nData.fee

            return nData // NOTE must return data to resolve it
        }, [id, uid1a])
    }

    // security layer
    const proxy = (id) => {
        const data = { secret_code: 'xpr3457689', verified: true }
        xp.resolve(id, data)
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
    // .pipe().pipe() // and so on
```

##### Features:
* This application supports chaining


##### log
* 0712/2019 > XPromise 1.0.0

##### Contact
 * Have questions, or would like to submit feedback, `contact me at: https://eaglex.net/app/contact?product=XPromise`

##### LICENSE
* LICENCE: CC BY
* SOURCE: https://creativecommons.org/licenses/by/4.0/legalcode
