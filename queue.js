'use strict'

var reusify = require('reusify')

function fastqueue (context, worker, limit) {
  if (typeof context === 'function') {
    limit = worker
    worker = context
    context = null
  }

  var cache = reusify(Task)
  var queueHead = null
  var queueTail = null
  var self = {
    push: push
  }

  return self

  function push (value, done) {
    var current = cache.get()

    current.context = context
    current.release = release
    current.value = value
    current.callback = done

    if (limit === 0) {
      if (queueTail) {
        queueTail.next = current
        queueTail = current
      } else {
        queueHead = current
        queueTail = current
      }
    } else {
      limit--
      worker.call(context, current.value, current.worked)
    }
  }

  function release (holder) {
    cache.release(holder)
    var next = queueHead
    if (next) {
      if (queueTail === queueHead) {
        queueTail = null
      }
      queueHead = next.next
      next.next = null
      worker.call(context, next.value, next.worked)
    } else {
      limit++
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
