
/**
 * @XPipe
 *  extention of `XPromise`, to allow piping/ compumed jobs as streams, in async environment
 */
module.exports = (Xpromise, notify) => {
    if (!notify) notify = require('./libs/notifications')()
    const { isArray, isEmpty, isObject, isFunction } = require('lodash')

    if (!Xpromise) Xpromise = function() {} // allow use if xpromise not set

    class XPipe extends Xpromise {
        constructor(promiseUID, opts, debug) {
            super(promiseUID, opts, debug)

            this.pipeCBList = {}
            this._pipeList = {}
            this.pipeIndex = {} // current job pipe index status
            this.initPipeSet = {} // initPipe set for each job
            this.pendingPipes = {} // pipes that are delayed and waiting to be resolved on next issue
        }

        /**
         * @initPipe
         * you can use it to start the pipe, optionally, or just start with the `pipe` itself
         */
        initPipe(uid, firstPipedData = null, resolveReject = true) {
            this.testUID(uid)
            this.lastUID = uid
            // make sure this can only be called once per job
            if (!this.initPipeSet[uid] && !this.pipeList[uid]) {
                this.initPipeSet[uid] = {
                    data: firstPipedData,
                    resolution: resolveReject || false
                }
            }
            return this
        }

        /**
         * @pipe
         * `cb` if privided you can pipe each new data thru callback, you need to return it
         * `uid` will check for last used uid if not provided
         * `firstPipedData` only provide this initialy at first pipe sequence of this job id
         * `resolveReject` is this a resolve or reject
         * */
        pipe(cb, uid, firstPipedData = null, resolution = null) {
            uid = this._getLastRef(uid)
            if (this.pipeIndex[uid] === undefined) this.pipeIndex[uid] = 0
            // var errMessage = `[pipe] this uid ${uid} is not a promise so cannot pipe it`

            if (!this.setPipePromise(uid)) {
                const errMessage = `[pipe] invalid pipe id ${uid}`
                return this.pipeErrHandler(errMessage, cb)
            }

            // update vars if `initPipe` was called initially
            if (this.initPipeSet[uid]) {
                firstPipedData = firstPipedData === null ? this.initPipeSet[uid].data : firstPipedData
                resolution = resolution === null ? this.initPipeSet[uid].resolution : resolution
                delete this.initPipeSet[uid] // delete after it was set
            }
            // this will be only called at index 0
            this.startPipingSequence(uid, true, resolution, firstPipedData)

            this.pipeIndex[uid]++ // increment each pipe count

            var nextPipe = this.getPipe(uid)
            if (!nextPipe) {
                return this.pipeErrHandler('not a pipe', cb)
            }

            this.waitingJob(uid)

            var pipeID = `${uid}-${this.jobIndex(uid)}`
            if (isFunction(cb)) {
                nextPipe.then(v => {
                    var d = cb(v)
                    this.callPipeResolution(pipeID, true, d, uid)
                }, err => {
                    var d = cb(null, err)
                    this.callPipeResolution(pipeID, false, d, uid)
                })
                return this
            } else {
                return nextPipe.then(v => {
                    this.callPipeResolution(pipeID, true, v, uid)
                    return v
                }, err => {
                    this.callPipeResolution(pipeID, false, err, uid)
                    return Promise.reject(err)
                })
            }
        }

        get pipeList() {
            return this._pipeList
        }

        set pipeList(v) {
            if (isEmpty(v)) {
                if (this.debug) notify.ulog(`[pipeList] cannot be set as empty`, true)
                return
            }
            if (isArray(v)) {
                if (this.debug) notify.ulog(`[pipeList] cannot be an array`, true)
                return
            }
            if (!isObject(v)) {
                if (this.debug) notify.ulog(`[pipeList] must be an object`, true)
                return
            }

            // all must be a promise
            for (var k in v) {
                var jobPipelist = v[k]
                if (isEmpty(jobPipelist)) {
                    notify.ulog(`[pipeList] jobPipelist empty for ${k}`, true)
                    throw ('error')
                }
                for (var kk in jobPipelist) {
                    if (!this.isPromise(jobPipelist[kk])) {
                        notify.ulog(`[pipeList] each pipe in jobList must be a promise, but id ${k} is not`, true)
                        throw ('error')
                    }
                }
            }

            this._pipeList = v
        }

        /**
         * @newPipePromise
         * set new pipe promise for each pipe that is called and wait for callback
         */
        newPipePromise(id) {
            return new Promise((resolve, reject) => {
                if (!this.pipeCBList[id]) {
                    this.pipeCBList[id] = (name, value, data) => {
                        if (value === true) {
                            return resolve(data)
                        }
                        if (value === false) {
                            return reject(data)
                        }
                    }
                    return
                }
                resolve(true)
            })
        }

        /**
         * @setPipePromise
         * add promise to each pipe and update `pipeList` object setter
         */
        setPipePromise(id) {
            var pipeSet = null

            if (!this.pipeList[id]) {
                this.pipeList[id] = {}
                const pipeID = `${id}-${this.jobIndex(id)}`
                this.pipeList[id][this.jobIndex(id)] = this.newPipePromise(pipeID)
                pipeSet = true
            } else {
                const pipeID = `${id}-${this.jobIndex(id)}`
                if (!this.pipeList[id][ this.jobIndex(id) ]) {
                    this.pipeList[id][ this.jobIndex(id) ] = this.newPipePromise(pipeID)
                    pipeSet = true
                }
            }
            if (pipeSet) {
                this.pipeList = Object.assign({}, this.pipeList)
            }

            // in case it exists update state
            if (!pipeSet) {
                pipeSet = this.pipeList[id][ this.jobIndex(id) ] !== undefined
            }
            return pipeSet
        }

        /**
         * @waitingJob
         *  check for delayed jobs and resolve them then delete pendingPipes[index]
        */
        waitingJob(uid) {
            var prevJob = this.jobIndex(uid) - 1
            var prevPipeID = `${uid}-${prevJob}`
            var waitingJob = this.pendingPipes[prevPipeID]
            if (waitingJob && typeof this.pipeCBList[prevPipeID] === 'function') {
                this.pipeCBList[prevPipeID](prevPipeID, waitingJob.resolution, waitingJob.data)
                delete this.pendingPipes[prevPipeID]
            }
        }

        callPipeResolution(pipeID, resolution, data, jobId) {
            if (typeof this.pipeCBList[pipeID] === 'function') {
                this.pipeCBList[pipeID](pipeID, resolution, data)
            } else {
                // when we call for pipe that doesnt yet exist, maybe its delayed
                if (jobId) {
                    if (!this.setPipePromise(jobId)) {
                        if (this.debug) notify.ulog(`[callPipeResolution] pipeID ${pipeID} not found`, true)
                        return
                    }
                    if (!this.pendingPipes[pipeID]) this.pendingPipes[pipeID] = {}
                    this.pendingPipes[pipeID].resolution = resolution
                    this.pendingPipes[pipeID].data = data
                    this.pendingPipes[pipeID].uid = jobId
                }
            }
        }
        /**
         * @startPipingSequence
         * the first pipe starts the pipe chain sequence, starts from index 0
         */
        startPipingSequence(id, pipeAssigned, trueFalse, pipedData) {
            if (this.jobIndex(id) === 0 && pipeAssigned) {
                const pipeID = `${id}-${this.jobIndex(id)}`
                this.callPipeResolution(pipeID, trueFalse, pipedData)
            } else {
                // startPipingSequence already set
            }
            return this
        }

        jobIndex(uid) {
            return this.pipeIndex[uid]
        }

        pipeErrHandler(errMessage, cb) {
            if (isFunction(cb)) {
                if (this.debug) notify.ulog(errMessage, true)
                return this
            } else {
                return Promise.reject(errMessage).catch(err => {
                    notify.ulog(errMessage, true)
                })
            }
        }

        /**
         * @getPipe
         * get pipe by index, `this.ps[uid].pipes[index]`
         */
        getPipe(uid) {
            // first pipe should always be zero, index is incremented before `getPipe` is called
            const index = this.jobIndex(uid) === 0 ? this.jobIndex(uid) : this.jobIndex(uid) - 1
            var pipe = this.pipeList[uid][index]
            if (this.isPromise(pipe)) return pipe
            else {
                if (this.debug) notify.ulog(`[getPipe] pipe for index ${index} not available`, true)
                return false
            }
        }
    }
    return XPipe
}
