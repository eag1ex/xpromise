

/**
 * @XPromise
 * cleaver promise, similar to Q/defer, uses proto getter/setter with dynamic callback to send resolve state
 *  - inteligent processing feature, will ignore promise with rejection, that is alraedy being resolved somewhere else
 * `p(uid)`: Set new promise with its uniq ref/id
 * `consume(uid,customPromise)`: provide external promise to be included in the framework
 * `xp` : a variable sorthand of `p()`, can use if if last uid already set
 * `set(uid)` : Reset previously set promise again
 * `resolve(uid)`: will set as ready to be resolved with `onReady` or `asPromise().then(..)`
 * `reject(uid)`: same as resolve but will return as rejected value
 * `ref(uid)` : will set uid/ref so dont have to repeat typing your uid
 * `onReady(done=>,err=>)` will return ready data in callback
 * `asPromise(uid)`: will return as promise: asPromise().then(d=>...)
 * `all`: a variable will return all current promises, so you can assign it to Promise.all(all)...
 * `pending`: a variable return index of currently active promises
 * `exists(uid)` : check if uid/ref exists, if promise exists!
 * `pipe(cb,uid)` : when `callback` set will chain with last consumed promise, then no `callback` set will pipe as promise with .then
 */
module.exports = (notify) => {
    if (!notify) notify = require('./libs/notifications')()
    const { isEmpty, isArray, isObject, isString, isNumber, times, isFunction, cloneDeep } = require('lodash')
    class XPromise {
        constructor(promiseUID, opts, debug) {
            // if set initiate promise right away
            if (isString(promiseUID)) {
                this.p(promiseUID)
            }
            this.showRejects = opts.showRejects || null // print reject messages to the console
            this.allowPipe = opts.allowPipe || null //  you can pipe thru each promise after it was consumed with `asPromise` or `onReady`
            this.debug = debug
            this.promiseCBList = {}
            this.xpromise = {}
            this._xpromise = {}
            this._ps = {}
            this.lastUID = null
            this.rejects = []
        }

        test() {
            var uid1 = '1233535'
            var uid1a = '1233535--1'
            var uid1b = '1233535--2'

            // consume example
            var cp = Promise.resolve('custom promise')
            //this.resolve(uid1, 'abc')
            this.resolve(uid1a, 'abc')
            //this.resolve(uid1, 'abc')
            this.consume(uid1, cp)

            // this.p(uid1)
            // this.p(uid1a)
            // this.p(uid1b)



            setTimeout(() => {
                this.asPromise(uid1).then(d => {
                    console.log(' uid1 asPromise', d)
                }, err => {
                    console.log('err', err)
                })
            }, 200)

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
            if (relative && uid.indexOf(this.relSufix) === -1) {
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
         * @p
         * auto set new promise, if doesnt already exist
         * `uid` provide uniq id for each promise
         */
        p(uid) {
            uid = this._getLastRef(uid)

            if (!this.ps[uid]) {
                this.ps[uid] = 'set'
                this.ps = Object.assign({}, this.ps)
            } else {

            }
            return this
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
         * @xp
         * short hand for p(..) method when lastUID is set
        */
        get xp() {
            if (!this.lastUID) {
                if (this.debug) notify.ulog(`cannot use xp if lastUID is not set`, true)
                return this
            }
            var uid = this.lastUID
            this.testUID(uid)

            return this.p(uid)
        }

        /**
         * @set
         * set new promise
         * `uid`
         */
        set(uid) {
            uid = this._getLastRef(uid)

            // when setting force to delete any existing promises
            this.delete(uid, true)

            this.ps[uid] = 'set'
            this.ps = Object.assign({}, this.ps)
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
                if (this.debug) notify.ulog(`[reject] uid: ${uid} does not exist, setting as new!`)
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
                if (this.debug) notify.ulog(`[resolve] uid: ${uid} does not exist, setting as new!`)
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
            if (data !== null) this.ps[uid].data = data
            this.ps = Object.assign({}, this.ps)
            return this
        }

        /**
         * @sync
         * sinc then cannot be used to copy behaviour, use `sync` as promise or await
         */
        asPromise(uid) {
            uid = this._getLastRef(uid)

            if (!this.exists(uid, true)) {
                return Promise.reject(`[asPromise] uid ${uid} doesnt exist or already resolved and deleted`)
            }


            if (!this.processing(uid, true)) {
                return Promise.reject(`[asPromise] uid ${uid} already processed once before, unless this uid is your relative base which you havent declared`, true)
            }

            var rel = this._resolveAllRelativeAS(uid)
            if (rel !== null) return rel
            else {
                return this.ps[uid].p.then(z => {
                    this.delete(uid, true)

                    return Promise.resolve(z)
                }, err => {

                    this.delete(uid, true)

                    if (this.showRejects) {
                        notify.ulog({ message: 'asPromise err', error: err }, true)
                    }
                    return Promise.reject(err)
                })
            }
            // .catch(err => {
            //     if (this.debug) notify.ulog({ message: `unhandled rejection`, err })
            // })
        }

        onReady(cb, errCB) {
            var uid = this.lastUID

            try {
                this.testUID(uid)
            } catch (err) {
                notify.ulog(err, true)
            }

            if (!this.exists(uid, true)) {
                var msg = `[onReady] uid ${uid} doesnt exist or already resolved and deleted`
                if (typeof errCB === 'function') errCB(msg)
                return false
            }


            if (!this.validPromise(this.ps[uid])) {
                if (this.debug) notify.ulog(`[then] promise uid: ${uid} is invalid`, true)
                var errMessage = `[then] promise uid: ${uid} is invalid`

                if (typeof errCB === 'function') errCB(errMessage)
                return false
            }

            if (!this.processing(uid, true)) {
                var msg = `[onReady] uid ${uid} already processed once before`
                if (typeof errCB === 'function') errCB(msg)
                return false
            }

            var rel = this._resolveAllRelativeAS(uid, cb, errCB)
            if (rel) return true
            else {
                this.ps[uid].p.then((v) => {
                    this.delete(uid, true)

                    if (typeof cb === 'function') cb(v)
                }, err => {
                    this.delete(uid, true)

                    if (typeof errCB === 'function') errCB(err)
                    if (this.showRejects) {
                        notify.ulog({ message: 'onReady err', error: err }, true)
                    }
                })
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

        _resolveAllRelativeAS(uid, cb = null, cbERR = null) {
            var rel = this._findRelativePromise(uid)
            // var hasCallbacks = isFunction(cb) || isFunction(cbERR)
            if (rel) {
                var { relative, refs } = rel
                // if has callback do not return promise
                return Promise.all(relative).then((d) => {
                    times(refs.length, i => {
                        var del = this.delete(refs[i], false)
                        // if (del) console.log('del', refs[i])
                    })
                    this.updatePS(true)
                    if (typeof cb === 'function') cb(d)
                    else return Promise.resolve(d)
                }, err => {
                    times(refs.length, i => {
                        var del = this.delete(refs[i], false)
                        // if (del) console.log('del', refs[i])
                    })
                    this.updatePS(true)
                    if (typeof cbERR === 'function') {
                        cbERR(err)
                        if (this.showRejects) {
                            notify.ulog({ message: 'onReady err', error: err }, true)
                        }
                    } else {
                        if (this.showRejects) {
                            notify.ulog({ message: 'asPromise err', error: err }, true)
                        }
                        return Promise.reject(err)
                    }
                })
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
            if (uid.indexOf(this.relSufix) !== -1) {
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
                if (!(this.ps[uid] || {}).processing) {
                    this.ps[uid].processing = true
                    if (relative) this.relativeProcessing(uid)
                    this.ps = Object.assign({}, this.ps)
                }

                return true
            } else return false
        }

        get relSufix() {
            return `--`
        }

        /**
         * @relativeProcessing
         * set relative for processing also
         */
        relativeProcessing(uid) {
            // process relative only when using base promise
            if (uid.indexOf(this.relSufix) !== -1) return

            var updated = false
            for (var k in this.ps) {
                if (k.indexOf(uid) !== -1 && k.indexOf(this.relSufix) !== -1) {
                    if (this.validPromise(this.ps[k])) {
                        if (!(this.ps[k] || {}).processing) {
                            this.ps[k].processing = true
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
                (function (prop) {
                    Object.defineProperty(self.xpromise, prop, {
                        get: function () {
                            return self[`_xpromise`][_prop]
                        },
                        set: function (val) {
                            self[`_xpromise`][_prop] = val
                            if (self.promiseCBList[_prop]) {
                                var newVal = (val || {}).v
                                var processing = (val || {}).processing
                                var data = (val || {}).data || null
                                var external = (val || {}).external

                                if ((newVal === true || newVal === false) && processing === true) {
                                    if (!external) self.promiseCBList[_prop](_prop, newVal, data)

                                }
                            }
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


            var setPromise = (id) => {
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
            } // setPromise

            for (var k in v) {
                if (this.isPromise(v[k])) continue


                if (this.validPromise(v[k])) {
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
                        } else {
                            // if (this.allowPipe) {
                            //     // update external, this value will be issued from `asPromise` or `onReady`
                            //     this.xpromise[k] = Object.assign({}, { v: v[k].v }, v[k])
                            // }
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
                            var p = setPromise(k)

                            var listener = this.xPromiseListener(k)
                            listener[k] = 'set'
                            v[k] = {
                                p: p,
                                processing: null, // in case we call multiples of then this will make sure it can only be called once!
                                v: listener[k],
                                data: null,
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

        isPromise(d) {
            //  if (isEmpty(d)) return false
            if ((d || {}).then !== undefined) return true
            if (typeof d === 'function') return true

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
    return XPromise
}
