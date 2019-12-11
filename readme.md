#### [ Developed by Eaglex ](http://eaglex.net)
##### Name: XPromise
* License: `CC BY` 


#### Description
Smart Javascript Promise with event stream piping, similar to Q/defer, uses prototype getter/setter with dynamic callbacks to send resolve states.
- Grouping promises `ralative` to main `job` and resolving all as part of one.
- Easy to maintain all promises in one framework
- Manage async functionality with `.pipe(d=>).pipe(d=>)`, allows piping streamed events


#### Methods
* `p(uid)`: Set new promise with its uniq ref/id
* `set(uid)` : Reset previously set promise again
* `resolve(uid, data)`: will set resolve() with `onReady` or `asPromise().then(..)`, `data` is optional,  when not set will return `true`
* `reject(uid, data)`: same as `resolve` but return as rejecte(), `data` is optional, when not set will return `false`
* `ref(uid)` : will set uid/ref and continue on path of that job
* `onReady(done=>,err=>)` return ready in callback
* `asPromise(uid)`: will return as promise: asPromise().then(d=>...)
* `all`: variable will return all current promises, so you can assign it to Promise.all(all)...
* `pending`: variable return index of currently active promises
* `exists(uid)` : check if uid/ref exists, if promise exists!
* `pipe(cb=>,uid)` :  Refers to extended XPipe class refer to `x.pipe.js`
    - pipe/stream jobs beond resolution (job consumption), very usefull when working in async environment
* `pass(uid)` : specify before `.pipe()` if you want it to pass or fail, regardless, uid not needed when chaining 
* `fail(uid)`: opposite of `pass()`

##### Stack
 - Lodash, ES6, javascript, Node.js


##### Usage/Examples
- Simple XPipe, bank transaction example:
- more piping stream event examples at: `./examples/pipes-example.x`
```
const notify = require('../libs/notifications')()
const XPromise = require('../x.promise')(notify)
const debug = true
const opts = { showRejects: true, allowPipe: true }
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
