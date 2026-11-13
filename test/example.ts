import * as fastq from '../'
import { promise as queueAsPromised } from '../'

// Basic example

const queue = fastq(worker, 1)

queue.push('world', (err, result) => {
  if (err) throw err
  console.log('the result is', result)
})

queue.push('push without cb')

queue.concurrency

queue.drain()

queue.empty = () => undefined

console.log('the queue tasks are', queue.getQueue())

queue.idle()

queue.kill()

queue.killAndDrain()

queue.length

queue.pause()

queue.resume()

queue.running()

queue.saturated = () => undefined

queue.unshift('world', (err, result) => {
  if (err) throw err
  console.log('the result is', result)
})

queue.unshift('unshift without cb')

function worker(task: any, cb: fastq.done) {
  cb(null, 'hello ' + task)
}

// Generics example

interface GenericsContext {
  base: number;
}

const genericsQueue = fastq<GenericsContext, number, string>({ base: 6 }, genericsWorker, 1)

genericsQueue.push(7, (err, done) => {
  if (err) throw err
  console.log('the result is', done)
})

genericsQueue.unshift(7, (err, done) => {
  if (err) throw err
  console.log('the result is', done)
})

function genericsWorker(this: GenericsContext, task: number, cb: fastq.done<string>) {
  cb(null, 'the meaning of life is ' + (this.base * task))
}

const queue2 = queueAsPromised(asyncWorker, 1)

async function asyncWorker(task: any) {
  return 'hello ' + task
}

async function run () {
  await queue.push(42)
  await queue.unshift(42)
}

run()

// Global error handlers also receive successful completions.

const errorHandler: fastq.errorHandler<number> = (err, task) => {
  if (err) console.log(err.message)
  console.log(task.toFixed())
}

errorHandler(null, 7)
errorHandler(new Error('failed'), 7)

genericsQueue.error(errorHandler)

const genericsPromiseQueue = queueAsPromised(async (task: number) => task.toString(), 1)
genericsPromiseQueue.error(errorHandler)

// @ts-expect-error Global handlers must accept null on successful completion.
genericsQueue.error((err: Error, task: number) => console.log(err.message, task))
// @ts-expect-error Promise queues have the same nullable error contract.
genericsPromiseQueue.error((err: Error, task: number) => console.log(err.message, task))
// @ts-expect-error The handler task type must match the queue task type.
genericsQueue.error((err: Error | null, task: string) => console.log(err, task))
// @ts-expect-error Promise queues preserve the handler task type too.
genericsPromiseQueue.error((err: Error | null, task: string) => console.log(err, task))
