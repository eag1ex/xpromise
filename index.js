
const XXP = () => {
    var Xpromise = require('./x.promise')()
    const debug = true
    const opts = { showRejects: true, allowPipe: true }
    var uid = null
    const xp = new Xpromise(uid, opts, debug)
    xp.test()
}

const XXPIPE = () => {
    var Xpromise = require('./x.promise')()
    const debug = true
    const opts = { showRejects: true, allowPipe: true }
    var xp = new Xpromise(null, opts, debug)

    var uid = 'abc'
    var initialData = { name: 'jack', age: 25 }
    xp.initPipe(uid, initialData, false)
    xp.pipe((d, err) => {
        // if (err) console.log('pipe 1 err', err)
        console.log('pipe 1', d)
        return d
    }, uid, initialData, true)

    xp.pipe((d, err) => {
        console.log('pipe 2', d)
        return d
    }, uid, initialData, false)

    // setTimeout(() => {
    //     xp.pipe((d, err) => {
    //         if (err) console.log('pipe 2 err', err)

    //         return d
    //     })
    // }, 2000)

    // setTimeout(() => {
    //     xp.pipe((d, err) => {
    //         if (err) console.log('pipe 3 err', err)
    //         return d
    //     })
    // }, 2500)

    // setTimeout(() => {
    //     xp.pipe().then(z => {
    //         console.log('pipe 4', z)
    //     }, err => {
    //         console.log('pipe 4 err', err)
    //     })
    // }, 3000)
}
XXPIPE()
