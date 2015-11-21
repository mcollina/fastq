'use strict'

var reusify = require('reusify')

function fastqueue (context, worker, concurrency) {
  if (typeof context === 'function') {
    concurrency = worker
    worker = context
    context = null
  }

  var cache = reusify(Task)
  var queueHead = null
  var queueTail = null
  var paused = false
  var _running = 0

  var self = {
    push: push,
    drain: noop,
    pause: pause,
    concurrency: concurrency,
    running: running,
    resume: resume
  }

  return self

  function running () {
    return _running
  }

  function pause () {
    paused = true
  }

  function resume () {
    if (!paused) return
    paused = false
    for (var i = 0; i < self.concurrency; i++) {
      _running++
      release()
    }
  }

  function push (value, done) {
    var current = cache.get()

    current.context = context
    current.release = release
    current.value = value
    current.callback = done

    if (_running === self.concurrency || paused) {
      if (queueTail) {
        queueTail.next = current
        queueTail = current
      } else {
        queueHead = current
        queueTail = current
      }
    } else {
      _running++
      worker.call(context, current.value, current.worked)
    }
  }

  function release (holder) {
    if (holder) {
      cache.release(holder)
    }
    var next = queueHead
    if (next) {
      if (!paused) {
        if (queueTail === queueHead) {
          queueTail = null
        }
        queueHead = next.next
        next.next = null
        worker.call(context, next.value, next.worked)
      } else {
        _running--
      }
    } else if (--_running === 0) {
      self.drain()
    }
  }
}

function noop () {}

function Task () {
  this.value = null
  this.callback = noop
  this.next = null
  this.release = noop
  this.context = null

  var self = this

  this.worked = function worked (err, result) {
    var callback = self.callback
    self.value = null
    self.callback = noop
    callback.call(self.context, err, result)
    self.release(self)
  }
}

module.exports = fastqueue
