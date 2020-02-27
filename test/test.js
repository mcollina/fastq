'use strict'

var test = require('tap').test
var buildQueue = require('../')

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

test('drain', function (t) {
  t.plan(4)

  var queue = buildQueue(worker, 1)
  var worked = false

  queue.push(42, function (err, result) {
    t.error(err, 'no error')
    t.equal(result, true, 'result matches')
  })

  queue.drain = function () {
    t.equal(true, worked, 'drained')
  }

  function worker (arg, cb) {
    t.equal(arg, 42)
    worked = true
    setImmediate(cb, null, true)
  }
})

test('pause && resume', function (t) {
  t.plan(7)

  var queue = buildQueue(worker, 1)
  var worked = false

  t.notOk(queue.paused, 'it should not be paused')

  queue.pause()

  queue.push(42, function (err, result) {
    t.error(err, 'no error')
    t.equal(result, true, 'result matches')
  })

  t.notOk(worked, 'it should be paused')
  t.ok(queue.paused, 'it should be paused')

  queue.resume()
  queue.resume() // second resume is a no-op

  t.notOk(queue.paused, 'it should not be paused')

  function worker (arg, cb) {
    t.equal(arg, 42)
    worked = true
    cb(null, true)
  }
})

test('pause in flight && resume', function (t) {
  t.plan(9)

  var queue = buildQueue(worker, 1)
  var expected = [42, 24]

  t.notOk(queue.paused, 'it should not be paused')

  queue.push(42, function (err, result) {
    t.error(err, 'no error')
    t.equal(result, true, 'result matches')
    t.ok(queue.paused, 'it should be paused')
    process.nextTick(() => queue.resume())
  })

  queue.push(24, function (err, result) {
    t.error(err, 'no error')
    t.equal(result, true, 'result matches')
    t.notOk(queue.paused, 'it should not be paused')
  })

  queue.pause()

  function worker (arg, cb) {
    t.equal(arg, expected.shift())
    process.nextTick(cb, null, true)
  }
})

test('altering concurrency', function (t) {
  t.plan(7)

  var queue = buildQueue(worker, 1)
  var count = 0

  queue.pause()

  queue.push(24, workDone)
  queue.push(24, workDone)

  queue.concurrency = 2

  queue.resume()

  t.equal(queue.running(), 2, '2 jobs running')

  function workDone (err, result) {
    t.error(err, 'no error')
    t.equal(result, true, 'result matches')
  }

  function worker (arg, cb) {
    t.equal(0, count, 'works in parallel')
    setImmediate(function () {
      count++
      cb(null, true)
    })
  }
})

test('idle()', function (t) {
  t.plan(12)

  var queue = buildQueue(worker, 1)

  t.ok(queue.idle(), 'queue is idle')

  queue.push(42, function (err, result) {
    t.error(err, 'no error')
    t.equal(result, true, 'result matches')
    t.notOk(queue.idle(), 'queue is not idle')
  })

  queue.push(42, function (err, result) {
    t.error(err, 'no error')
    t.equal(result, true, 'result matches')
    // it will go idle after executing this function
    setImmediate(function () {
      t.ok(queue.idle(), 'queue is now idle')
    })
  })

  t.notOk(queue.idle(), 'queue is not idle')

  function worker (arg, cb) {
    t.notOk(queue.idle(), 'queue is not idle')
    t.equal(arg, 42)
    setImmediate(cb, null, true)
  }
})

test('saturated', function (t) {
  t.plan(9)

  var queue = buildQueue(worker, 1)
  var preworked = 0
  var worked = 0

  queue.saturated = function () {
    t.pass('saturated')
    t.equal(preworked, 1, 'started 1 task')
    t.equal(worked, 0, 'worked zero task')
  }

  queue.push(42, done)
  queue.push(42, done)

  function done (err, result) {
    t.error(err, 'no error')
    t.equal(result, true, 'result matches')
  }

  function worker (arg, cb) {
    t.equal(arg, 42)
    preworked++
    setImmediate(function () {
      worked++
      cb(null, true)
    })
  }
})

test('length', function (t) {
  t.plan(7)

  var queue = buildQueue(worker, 1)

  t.equal(queue.length(), 0, 'nothing waiting')
  queue.push(42, done)
  t.equal(queue.length(), 0, 'nothing waiting')
  queue.push(42, done)
  t.equal(queue.length(), 1, 'one task waiting')
  queue.push(42, done)
  t.equal(queue.length(), 2, 'two tasks waiting')

  function done (err, result) {
    t.error(err, 'no error')
  }

  function worker (arg, cb) {
    setImmediate(function () {
      cb(null, true)
    })
  }
})

test('unshift', function (t) {
  t.plan(8)

  var queue = buildQueue(worker, 1)
  var expected = [1, 2, 3, 4]

  queue.push(1, done)
  queue.push(4, done)
  queue.unshift(3, done)
  queue.unshift(2, done)

  function done (err, result) {
    t.error(err, 'no error')
  }

  function worker (arg, cb) {
    t.equal(expected.shift(), arg, 'tasks come in order')
    setImmediate(function () {
      cb(null, true)
    })
  }
})

test('unshift && empty', function (t) {
  t.plan(2)

  var queue = buildQueue(worker, 1)
  var completed = false

  queue.pause()

  queue.empty = function () {
    t.notOk(completed, 'the task has not completed yet')
  }

  queue.unshift(1, done)

  queue.resume()

  function done (err, result) {
    completed = true
    t.error(err, 'no error')
  }

  function worker (arg, cb) {
    setImmediate(function () {
      cb(null, true)
    })
  }
})

test('push && empty', function (t) {
  t.plan(2)

  var queue = buildQueue(worker, 1)
  var completed = false

  queue.pause()

  queue.empty = function () {
    t.notOk(completed, 'the task has not completed yet')
  }

  queue.push(1, done)

  queue.resume()

  function done (err, result) {
    completed = true
    t.error(err, 'no error')
  }

  function worker (arg, cb) {
    setImmediate(function () {
      cb(null, true)
    })
  }
})

test('kill', function (t) {
  t.plan(5)

  var queue = buildQueue(worker, 1)
  var expected = [1]

  var predrain = queue.drain

  queue.drain = function drain () {
    t.fail('drain should never be called')
  }

  queue.push(1, done)
  queue.push(4, done)
  queue.unshift(3, done)
  queue.unshift(2, done)
  queue.kill()

  function done (err, result) {
    t.error(err, 'no error')
    setImmediate(function () {
      t.equal(queue.length(), 0, 'no queued tasks')
      t.equal(queue.running(), 0, 'no running tasks')
      t.equal(queue.drain, predrain, 'drain is back to default')
    })
  }

  function worker (arg, cb) {
    t.equal(expected.shift(), arg, 'tasks come in order')
    setImmediate(function () {
      cb(null, true)
    })
  }
})

test('killAndDrain', function (t) {
  t.plan(6)

  var queue = buildQueue(worker, 1)
  var expected = [1]

  var predrain = queue.drain

  queue.drain = function drain () {
    t.pass('drain has been called')
  }

  queue.push(1, done)
  queue.push(4, done)
  queue.unshift(3, done)
  queue.unshift(2, done)
  queue.killAndDrain()

  function done (err, result) {
    t.error(err, 'no error')
    setImmediate(function () {
      t.equal(queue.length(), 0, 'no queued tasks')
      t.equal(queue.running(), 0, 'no running tasks')
      t.equal(queue.drain, predrain, 'drain is back to default')
    })
  }

  function worker (arg, cb) {
    t.equal(expected.shift(), arg, 'tasks come in order')
    setImmediate(function () {
      cb(null, true)
    })
  }
})

test('pause && idle', function (t) {
  t.plan(11)

  var queue = buildQueue(worker, 1)
  var worked = false

  t.notOk(queue.paused, 'it should not be paused')
  t.ok(queue.idle(), 'should be idle')

  queue.pause()

  queue.push(42, function (err, result) {
    t.error(err, 'no error')
    t.equal(result, true, 'result matches')
  })

  t.notOk(worked, 'it should be paused')
  t.ok(queue.paused, 'it should be paused')
  t.notOk(queue.idle(), 'should not be idle')

  queue.resume()

  t.notOk(queue.paused, 'it should not be paused')
  t.notOk(queue.idle(), 'it should not be idle')

  function worker (arg, cb) {
    t.equal(arg, 42)
    worked = true
    process.nextTick(cb.bind(null, null, true))
    process.nextTick(function () {
      t.ok(queue.idle(), 'is should be idle')
    })
  }
})

test('push without cb', function (t) {
  t.plan(1)

  var queue = buildQueue(worker, 1)

  queue.push(42)

  function worker (arg, cb) {
    t.equal(arg, 42)
    cb()
  }
})

test('unshift without cb', function (t) {
  t.plan(1)

  var queue = buildQueue(worker, 1)

  queue.unshift(42)

  function worker (arg, cb) {
    t.equal(arg, 42)
    cb()
  }
})
