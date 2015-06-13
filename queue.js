'use strict'

function fastqueue (worker, limit) {
  var head = new Task(release)
  var tail = head
  var queue = null
  var self = {
    push: push
  }

  return self

  function push (value, done) {
    var current = next()

    current.value = value
    current.callback = done

    if (limit === 0) {
      if (queue) {
        queue.next = current
      } else {
        queue = current
      }
    } else {
      limit--
      worker(current.value, current.worked)
    }
  }

  function next () {
    var task = head

    if (task.next) {
      head = task.next
    } else {
      head = new Task(release)
      tail = head
    }

    task.next = null

    return task
  }

  function release (holder) {
    tail.next = holder
    tail = holder
    //released()
    var next = queue
    if (next) {
      queue = next.next
      next.next = null
      worker(next.value, next.worked)
    } else {
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
    release(self)
    callback(err, result)
  }
}

module.exports = fastqueue
