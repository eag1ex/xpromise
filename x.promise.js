
/**
 * @XPromise
*/
module.exports = (notify) => {
    if (!notify) notify = require('./notifications')()
    const { isEmpty, isArray, isObject, isString, isNumber, times, isFunction } = require('lodash')
    class XPromise {
        constructor(promiseUID, debug) {
            // if set initiate promise right away
            if (isString(promiseUID)) {
                this.p(promiseUID)
            }

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
            this.p(uid1)
            this.p(uid1a)
            this.p(uid1b)
            setTimeout(() => {
                this.resolve(uid1, 'abc')
                this.resolve(uid1a, 'abc')
                this.resolve(uid1b, 'abc')
            }, 2000)

            // this.ref(uid1).onReady(z => {
            //     console.log('onReady', z)
            // }, err => {
            //     console.log('err', err)
            // })
            this.ref(uid1).asPromise().then(d => {
                console.log('asPromise', d)
                console.log('ps', this.ps)
            }, err => {
                console.log('err', err)
            })

            // this will be ignored
            setTimeout(() => {
                this.ref(uid1).asPromise().then(d => {
                    console.log('asPromise 2', d)
                }, err => {
                    console.log('asPromise 2 err', err)
                })
            }, 100)

            // console.log('pending', this.p().pending())
            // Promise.all(this.all()).then(d => {
            //     console.log('all', d)
            // }, err => {
            //     console.log('err', err)
            // })
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
            if (relative) {
                uid = uid.split('--')[0]
                this.testUID(uid)

                for (var k in this.ps) {
                    if (k.indexOf(uid) !== -1 && k.indexOf(`--`) !== -1) {
                        relIndex++
                        break // exit quickly if any matched
                    }
                }

                if (relIndex) return true
                else if (this.ps[uid]) return true
            } else if (this.ps[uid] && !relative) return true
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
            this.delete(uid)

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
                if (this.debug) notify.ulog(`[reject] promise uid: ${uid} does not exist`, true)
                return this
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
                if (this.debug) notify.ulog(`[resolve] promise uid: ${uid}  does not exist`, true)
                return this
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
            if (!this.processing(uid)) {
                return Promise.reject(`[asPromise] uid ${uid} already processed once before`)
            }

            var rel = this._resolveAllRelativeAS(uid)
            if (rel !== null) return rel
            else {
                return this.ps[uid].p.then(z => {
                    this.delete(uid)
                    return Promise.resolve(z)
                }, err => {
                    this.delete(uid)
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

            if (!this.processing(uid)) {
                var msg = `[onReady] uid ${uid} already processed once before`
                if (typeof errCB === 'function') errCB(msg)
                return false
            }

            var rel = this._resolveAllRelativeAS(uid, cb, errCB)
            if (rel) return true
            else {
                this.ps[uid].p.then((v) => {
                    this.delete(uid)
                    if (typeof cb === 'function') cb(v)
                }, err => {
                    this.delete(uid)
                    if (typeof errCB === 'function') errCB(err)
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
            var hasCallbacks = isFunction(cb) || isFunction(cbERR)
            if (rel) {
                var { relative, refs } = rel
                // if has callback do not return promise
                if (hasCallbacks) return true
                return Promise.all(relative).then((d) => {
                    times(refs.length, i => {
                        var del = this.delete(refs[i])
                        // if (del) console.log('del', refs[i])
                    })
                    if (typeof cb === 'function') cb(d)
                    else return Promise.resolve(d)
                }, err => {
                    if (typeof cbERR === 'function') cbERR(err)
                    else return Promise.reject(err)
                })
            } else {
                return null
            }
        }

        /**
         * @_findRelativePromise
         * relative promise ends with sufix `--{index}`, means it belongs to one ref/uid and we need to only make one ready/all/asPromise call to compelte it
         */
        _findRelativePromise(relUID) {
            // find relative uid/refs
            var uid = relUID.split('--')[0]
            this.testUID(uid)

            var relative = []
            var refs = []
            for (var k in this.ps) {
                if (k.indexOf(uid) !== -1 && k.indexOf(`--`) !== -1) {
                    if (this.validPromise(this.ps[k])) {
                        relative.push(this.ps[k].p)
                        refs.push(k)
                    }
                }
            }

            // also collect refs so we can dispose of all data by ref/uid
            if (relative.length) {
                // if provided `relUID` wasnt relative and without sufix `--{index}`, append it to end as well
                if (relUID.indexOf('--') === -1 && this.validPromise(this.ps[relUID])) {
                    relative = [].concat(relative, this.ps[relUID].p).filter(z => !!z)
                    refs = [].concat(refs, relUID).filter(z => !!z)
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
        processing(uid) {
            if (!this.ps[uid].processing) {
                this.ps[uid].processing = true
                this.relativeProcessing(uid)
                this.ps = Object.assign({}, this.ps)
                return true
            } else return false
        }

        /**
         * @relativeProcessing
         * set relative for processing also
         */
        relativeProcessing(uid) {
            var uid = uid.split('--')[0]

            var updated = false
            for (var k in this.ps) {
                if (k.indexOf(uid) !== -1 && k.indexOf(`--`) !== -1) {
                    if (this.validPromise(this.ps[k])) {
                        if (!this.ps[k].processing) {
                            this.ps[k].processing = true
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
                            self[`_xpromise`][_prop] = val
                            if (self.promiseCBList[_prop]) {
                                var newVal = (val || {}).v
                                var processing = (val || {}).processing
                                var data = (val || {}).data || null

                                if ((newVal === true || newVal === false) && processing === true) {
                                    self.promiseCBList[_prop](_prop, newVal, data)
                                }
                            }
                            // notify.ulog({ message: 'new value set', prop: _prop, value: val })
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
                        this.xpromise[k] = Object.assign({}, { processing: true }, v[k])
                        continue
                    }
                    // resolve or reject
                    if (v[k].v === true || v[k].v === false) {
                        if (v[k].data !== null) {
                            this.xpromise[k] = Object.assign({}, { v: v[k].v, data: v[k].data }, v[k])
                        } else {
                            this.xpromise[k] = Object.assign({}, { v: v[k].v }, v[k])
                        }
                    }
                    continue
                } else {
                    if (v[k] !== undefined) {
                        if (isString(v[k]) && v[k] !== 'set') {
                            if (this.debug) notify.ulog(`[p] to set initial promise you need to provide string value 'set'`, true)
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
                                data: null
                            }
                        } else {
                            if (this.debug) notify.ulog(`[p] to set initial promise you need to provide string value 'set'`, true)
                            continue
                        }
                    }
                }
            } // for

            this._ps = v
        }

        isPromise(d) {
            if (isEmpty(d)) return false
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

        delete(uid) {
            this.testUID(uid)
            if (uid) this.lastUID = uid
            if (!uid && this.lastUID) uid = this.lastUID
            var dels = 0
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
            if (dels) {
                this.ps = Object.assign({}, this.ps)
                return true
            } else return false
            // this.lastUID = null
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
