module.exports = (Xpromise, notify)=>{
    if(!notify) notify = require('./libs/notifications')()
    class XPipe extends Xpromise{
        constructor(promiseUID, opts, debug) {
            super(promiseUID, opts, debug)
        }
        pipe(cb, uid) {
            uid = this._getLastRef(uid)
            var errMessage = `[pipe] this uid ${uid} is not a promise so cannot pipe it`

            if (this.validPipe(this.ps[uid])) {
                var nextPipeIndex = this.ps[uid].index
                if (nextPipeIndex === 1) nextPipeIndex = nextPipeIndex - 1

                if (!this.isPromise(this.ps[uid].pipes[nextPipeIndex])) {
                    if (this.debug) notify.ulog(errMessage, true)
                    if (typeof cb === 'function') {
                        return this
                    } else {
                        return Promise.reject(errMessage).catch(err => {
                            notify.ulog(errMessage, true)
                        })
                    }
                }
                // assing next pipe to be ready

                var nextPipe = this.getPipe(uid, nextPipeIndex)
                this.processing(uid, false, 'pipe')

                if (typeof cb === 'function') {
                    if (!nextPipe) return this
                    nextPipe.then(z => {
                        var val = cb(z)
                        this.setNextPipe(uid, val) // update pipe chain
                    }, err => {
                        cb(null, err)
                        this.setNextPipe(uid, null) // update pipe chain
                        if (this.showRejects) {
                            notify.ulog({ message: '[pipe] error', error: err }, true)
                        }
                        return err
                    })
                    return this
                } else {
                    if (!nextPipe) {
                        var errmsg = `[pipe] nextPipe err`
                        return Promise.reject(errmsg).catch(err => {
                            notify.ulog(errmsg, true)
                        })
                    }
                    return nextPipe.then(z => {
                        this.setNextPipe(uid, z) // update pipe chain
                        return z // always return value
                    }, err => {
                        this.setNextPipe(uid, null) // update pipe chain
                        if (this.showRejects) {
                            notify.ulog({ message: '[pipe] error', error: err }, true)
                        }
                        return null
                    })
                }
            } else {
                var errMessage = `[pipe] this uid ${uid} is not a pipe`
                console.log('ps', this.ps[uid])
                if (this.debug) notify.ulog(errMessage, true)
                if (typeof cb === 'function') {
                    return this
                } else {
                    return Promise.reject(errMessage).catch(err => {
                        notify.ulog(errMessage, true)
                    })
                }
            }
        }
        
     
        /**
         * @getPipe
         * get pipe by index, `this.ps[uid].pipes[index]`
         */
        getPipe(uid, index) {
            if (this.validPipe(this.ps[uid])) {
                var index = this.ps[uid].index
                var latestPipe = this.ps[uid].pipes[index]
                // this.ps[uid].index = this.ps[uid].index + 1
                console.log('set next pipe index', index, latestPipe)
                if (this.isPromise(latestPipe)) return latestPipe
                else {
                    if (this.debug) notify.ulog(`[getPipe] pipe for index ${index} not available`, true)
                    return false
                }
            } else {
                if (this.debug) notify.ulog(`[getPipe] pipe not valid for uid ${uid}`, true)
                return false
            }
        }
    }
    return XPipe
}