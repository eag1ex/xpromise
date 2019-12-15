
/**
 * @XPromise
 */
module.exports = (notify) => {
    if (!notify) notify = require('../libs/notifications')()
    const { isEmpty, isArray, isObject, isString, isNumber, times, isFunction, reduce, cloneDeep, indexOf } = require('lodash')
    class XPromise {
        constructor(promiseUID, opts, debug) {
            // if set initiate promise right away
            if (isString(promiseUID)) {
                this.defer(promiseUID)
            }
            this._relSufix = opts.relSufix || '--'
            this.showRejects = opts.showRejects || null // print reject messages to the console
            this.allowPipe = opts.allowPipe || null //  you can pipe thru each promise after it was consumed with `asPromise` or `onReady`
            this.debug = debug
            this.promiseCBList = {}
            this.xpromise = {}
            this._xpromise = {}
            this._ps = {}
            this.lastUID = null
            this.rejects = []
            // this.delayedProcessingCB = {} // delay processing from `asPromise` or `onReady`
            this.delayCB = {}// delay call for each `asPromise` or `onReady` when needed
        }

        /**
         * @exists
         * check if promise by uid/ref exists
         * `uid` must provide uid
         * `relative=false` when set will also check for any relative promise with sufix `--{index}`
        */
        exists(uid, relative = null) {
            this.testUID(uid)

            // test for any relative promise that exist
            var relIndex = 0

            // only test when base uid is not relative job
            if (relative && !this.validRelJob(uid)) {
                this.testUID(uid)

                for (var k in this.ps) {
                    if (k.indexOf(uid) !== -1 && k.indexOf(this.relSufix) !== -1) {
                        relIndex++
                        break // exit quickly if any matched
                    }
                }

                if (relIndex) return true
                else if (this.ps[uid]) return true
            } else if ((this.ps[uid] && !relative) || this.ps[uid]) return true
            return false
        }

        /**
         * @ref
         * set next available uid when chaining
         */
        ref(uid) {
            if (uid) {
                if (!this.ps[uid]) {
                    if (this.debug) {
                        notify.ulog(`[ref] uid does not match any available promise, did you set it yet?`, true)
                    }
                    return this
                }
                this.testUID(uid)
                this.lastUID = uid
            }
            return this
        }

        /**
         * @defer
         * auto set new promise, if doesnt already exist
         * `uid` provide uniq id for each promise
         */
        defer(uid) {
            uid = this._getLastRef(uid)

            if (!this.ps[uid]) {
                this.ps[uid] = 'set'
                this.ps = Object.assign({}, this.ps)
            } else {

            }
            return this
        }

        /**
         * @get
         * resolve
         * `cb` must provide callback, and return data to set new resolve/reject state
         * `uid or [uid...]` provide uid if not chaining, or if want to resolve multiple promise, provide array of uids
         * note: if providing array of uids you have to resolve each uid seperatly, your self in order to end `asPromise` or `onReady` since its waiting for your request
         */
        get(cb, uid) {
            if (!isFunction(cb)) {
                if (this.debug) notify.ulog(`[get()] must have callback set`, true)
                return this
            }

            const reset = (uids = []) => {
                // set as new
                for (var i = 0; i < uids.length; i++) {
                    this.delete(uids[i], true)
                    this.set(uids[i]) // set as new
                }
            }

            // in case provided single array, change to string
            if (isArray(uid)) {
                if (uid.length === 1) {
                    uid = uid.toString()
                }
            }

            if (isArray(uid)) {
                uid = uid.filter(z => this.ps[z] !== undefined)
                // sort uid in order initialy declared!
                var checkPSOrder = this.checkPSOrder()
                if (checkPSOrder.length) {
                    uid = checkPSOrder.map(z => {
                        if (indexOf(uid, z.id) !== -1) return z.id
                        else return null
                    }).filter(n => !!n)
                }

                var multiPromise = []
                for (var i = 0; i < uid.length; i++) {
                    // get ps copy before reset
                    this.ps[uid[i]].processing = true
                    this.ps = Object.assign({}, this.ps)
                    this.lastUID = uid[i]// update last ref
                    multiPromise.push(this.$get)
                    reset([uid[i]]) // set as new
                }

                // NOTE for multi promise callback, we have to resolve data using our own logic, since we do know intent of this data!

                Promise.all(multiPromise).then(z => {
                    // console.log('multiPromise', this.ps)
                    // NOTE we cannot resolve here, we do not know intent of each data
                    cb(z)
                }, err => {
                    // set reject reject all if any fail
                    times(uid.length, inx => {
                        this.reject(uid[inx], err)
                    })
                })
            } else {
                uid = this._getLastRef(uid)
                this.ps[uid].processing = true
                this.ps = Object.assign({}, this.ps)

                // for one promise callback we can resolve date here, since provided callback is our new data
                this.$get.then(z => {
                    try {
                        const d = cb(z) || null
                        this.resolve(uid, d) // set new resolve for this uid
                    } catch (err) {
                        this.reject(uid, err) // set new reject for this uid
                    }
                }, err => {
                    const isInvalid = (err || {}).invalid
                    // NOTE donot pipe dont this promise if have indernal `invalid` internal error
                    if (isInvalid) {
                        cb(err)
                        if (this.showRejects) {
                            notify.ulog(err, true)
                        }
                        return
                    }

                    try {
                        const d = cb(err) || null
                        this.reject(uid, d)
                    } catch (_err) {
                        const dd = cb(_err)
                        this.reject(uid, dd)
                    }
                })

                reset([ uid ]) // set as new
            }
            return this
        }

        /**
         * @$get
         * resolve current promise, require last uid state, or use `this.ref`
         */
        get $get() {
            const uid = this.lastUID
            if (!uid) {
                const msg = `[$get] lastUID referenc not set, use ref(uid) to set it, nothing done`
                return Promise.reject({ invalid: true, message: msg })
                // .catch(err => {
                //     if (this.debug) notify.ulog(err, true)
                // })
            }

            if (!this.ps[uid]) {
                const msg = `[$get] no promise available for this id ${uid}`
                return Promise.reject({ invalid: true, message: msg })
                // .catch(err => {
                //     if (this.debug) notify.ulog(err, true)
                // })
            }
            this.testUID(uid)

            if (!this.isPromise(this.ps[uid].p)) {
                const msg = `[$get] last UID ${uid} is not a promise, or defer not set`
                return Promise.reject({ invalid: true, message: msg })
                // .catch(err => {
                //     if (this.debug) notify.ulog(err, true)
                // })
            }

            /// //////////////////////////
            // update resolve/reject

            delete this.ps[uid].processing
            /// /////////////
            this.updatePS(true)

            return this.ps[uid].p.then(z => {
                this.delete(uid, true) // delete it and reset same uid with ready resolved data

                return z
            }, err => {
                this.delete(uid, true) // delete it and reset same uid with ready reject data
                return err
            })
        }

        /**
         * @consume
         * combine external promise with Xpromise
         * `extPromise` unresolve provide external promise
         */
        consume(uid, extPromise) {
            uid = this._getLastRef(uid)
            if (!this.isPromise(extPromise)) {
                if (this.debug) notify.ulog(`[consume] external promise is not valid to include with XPromise framework`, true)
                return this
            }

            if (!this.ps[uid]) {
                this.ps[uid] = {}
                this.ps[uid].timestamp = new Date().getTime()
                this.ps[uid].consume = extPromise
                this.ps = Object.assign({}, this.ps)
            } else {

            }
            return this
        }

        /**
         * @pending
         * return remaining promises
         */
        get pending() {
            return Object.keys(this.ps).length
        }

        /**
         * @set
         * set new promise
         * `uid`
         */
        set(uid, relative = true, update = true) {
            uid = this._getLastRef(uid)

            // when setting force to delete any existing promises
            if (relative) this.delete(uid, true)

            this.ps[uid] = 'set'
            if (update) this.ps = Object.assign({}, this.ps)
            return this
        }

        /**
         * @reject
         * `uid` declare uid if calling many promises
         * `data` provided data will be resolved in the end
         */
        reject(uid, data = null) {
            uid = this._getLastRef(uid)

            if (!this.ps[uid]) {
                //   if (this.debug) notify.ulog(`[reject] uid: ${uid} does not exist, setting as new!`)
                this.set(uid)
                // return this
            }

            if (!this.validPromise(this.ps[uid])) {
                if (this.debug) notify.ulog(`[reject] promise uid: ${uid} is invalid`, true)
                return this
            }

            /// already set do nothing
            if (this.ps[uid].v !== undefined && this.ps[uid].v !== 'set') {
                return this
            }

            this.ps[uid].v = false
            this.ps[uid].entity = 'data'
            this.ps[uid].timestamp = new Date().getTime()
            if (data !== null) this.ps[uid].data = data
            this.ps = Object.assign({}, this.ps)

            return this
        }

        /**
         * @resolve
         * `uid` declare uid if calling many promises
         * `data` provided data will be resolved in the end
         */
        resolve(uid, data = null) {
            uid = this._getLastRef(uid)

            if (!this.ps[uid]) {
                //  if (this.debug) notify.ulog(`[resolve] uid: ${uid} does not exist, setting as new!`)
                this.set(uid)
                // return this
            }

            if (!this.validPromise(this.ps[uid])) {
                if (this.debug) notify.ulog(`[resolve] promise uid: ${uid} is invalid`, true)
                return this
            }

            /// already set do nothing
            if (this.ps[uid].v !== undefined && this.ps[uid].v !== 'set') {
                return this
            }

            this.ps[uid].v = true
            this.ps[uid].entity = 'data'
            this.ps[uid].timestamp = new Date().getTime()
            if (data !== null) this.ps[uid].data = data
            this.ps = Object.assign({}, this.ps)

            return this
        }

        /**
         * @delay
         * works just like setTimeout, but allows to track the process
         * `cb`: must pass callback with what you want to delay
         * `time`: defauld time in ms is 100
         * `uid`: pass uid or last will be used
         */
        delay(cb, time = 100, uid) {
            if (!isFunction(cb)) {
                if (this.debug) notify.ulog(`[delay] cb must be a function`, true)
                return this
            }

            uid = this._getLastRef(uid)
            if (isEmpty(this.delayCB[uid])) {
                this.delayCB[uid] = []
            }
            const p = (() => {
                return new Promise((resolve, reject) => {
                    setTimeout(() => {
                        cb()
                        resolve(true)
                    }, time)
                })
            })()
            this.delayCB[uid].push(p)
            return this
        }

        /**
         * @sync
         * sinc then cannot be used to copy behaviour, use `sync` as promise or await
         * `uid`: identify your promise if not chaining
         * `allowPipe:boolean` optional to disable `opts.allowPipe` for this call
         */
        asPromise(uid, allowPipe) {
            uid = this._getLastRef(uid)

            const _continue = () => {
                if (!this.processing(uid, true)) {
                    return Promise.reject(`[asPromise] uid ${uid} already processed once before, unless this uid is your relative base which you havent declared`, true)
                }

                var rel = this._resolveAllRelativeAS(uid)
                if (rel !== null) return rel
                else {
                    return this.ps[uid].p.then(z => {
                        this.delete(uid, true)
                        console.log('aspromise', z)
                        this._initiatePiping(uid, true, z, allowPipe) // conditionally enable piping
                        return Promise.resolve(z)
                    }, err => {
                        this.delete(uid, true)
                        this._initiatePiping(uid, false, err, allowPipe) // conditionally enable piping
                        if (this.showRejects) {
                            notify.ulog({ message: 'asPromise err', error: err }, true)
                        }
                        return Promise.reject(err)
                    })
                }
            }

            if (!this.exists(uid, true)) {
                return Promise.reject(`[asPromise] uid ${uid} doesnt exist or already resolved and deleted`)
            }

            if (isArray(this.delayCB[uid]) && !isEmpty(this.delayCB[uid])) {
                return Promise.all(this.delayCB[uid]).then(z => {
                    // slight delay required
                    delete this.delayCB[uid]
                    return this.whenTrue(100, this.ps[uid] !== undefined).then(z => _continue(uid))
                }, err => {
                    delete this.delayCB[uid]
                    return Promise.reject(err)
                })
            } else {
                return this.whenTrue(100, this.ps[uid] !== undefined).then(z => _continue(uid), err => {
                    return Promise.reject(err)
                })
            }
        }

        /**
         * @onReady
         * finall call for Xpromise on resolve or reject, including relative promise
         * `cb=>` callback resolved promise, you can munipulate data by return callback with `opts.allowPipe=true`
         *  and this will pass data stream to the next .pipe
         * `errCB=>` same as `cb` but returns reject promise
         * `uid`: identify your callback promise if not chaining
         * `allowPipe:boolean` optional to disable `opts.allowPipe` for this call
         */
        onReady(cb, errCB, uid, allowPipe) {
            uid = this._getLastRef(uid)
            const _continue = (uid) => {
                try {
                    this.testUID(uid)
                } catch (err) {
                    notify.ulog(err, true)
                }

                if (!this.exists(uid, true)) {
                    var msg = `[onReady] uid ${uid} doesnt exist or already resolved and deleted`
                    if (typeof errCB === 'function') errCB(msg)
                    return this
                }

                if (!this.validPromise(this.ps[uid])) {
                    if (this.debug) notify.ulog(`[onReady] promise uid: ${uid} is invalid`, true)
                    var errMessage = `[onReady] promise uid: ${uid} is invalid`

                    if (typeof errCB === 'function') errCB(errMessage)
                    return this
                }

                if (!this.processing(uid, true)) {
                    var msg = `[onReady] uid ${uid} already processed once before`
                    if (typeof errCB === 'function') errCB(msg)
                    return this
                }

                var rel = this._resolveAllRelativeAS(uid, cb, errCB)
                if (rel !== null) return rel
                else {
                    this.ps[uid].p.then((v) => {
                        this.delete(uid, true)

                        if (isFunction(cb)) {
                            try {
                                var cbData = cb(v) || v
                                this._initiatePiping(uid, true, cbData, allowPipe) // conditionally enable piping
                            } catch (err) {
                                this._initiatePiping(uid, false, { error: err }, allowPipe) // conditionally enable piping
                            }
                        }
                    }, err => {
                        this.delete(uid, true)

                        if (isFunction(errCB)) {
                            try {
                                var cbData = errCB(err) || err
                                this._initiatePiping(uid, false, cbData, allowPipe) // conditionally enable piping
                            } catch (err) {
                                this._initiatePiping(uid, false, { error: err }, allowPipe) // conditionally enable piping
                            }
                        }

                        if (this.showRejects) {
                            notify.ulog({ message: 'onReady err', error: err }, true)
                        }
                    })
                    return this
                }
            }
            if (isArray(this.delayCB[uid]) && !isEmpty(this.delayCB[uid])) {
                Promise.all(this.delayCB[uid]).then(z => {
                    // slight delay required
                    delete this.delayCB[uid]
                    return this.whenTrue(100, this.ps[uid] !== undefined).then(z => _continue(uid))
                }, err => {
                    delete this.delayCB[uid]
                    return Promise.reject(err)
                })
                return this
            } else {
                this.whenTrue(100, this.ps[uid] !== undefined).then(z => _continue(uid))
                return this
            }
        }

        /**
         * @all
         * return all promises in an array, can be used with Promise.all([...])
         */
        get all() {
            var promises = []
            var updated = false
            for (var k in this.ps) {
                if (!this.ps.hasOwnProperty(k)) continue
                var proms = (this.ps[k] || {}).p

                if (!(this.ps[k] || {}).processing) {
                    this.ps[k].processing = true
                    //   delete this.ps[k].hold
                    this.ps[k].timestamp = new Date().getTime()
                    updated = true
                }
                if (!proms) continue
                promises.push(proms)
            }

            // make sure we mark processing here as well!
            if (updated) {
                this.ps = Object.assign({}, this.ps)
            }

            promises = [].concat(this.rejects, promises).filter(z => !!z)
            this.rejects = []// unset
            this.lastUID = null
            return promises
        }

        /**
         * @whenTrue
         * resolve on ok, only resolves to true
         * `maxWait` time in ms, max time to wait for something or fail
         * `ok`: when true, resolve!
         *
         */
        whenTrue(maxWait, ok) {
            return new Promise((resolve, reject) => {
                var checkEvery = 20
                maxWait = maxWait !== undefined ? maxWait : 100
                var counter = 0
                var timer = setInterval(() => {
                    // resolve when either meets true
                    if (ok === true || counter >= maxWait) {
                        clearInterval(timer)
                        resolve(true)
                        return
                    }
                    counter = counter + checkEvery
                }, checkEvery)
            })
        }
        /**
         * @checkPSOrder
         * check promise order by `timestamp`
         * return promise uids with timestemp order
         */
        checkPSOrder() {
            if (isEmpty(this.ps)) return []
            var order = reduce(cloneDeep(this.ps), (n, el, k) => {
                n.push({ id: k, timestamp: el.timestamp })
                return n
            }, [])
            return order.sort((a, b) => {
                return a.timestamp - b.timestamp
            })
        }

        /**
         * @_initiatePiping
         * initiate piping feature
         */
        _initiatePiping(uid, resolution, data, allowPipe) {
            if (!this.allowPipe) return false
            // override to disable pipe for this call
            if (this.allowPipe === true && allowPipe === false) {
                return false
            }
            // make sure pipe calls after resolution of Xpromise
            setTimeout(() => {
                // call original  Xpipe before update
                this.initPipe(uid, data, resolution)
                    .pipe((d, err) => {
                        //  if (this.debug) notify.ulog('Xpipe initiated')
                        if (err) return err
                        return d
                    })
            }, 100)

            return true
        }

        _resolveAllRelativeAS(uid, cb = null, cbERR = null) {
            var rel = this._findRelativePromise(uid)
            var hasCallbacks = isFunction(cb) || isFunction(cbERR)
            if (rel) {
                var { relative, refs } = rel
                // if has callback do not return promise
                const p = Promise.all(relative).then((d) => {
                    times(refs.length, i => {
                        var del = this.delete(refs[i], false)
                        // if (del) console.log('del', refs[i])
                    })
                    this.updatePS(true)

                    // return resolve data or callback data if not null
                    if (isFunction(cb)) {
                        try {
                            var cbData = cb(d) || d
                            this._initiatePiping(uid, true, cbData) // conditionally enable piping
                        } catch (err) {
                            this._initiatePiping(uid, false, { error: err }) // conditionally enable piping
                        }

                        return
                    }
                    if (!isFunction(cb)) {
                        this._initiatePiping(uid, true, d) // conditionally enable piping
                        return Promise.resolve(d)
                    }
                }, err => {
                    times(refs.length, i => {
                        var del = this.delete(refs[i], false)
                        // if (del) console.log('del', refs[i])
                    })
                    this.updatePS(true)

                    if (isFunction(cbERR)) {
                        try {
                            var cbData = cbERR(err) || err
                            this._initiatePiping(uid, false, cbData) // conditionally enable piping
                        } catch (err) {
                            this._initiatePiping(uid, false, { error: err }) // conditionally enable piping
                        }
                        if (this.showRejects) {
                            notify.ulog({ message: 'onReady err', error: err }, true)
                        }
                        return
                    }
                    if (!isFunction(cbERR)) {
                        this._initiatePiping(uid, false, err) // conditionally enable piping
                        if (this.showRejects) {
                            notify.ulog({ message: 'asPromise err', error: err }, true)
                        }
                        return Promise.reject(err)
                    }
                })

                if (hasCallbacks) return this
                else return p
            } else {
                return null
            }
        }

        /**
         * @_findRelativePromise
         * relative promise ends with sufix `--{index}`, means it belongs to one ref/uid and we need to only make one ready/all/asPromise call to compelte it
         */
        _findRelativePromise(uid) {
            // find relative uid/refs
            this.testUID(uid)

            // do not find relative's with relative!
            if (this.validRelJob(uid)) {
                return null
            }
            var relative = []
            var refs = []
            for (var k in this.ps) {
                if (k.indexOf(uid) !== -1 && k.indexOf(this.relSufix) !== -1) {
                    if (this.validPromise(this.ps[k])) {
                        relative.push(this.ps[k].p)
                        refs.push(k) // also collect refs so we can dispose of all data by ref/uid
                    }
                }
            }

            if (relative.length) {
                // if provided wasnt relative and without sufix `--{index}`, append it to end as well
                if (this.validPromise(this.ps[uid])) {
                    relative = [].concat(relative, this.ps[uid].p).filter(z => !!z)
                    refs = [].concat(refs, uid).filter(z => !!z)
                }
                return { relative, refs }
            } else return null
        }

        _getLastRef(uid) {
            if (uid) this.lastUID = uid
            if (!uid && this.lastUID) uid = this.lastUID
            this.testUID(uid)
            return uid || null
        }

        /**
         * @processing
         * mark as processing=true  when calling with `asPromise`, `onReady`, `all` so future calls to resolve same promise will be ignored!
         */
        processing(uid, relative = true) {
            if (this.ps[uid]) {
                // do not process it holding the que
                // if (this.ps[uid].hold) return false

                if (!(this.ps[uid] || {}).processing) {
                    this.ps[uid].processing = true
                    //  this.ps[uid].timestamp = new Date().getTime()
                    if (relative) this.relativeProcessing(uid)
                    this.ps = Object.assign({}, this.ps)
                }

                return true
            } else return false
        }

        set relSufix(v) {
            var _default = `--`
            if (isEmpty(v)) v = _default
            if (!isString(v)) v = _default
            this._relSufix = v
        }
        get relSufix() {
            return `--`
        }

        /**
         * @validRelJob
         * verify if dealing with relative job
         */
        validRelJob(uid = '') {
            if (uid.indexOf(this.relSufix) === -1) return false
            var num = uid.split(this.relSufix)[1]

            if (isEmpty(num)) return false
            if (isNaN(Number(num))) return false
            return true
        }
        /**
         * @relativeProcessing
         * find relative when processing base uid
         */
        relativeProcessing(uid) {
            // process relative only when using base promise
            if (this.validRelJob(uid)) return

            var updated = false
            for (var k in this.ps) {
                if (k.indexOf(uid) !== -1 && k.indexOf(this.relSufix) !== -1) {
                    if (this.validPromise(this.ps[k])) {
                        if (!(this.ps[k] || {}).processing) {
                            this.ps[k].processing = true
                            //  this.ps[k].timestamp = new Date().getTime()
                            this.ps[k].entity = 'data'
                            updated = true
                        }
                    }
                }
            }

            if (updated) {
                // this.ps = Object.assign({}, this.ps)
                // updated from `processing`
            }
        }

        /**
         * @xPromiseListener
         * set a listener for promise when values change, call to resolve the promise using callback
         */
        xPromiseListener(prop) {
            // means already set
            if (!isEmpty(this.xpromise[prop])) return
            const self = this
            const _prop = prop

            try {
                (function(prop) {
                    Object.defineProperty(self.xpromise, prop, {
                        get: function() {
                            return self[`_xpromise`][_prop]
                        },
                        set: function(val) {
                            if (self.promiseCBList[_prop]) {
                                if ((val || {}).copy) return
                                var newVal = (val || {}).v
                                var processing = (val || {}).processing
                                var data = (val || {}).data || null
                                var external = (val || {}).external

                                if ((newVal === true || newVal === false) && processing === true) {
                                    if (!external) self.promiseCBList[_prop](_prop, newVal, data)
                                    delete (val || {}).processing
                                }
                            }
                            self[`_xpromise`][_prop] = val
                            //  notify.ulog({ message: 'new value set', prop: _prop, value: val })
                        },
                        enumerable: true,
                        configurable: true
                    })
                })(prop)
            } catch (err) {
                console.log('-- err cresting listener ', err)
            }

            return this.xpromise // Object.assign(XPromise.prototype, this.xp)
        }

        get ps() {
            return this._ps
        }
        /**
         * @ps
         * create promise object, listen for callbacks from `xPromiseListener` to resolve the promise
         */
        set ps(v) {
            if (isEmpty(v)) return null
            if (isArray(v)) return null
            if (!isObject(v)) return null
            if (!Object.keys(v).length) return null

            for (var k in v) {
                if (this.isPromise(v[k])) continue

                if (this.validPromise(v[k])) {
                    // initiate callback to resolve or reject
                    if (v[k].processing === true) {
                        this.xpromise[k] = Object.assign({}, v[k])
                        continue
                    }

                    // resolve or reject
                    if ((v[k].v === true || v[k].v === false)) {
                        if (v[k].external === undefined) {
                            if (v[k].data !== null) {
                                this.xpromise[k] = Object.assign({}, { v: v[k].v, data: v[k].data }, v[k])
                            } else {
                                this.xpromise[k] = Object.assign({}, { v: v[k].v }, v[k])
                            }
                        }
                    }

                    continue
                    /// ////////////////////////////////
                    // set only initialy
                } else {
                    if (v[k] !== undefined) {
                        if ((v[k] || {}).consume !== undefined) {
                            if (this.isPromise(v[k].consume)) {
                                var listener = this.xPromiseListener(k)
                                listener[k] = 'set'
                                v[k].v = listener[k]
                                v[k].p = v[k].consume // holds data from external promise
                                v[k].processing = null
                                v[k].external = true
                                v[k].entity = null

                                delete v[k].consume
                            }

                            continue
                        }

                        if ((v[k] || {}).external !== undefined) {
                            continue
                        }

                        if (isString(v[k]) && v[k] !== 'set') {
                            if (this.debug) notify.ulog(`[p] to set initial promise you need to provide string value 'set' 1`, true)
                            continue
                        }

                        if (v[k] === 'set') {
                            // first set the promise and the callback
                            var p = this.newPromise(k)

                            var listener = this.xPromiseListener(k)
                            listener[k] = 'set'
                            v[k] = {
                                // timestamp: new Date().getTime(), // to track que orders
                                p: p,
                                processing: null, // in case we call multiples of then this will make sure it can only be called once!
                                v: listener[k],
                                data: null
                            }
                        } else {
                            if (this.debug) notify.ulog(`[p] to set initial promise you need to provide string value 'set' 2`, true)

                            continue
                        }
                    }
                }
            } // for

            this._ps = v
        }

        /**
         * @newPromise
         * set new promise with callback listener on when to resolve
         */
        newPromise(id) {
            return new Promise((resolve, reject) => {
                if (!this.promiseCBList[id]) {
                    // wait for change in xpromise to initiate callback
                    this.promiseCBList[id] = (name, value, data) => {
                        var d = data !== null ? data : value

                        if (value === true) {
                            delete this.promiseCBList[id]
                            return resolve(d)
                        }

                        if (value === false) {
                            delete this.promiseCBList[id]
                            return reject(d)
                        }
                    }
                    return
                }
                resolve(true)
            })
        }

        /**
         * @isPromise
         * check if we are dealing with promise
         */
        isPromise(d) {
            if (!d) return false
            var is_promise = (d || {}).__proto__
            if (typeof (is_promise || {}).then === 'function') return true

            return false
        }

        /**
         * @validPromise
         * check that each promise has correct setup
         */
        validPromise(v) {
            return ((v || {}).p !== undefined && (v || {}).v !== undefined)
        }

        /**
         * @delete
         * called after each promsie is consumed via `onReady` or `asPromise`
         */
        delete(uid, update = false) {
            var dels = 0
            try {
                this.testUID(uid)
                if (uid) this.lastUID = uid
                if (!uid && this.lastUID) uid = this.lastUID

                // TODO not sure if toDelete will cause issue with this

                if (this.promiseCBList[uid]) {
                    delete this.promiseCBList[uid]
                    dels++
                }
                if (this.xpromise[uid]) {
                    delete this.xpromise[uid]
                    dels++
                }
                if (this._xpromise[uid]) {
                    delete this._xpromise[uid]

                    dels++
                }
                if (this._ps[uid]) {
                    delete this._ps[uid]
                    dels++
                }
            } catch (err) {

            }
            if (update === true) this.updatePS(dels)
            if (dels) {
                return true
            } else return false
            // this.lastUID = null
        }

        updatePS(ok) {
            if (ok) {
                this.ps = Object.assign({}, this.ps)
            }
        }

        testUID(UID) {
            if (!UID) throw ('UID NOT PROVIDED')
            if (!isString(UID)) throw ('PROVIDED UID MUST BE STRING')
            if (UID.split(' ').length > 1) throw ('UID MUST HAVE NO SPACES')
            if (isNumber(UID)) throw ('UID CANNOT BE A NUMBER')
            if (UID.length < 2) throw ('UID MUST BE LONGER THEN 1 CHARS')
            return true
        }
    }

    const XpromiseExtended = require('./x.pipe')(XPromise, notify)
    return XpromiseExtended
}
