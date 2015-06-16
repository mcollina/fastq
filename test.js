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

test('multiple executions', function (t) {
  t.plan(15)

  var queue = buildQueue(worker, 1)
  var toExec = [1, 2, 3, 4, 5]
  var count = 0

  toExec.forEach(function (task) {
    queue.push(task, done)
  })

  function done (err, result) {
    t.error(err, 'no error')
    t.equal(result, toExec[count - 1], 'the result matches')
  }

  function worker (arg, cb) {
    console.log('received', arg)
    t.equal(arg, toExec[count], 'arg matches')
    count++
    setImmediate(cb, null, arg)
  }
})

test('multiple executions, one after another', function (t) {
  t.plan(15)

  var queue = buildQueue(worker, 1)
  var toExec = [1, 2, 3, 4, 5]
  var count = 0

  queue.push(toExec[0], done)

  function done (err, result) {
    t.error(err, 'no error')
    t.equal(result, toExec[count - 1], 'the result matches')
    if (count < toExec.length) {
      queue.push(toExec[count], done)
    }
  }

  function worker (arg, cb) {
    console.log('received', arg)
    t.equal(arg, toExec[count], 'arg matches')
    count++
    setImmediate(cb, null, arg)
  }
})

test('set this', function (t) {
  t.plan(3)

  var that = {}
  var queue = buildQueue(that, worker, 1)

  queue.push(42, function (err, result) {
    t.error(err, 'no error')
    t.equal(this, that, 'this matches')
  })

  function worker (arg, cb) {
    t.equal(this, that, 'this matches')
    cb(null, true)
  }
})
