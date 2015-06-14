'use strict'

function fastqueue (worker, limit) {
  var cacheHead = new Task(release)
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
      worker(current.value, current.worked)
    }
  }

  function next () {
    var task = cacheHead

    if (task.next) {
      cacheHead = task.next
    } else {
      cacheHead = new Task(release)
      cacheTail = cacheHead
    }

    task.next = null

    return task
  }

  function release (holder) {
    cacheTail.next = holder
    cacheTail = holder
    //released()
    var next = queueHead
    if (next) {
      queueHead = next.next
      next.next = null
      worker(next.value, next.worked)
    } else {
      queueTail = null
      limit++
    }
  }
}

function noop () {}

function Task (release) {
  this.value = null
  this.callback = noop
  this.next = null

  var self = this

  this.worked = function worked (err, result) {
    var callback = self.callback
    self.value = null
    self.callback = noop
    callback(err, result)
    release(self)
  }
}

module.exports = fastqueue
