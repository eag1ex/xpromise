
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

    const jobID = 'job01'

    const fetchAPI = (() => {
        var FetchStream = require('fetch').FetchStream
        var fetch = new FetchStream('https://wtfismyip.com/json')
        fetch.on('data', function(chunk) {
            // process.stdout.write(chunk + '\n')
            var resolve = true
            Xpipe.initPipe(jobID, JSON.parse(chunk), resolve)
        })
    })()

    Xpipe.pipe(d => {
        notify.ulog({ event: '[pipe] 1', data: d })
        const data = {
            location: d.YourFuckingLocation || null
        }
        data.pipeIndex = 1
        data.jobID = Xpipe.lastUID
        return data
    }, jobID)
        .pipe(d => {
            d.pipeIndex++
            notify.ulog({ event: '[pipe] 2', data: d })
            return d
        })
        .pipe(d => {
            d.pipeIndex++
            notify.ulog({ event: '[pipe] 3', data: d })
            return d
        })

    setTimeout(() => {
        Xpipe.pipe(d => {
            d.pipeIndex++
            notify.ulog({ event: '[pipe] 4', data: d })
            return d
        }, jobID)
    }, 5000)

    setTimeout(() => {
        Xpipe.pipe(d => {
            d.pipeIndex++
            notify.ulog({ event: '[pipe] 5', data: d })
            return d
        }, jobID)
            .end()// end this pipe sequence and delete all data
    }, 6000)
}
