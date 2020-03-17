
/**
 * @xpipe
 * xpipe example, demonstrate how to pipe stream events
 */
module.exports = () => {
    const notify = require('notifyx')
    const XPipe = require('../xpromise/x.pipe')(notify)
    const debug = true
    const opts = { showRejects: true, allowPipe: true }
    const xpipe = new XPipe(null, opts, debug)

    const jobID = 'job01'

    const fetchAPI = (() => {
        var FetchStream = require('fetch').FetchStream
        var fetch = new FetchStream('https://wtfismyip.com/json')
        fetch.on('data', function(chunk) {
            // process.stdout.write(chunk + '\n')
            var resolve = true
            xpipe.initPipe(jobID, JSON.parse(chunk), resolve)
        })
    })()

    xpipe.pipe(d => {
        notify.ulog({ event: '[pipe] 1', data: d })
        const data = {
            location: d.YourFuckingLocation || null
        }
        data.pipeIndex = 1
        data.jobID = xpipe.lastUID
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
        xpipe.pipe(d => {
            d.pipeIndex++
            notify.ulog({ event: '[pipe] 4', data: d })
            return d
        }, jobID)
    }, 5000)

    setTimeout(() => {
        xpipe.pipe(d => {
            d.pipeIndex++
            notify.ulog({ event: '[pipe] 5', data: d })
            return d
        }, jobID)
            .end()// end this pipe sequence and delete all data
    }, 6000)
}
