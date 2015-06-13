'use strict'

var test = require('tape')
var buildQueue = require('./')

test('worker execution', function (t) {
  t.plan(3)

  var queue = buildQueue(worker, 1)

  queue.push(42, function (err, result) {
    t.error(err, 'no error')
    t.equal(result, true, 'result matches')
  })

  function worker (arg, cb) {
    t.equal(arg, 42)
    cb(null, true)
  }
})

test('limit', function (t) {
  t.plan(4)

  var expected = [10, 0]
  var queue = buildQueue(worker, 1)

  queue.push(10, result)
  queue.push(0, result)

  function result (err, arg) {
    t.error(err, 'no error')
    t.equal(arg, expected.shift(), 'the result matches')
  }

  function worker (arg, cb) {
    setTimeout(cb, arg, null, arg)
  }
})
