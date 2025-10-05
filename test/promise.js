'use strict'

const test = require('tape')
const buildQueue = require('../').promise
const { promisify } = require('util')
const sleep = promisify(setTimeout)
const immediate = promisify(setImmediate)

test('concurrency', function (t) {
  t.plan(2)
  t.throws(buildQueue.bind(null, worker, 0))
  t.doesNotThrow(buildQueue.bind(null, worker, 1))

  async function worker (arg) {
    return true
  }
})

test('worker execution', async function (t) {
  const queue = buildQueue(worker, 1)

  const result = await queue.push(42)

  t.equal(result, true, 'result matches')

  async function worker (arg) {
    t.equal(arg, 42)
    return true
  }
})

test('limit', async function (t) {
  const queue = buildQueue(worker, 1)

  const [res1, res2] = await Promise.all([queue.push(10), queue.push(0)])
  t.equal(res1, 10, 'the result matches')
  t.equal(res2, 0, 'the result matches')

  async function worker (arg) {
    await sleep(arg)
    return arg
  }
})

test('multiple executions', async function (t) {
  const queue = buildQueue(worker, 1)
  const toExec = [1, 2, 3, 4, 5]
  const expected = ['a', 'b', 'c', 'd', 'e']
  let count = 0

  await Promise.all(toExec.map(async function (task, i) {
    const result = await queue.push(task)
    t.equal(result, expected[i], 'the result matches')
  }))

  async function worker (arg) {
    t.equal(arg, toExec[count], 'arg matches')
    return expected[count++]
  }
})

test('drained', async function (t) {
  const queue = buildQueue(worker, 2)

  const toExec = new Array(10).fill(10)
  let count = 0

  async function worker (arg) {
    await sleep(arg)
    count++
  }

  toExec.forEach(function (i) {
    queue.push(i)
  })

  await queue.drained()

  t.equal(count, toExec.length)

  toExec.forEach(function (i) {
    queue.push(i)
  })

  await queue.drained()

  t.equal(count, toExec.length * 2)
})

test('drained with exception should not throw', async function (t) {
  const queue = buildQueue(worker, 2)

  const toExec = new Array(10).fill(10)

  async function worker () {
    throw new Error('foo')
  }

  toExec.forEach(function (i) {
    queue.push(i)
  })

  await queue.drained()
})

test('drained with drain function', async function (t) {
  let drainCalled = false
  const queue = buildQueue(worker, 2)

  queue.drain = function () {
    drainCalled = true
  }

  const toExec = new Array(10).fill(10)
  let count = 0

  async function worker (arg) {
    await sleep(arg)
    count++
  }

  toExec.forEach(function () {
    queue.push()
  })

  await queue.drained()

  t.equal(count, toExec.length)
  t.equal(drainCalled, true)
})

test('drained while idle should resolve', async function (t) {
  const queue = buildQueue(worker, 2)

  async function worker (arg) {
    await sleep(arg)
  }

  await queue.drained()
})

test('drained while idle should not call the drain function', async function (t) {
  let drainCalled = false
  const queue = buildQueue(worker, 2)

  queue.drain = function () {
    drainCalled = true
  }

  async function worker (arg) {
    await sleep(arg)
  }

  await queue.drained()

  t.equal(drainCalled, false)
})

test('set this', async function (t) {
  t.plan(1)
  const that = {}
  const queue = buildQueue(that, worker, 1)

  await queue.push(42)

  async function worker (arg) {
    t.equal(this, that, 'this matches')
  }
})

test('unshift', async function (t) {
  const queue = buildQueue(worker, 1)
  const expected = [1, 2, 3, 4]

  await Promise.all([
    queue.push(1),
    queue.push(4),
    queue.unshift(3),
    queue.unshift(2)
  ])

  t.is(expected.length, 0)

  async function worker (arg) {
    t.equal(expected.shift(), arg, 'tasks come in order')
  }
})

test('push with worker throwing error', async function (t) {
  t.plan(5)
  const q = buildQueue(async function (task, cb) {
    throw new Error('test error')
  }, 1)
  q.error(function (err, task) {
    t.ok(err instanceof Error, 'global error handler should catch the error')
    t.match(err.message, /test error/, 'error message should be "test error"')
    t.equal(task, 42, 'The task executed should be passed')
  })
  try {
    await q.push(42)
  } catch (err) {
    t.ok(err instanceof Error, 'push callback should catch the error')
    t.match(err.message, /test error/, 'error message should be "test error"')
  }
})

test('unshift with worker throwing error', async function (t) {
  t.plan(2)
  const q = buildQueue(async function (task, cb) {
    throw new Error('test error')
  }, 1)
  try {
    await q.unshift(42)
  } catch (err) {
    t.ok(err instanceof Error, 'push callback should catch the error')
    t.match(err.message, /test error/, 'error message should be "test error"')
  }
})

test('no unhandledRejection (push)', async function (t) {
  function handleRejection () {
    t.fail('unhandledRejection')
  }
  process.once('unhandledRejection', handleRejection)
  const q = buildQueue(async function (task, cb) {
    throw new Error('test error')
  }, 1)

  q.push(42)

  await immediate()
  process.removeListener('unhandledRejection', handleRejection)
})

test('no unhandledRejection (unshift)', async function (t) {
  function handleRejection () {
    t.fail('unhandledRejection')
  }
  process.once('unhandledRejection', handleRejection)
  const q = buildQueue(async function (task, cb) {
    throw new Error('test error')
  }, 1)

  q.unshift(42)

  await immediate()
  process.removeListener('unhandledRejection', handleRejection)
})

test('drained should resolve after async tasks complete', async function (t) {
  const logs = []

  async function processTask () {
    await new Promise(resolve => setTimeout(resolve, 0))
    logs.push('processed')
  }

  const queue = buildQueue(processTask, 1)
  queue.drain = () => logs.push('called drain')

  queue.drained().then(() => logs.push('drained promise resolved'))

  await Promise.all([
    queue.push(),
    queue.push(),
    queue.push()
  ])

  t.deepEqual(logs, [
    'processed',
    'processed',
    'processed',
    'called drain',
    'drained promise resolved'
  ], 'events happened in correct order')
})

test('drained should handle undefined drain function', async function (t) {
  const queue = buildQueue(worker, 1)

  async function worker (arg) {
    await sleep(10)
    return arg
  }

  queue.drain = undefined
  queue.push(1)
  await queue.drained()

  t.pass('drained resolved successfully with undefined drain')
})

test('kill() should reject pending promises', async function (t) {
  t.plan(4)

  const queue = buildQueue(worker, 1)

  // Start one task to fill the concurrency
  const runningPromise = queue.push('running')

  // Queue several tasks that will be pending
  const pendingPromise1 = queue.push('pending1')
  queue.push('pending2') // These will be tested in future iterations
  queue.push('pending3') // These will be tested in future iterations

  // Verify tasks are queued
  t.equal(queue.length(), 3, 'should have 3 queued tasks')

  // Kill the queue
  queue.kill()

  // Verify queue is cleared
  t.equal(queue.length(), 0, 'queue should be empty after kill')

  // Running task should complete normally (only queued tasks are aborted)
  try {
    const result = await runningPromise
    t.equal(result, 'running-result', 'running task should complete normally')
  } catch (err) {
    t.fail('running task should not be rejected')
  }

  // Pending promises should be rejected
  try {
    await pendingPromise1
    t.fail('pending promise 1 should have been rejected')
  } catch (err) {
    t.ok(err instanceof Error && err.message === 'fastq aborted', 'pending promise 1 should be rejected with abort error')
  }

  async function worker (arg) {
    if (arg === 'running') {
      await sleep(50) // Simulate some work
      return 'running-result'
    }
    return `${arg}-result`
  }
})

test('killAndDrain() should reject pending promises', async function (t) {
  t.plan(4)

  const queue = buildQueue(worker, 1)

  // Start one task to fill the concurrency
  const runningPromise = queue.push('running')

  // Queue several tasks that will be pending
  const pendingPromise1 = queue.push('pending1')
  queue.push('pending2') // Will be tested in future iterations

  // Verify tasks are queued
  t.equal(queue.length(), 2, 'should have 2 queued tasks')

  // Kill and drain the queue
  queue.killAndDrain()

  // Verify queue is cleared
  t.equal(queue.length(), 0, 'queue should be empty after killAndDrain')

  // Running task should complete normally (only queued tasks are aborted)
  try {
    const result = await runningPromise
    t.equal(result, 'running-result', 'running task should complete normally')
  } catch (err) {
    t.fail('running task should not be rejected')
  }

  // Pending promises should be rejected
  try {
    await pendingPromise1
    t.fail('pending promise 1 should have been rejected')
  } catch (err) {
    t.ok(err instanceof Error && err.message === 'fastq aborted', 'pending promise 1 should be rejected with abort error')
  }

  async function worker (arg) {
    if (arg === 'running') {
      await sleep(50) // Simulate some work
      return 'running-result'
    }
    return `${arg}-result`
  }
})

test('unshift() with kill() should also reject promises', async function (t) {
  t.plan(4)

  const queue = buildQueue(worker, 1)

  // Start one task to fill the concurrency
  const runningPromise = queue.push('running')

  // Unshift several tasks that will be pending
  const pendingPromise1 = queue.unshift('pending1')

  // Verify tasks are queued
  t.equal(queue.length(), 1, 'should have 1 queued task')

  // Kill the queue
  queue.kill()

  // Verify queue is cleared
  t.equal(queue.length(), 0, 'queue should be empty after kill')

  // Running task should complete normally (only queued tasks are aborted)
  try {
    const result = await runningPromise
    t.equal(result, 'running-result', 'running task should complete normally')
  } catch (err) {
    t.fail('running task should not be rejected')
  }

  // Pending promises should be rejected
  try {
    await pendingPromise1
    t.fail('pending promise 1 should have been rejected')
  } catch (err) {
    t.ok(err instanceof Error && err.message === 'fastq aborted', 'pending promise 1 should be rejected with abort error')
  }

  async function worker (arg) {
    if (arg === 'running') {
      await sleep(50) // Simulate some work
      return 'running-result'
    }
    return `${arg}-result`
  }
})

test('normal promise resolution should work correctly', async function (t) {
  t.plan(1)

  const queue = buildQueue(worker, 2)

  // Test normal promise resolution for both push and unshift
  const results = await Promise.all([
    queue.push('task1'),
    queue.unshift('task2'),
    queue.push('task3')
  ])

  t.deepEqual(results, ['task1-result', 'task2-result', 'task3-result'], 'all promises should resolve with correct values')

  async function worker (arg) {
    return `${arg}-result`
  }
})

test('promise resolution with errors should clean up correctly', async function (t) {
  t.plan(4)

  const queue = buildQueue(worker, 1)

  // Test that error handling in push works
  try {
    await queue.push('error')
    t.fail('should have thrown an error')
  } catch (err) {
    t.equal(err.message, 'test error', 'push should throw the expected error')
  }

  // Test that error handling in unshift works
  try {
    await queue.unshift('error')
    t.fail('should have thrown an error')
  } catch (err) {
    t.equal(err.message, 'test error', 'unshift should throw the expected error')
  }

  // Test that normal execution still works after error
  const result = await queue.push('success')
  t.equal(result, 'success-result', 'should work normally after error')

  // Test unshift normal execution
  const unshiftResult = await queue.unshift('unshift-success')
  t.equal(unshiftResult, 'unshift-success-result', 'unshift should work normally')

  async function worker (arg) {
    if (arg === 'error') {
      throw new Error('test error')
    }
    return `${arg}-result`
  }
})

test('promise abort methods coverage', async function (t) {
  t.plan(2)

  const queue1 = buildQueue(async function (arg) {
    return arg * 2
  }, 1)

  const queue2 = buildQueue(async function (arg) {
    return arg * 2
  }, 1)

  // Add some tasks to ensure methods are called
  queue1.push(1)
  queue1.push(2)

  queue2.push(1)
  queue2.push(2)

  // Call the methods to get coverage
  queue1.kill()
  queue2.killAndDrain()

  t.pass('kill method called')
  t.pass('killAndDrain method called')
})
