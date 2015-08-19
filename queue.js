'use strict'

function fastqueue (context, worker, limit) {
  if (typeof context === 'function') {
    limit = worker
    worker = context
    context = null
  }

  var cacheHead = new Task(context, release)
  var cacheTail = cacheHead
  var queueHead = null
  var queueTail = null
  var self = {
    push: push
  }

  return self

  function push (value, done) {
    var current = next()

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

  function next () {
    var task = cacheHead

    if (task.next) {
      cacheHead = task.next
    } else {
      cacheHead = new Task(context, release)
      cacheTail = cacheHead
    }

    task.next = null

    return task
  }

  function release (holder) {
    cacheTail.next = holder
    cacheTail = holder
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

function Task (context, release) {
  this.value = null
  this.callback = noop
  this.next = null

  var self = this

  this.worked = function worked (err, result) {
    var callback = self.callback
    self.value = null
    self.callback = noop
    callback.call(context, err, result)
    release(self)
  }
}

module.exports = fastqueue
