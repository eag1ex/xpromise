#### [ Developed by Eaglex ](http://eaglex.net)
##### Name: XPromise
* License: `CC BY` 

#### Description
Cleaver promise, similar to Q/defer, uses proto getter/setter with dynamic callback to send resolve state
- inteligent processing feature, will ignore promise with rejection if alraedy being resolved elsewhere
* `p(uid)`: Set new promise with its uniq ref/id
* `set(uid)` : Reset previously set promise again
* `resolve(uid)`: will set as ready to be resolved with `onReady` or `asPromise().then(..)`
* `reject(uid)`: same as resolve but will return as rejected value
* `ref(uid)` : will set uid/ref so dont have to repeat typing your uid
* `onReady(done=>,err=>)` will return ready data in callback
* `asPromise(uid)`: will return as promise: asPromise().then(d=>...)
* `all`: a variable will return all current promises, so you can assign it to Promise.all(all)...
* `pending`: a variable return index of currently active promises
* `exists(uid)` : check if uid/ref exists, if promise exists!


##### Stack
 - Lodash, ES6, javascript, node.js

##### Usage
- Examples in `./index.js`


##### Features:
* This application supports chaining


##### log
* 0712/2019 > XPromise 1.0.0

##### Contact
 * Have questions, or would like to submit feedback, `contact me at: https://eaglex.net/app/contact?product=XPromise`

##### LICENSE
* LICENCE: CC BY
* SOURCE: https://creativecommons.org/licenses/by/4.0/legalcode
