
const XXP = () => {
    var Xpromise = require('./x.promise')()
    const debug = true
    const opts = { showRejects: true, allowPipe: true }
    var uid = null
    const xp = new Xpromise(uid, opts, debug)

    var uid1 = '1233535'
    var uid1a = '1233535--1'
    var uid1b = '1233535--2'

    // consume example
    var cp = Promise.reject('custom promise')
    // this.resolve(uid1, 'abc')
    xp.resolve(uid1a, 'abc')
    // this.resolve(uid1, 'abc')
    xp.consume(uid1, cp)

    // this.p(uid1)
    // this.p(uid1a)
    // this.p(uid1b)

    // setTimeout(() => {
    xp.asPromise(uid1).then(d => {
        console.log(' uid1 asPromise', d)
    }, err => {
        console.log('err', err)
    })
    setTimeout(() => {
        xp.pipe((z, err) => {
            if (err) console.log('pipe 1 err callback', err)
            return err
        })
        xp.pipe((z, err) => {
            if (err) console.log('pipe 2 err callback', err)

            return err
        })
    }, 5000)

    // }, 200)
}
// XXP()
const XXPIPE = () => {
    var Xpromise = require('./x.promise')()
    const debug = true
    const opts = { showRejects: true, allowPipe: true }
    var xp = new Xpromise(null, opts, debug)

    var uid = 'abc'
    var uid2 = 'abc2'
    var initialData = { name: 'jack', age: 25 }
    //
    // setTimeout(() => {
    xp.initPipe(uid, { name: 'jack', age: 25 }, true)
    xp.initPipe(uid2, { name: 'andy', age: 40 }, true)

    // }, 1000)
    // setTimeout(() => {
    xp.pipe((d, err) => {
        // if (err) console.log('pipe 1 err', err)
        console.log('pipe 1', d)
        return 'test 1'
    }, uid)
    setTimeout(() => {
        xp.pipe((d, err) => {
        // if (err) console.log('pipe 1 err', err)
            console.log('pipe 2', d)
            return d
        }, uid)
    }, 2000)

    xp.pipe((d, err) => {
        // if (err) console.log('pipe 1 err', err)
        console.log('2 pipe 1', d)
        return 'test 2'
    }, uid2)
    setTimeout(() => {
        xp.pipe((d, err) => {
        // if (err) console.log('pipe 1 err', err)
            console.log('2 pipe 2', d)
            return d
        }, uid2)
    }, 2000)

    // xp.pipe((d, err) => {
    //     console.log('pipe 2', d)
    //     return d
    // })
    // }, 1000)

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
// XXPIPE()

var pipeExamples = require('./examples/pipes-example.2')()
