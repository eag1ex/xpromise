
/**
 * @Xpipe
 * Xpipe example, demonstrate how to pipe stream events
 */
module.exports = () => {
    const notify = require('../libs/notifications')()
    const XPromise = require('../xpromise/x.promise')(notify)
    const debug = true
    const opts = { showRejects: true, allowPipe: true }
    const Xpipe = new XPromise(null, opts, debug)

    const jobID1 = 'job01'
    const jobID2 = 'job02'
    const jobID3 = 'job03'

    //
    const fetchAPI = (url, id, resolution = true) => {
        var FetchStream = require('fetch').FetchStream
        var fetch = new FetchStream(url)
        fetch.on('data', function(chunk) {
            // process.stdout.write(chunk + '\n')
            // NOTE initiale the pipe with data and desired resolution you want to pipe onwards
            Xpipe.initPipe(id, JSON.parse(chunk), resolution)
        })

        // NOTE pipe will wait for callback from `initPipe` and forward stream to next `pipe`
        return Xpipe.pipe((d, err) => {
            notify.ulog({ event: '[pipe] 1', data: d })
            const data = {
                location: d.YourFuckingLocation || null
            }
            data.pipeIndex = 1
            data.jobID = Xpipe.lastUID
            return data
        }, id)
    }

    fetchAPI('https://wtfismyip.com/json', jobID1)
        // .pass() // optional if you want to always return resolve()
        .pipe((d, err) => {
            // NOTE make any changes to callback data and return it to next pipe
            d.pipeIndex = 1
            notify.ulog({ event: '[pipe] 2', data: d })
            return d
        }, jobID1)
        .fail() // all pipe streams will continue as reject(), untill changed!
        .pipe((d, err) => {
            err.pipeIndex++
            notify.ulog({ event: '[pipe] 3', err: err })
            return err
        })
        .pass()
        .pipe((d, err) => {
            d.pipeIndex++
            notify.ulog({ event: '[pipe] 4', data: d })
            return d
        })
        .pipe((d, err) => {
            d.pipeIndex++
            notify.ulog({ event: '[pipe] 5', data: d })
            return d
        })
        .end()// end this pipe sequence and delete all data

    // fetchAPI('https://wtfismyip.com/json', jobID2, true).pipe(d => {
    //     d.pipeIndex = 1
    //     notify.ulog({ event: '[pipe] 1', data: d })
    //     return d
    // }, jobID2)
    //     .pipe(d => {
    //         d.pipeIndex++
    //         notify.ulog({ event: '[pipe] 2', data: d })
    //         return null // NOTE  next `pipe` will receive null data
    //     })

    /**
    * NOTE to handle false resolution > reject's you have to check if they exist
    * every false resolution will return error value, and data will be null, for each `.pipe` belongind to that job
    */
    // const fetchErr = (id, resolution = false) => {
    //     setTimeout(() => {
    //         Xpipe.initPipe(id, { error: 500, message: 'handling error status' }, resolution)
    //     }, 2000)
    //     return Xpipe.pipe((d, error) => {
    //         if (error) {
    //             error.pipeIndex = 1
    //             error.jobID = Xpipe.lastUID
    //             notify.ulog({ event: '[pipe] 1', error })
    //         }
    //         return error
    //     }, id)
    // }
    // fetchErr(jobID3, false)
    //     .pipe((d, error) => {
    //         error.pipeIndex++
    //         notify.ulog({ event: '[pipe] 2', error })
    //         return error
    //     }).pipe((d, error) => {
    //         error.pipeIndex++
    //         notify.ulog({ event: '[pipe] 3', error })
    //         return error
    //     })
}
