declare function fastq<C, T = any>(context: C, worker: fastq.worker<C, T>, concurrency: number): fastq.queue<T>
declare function fastq<C, T = any>(worker: fastq.worker<C, T>, concurrency: number): fastq.queue<T>

declare namespace fastq {
  type worker<C, T = any> = (this: C, arg: T, cb: () => void) => void
  type done = (err: Error, result: any) => void

  interface queue<T = any> {
    push(task: T, done: done): void
    unshift(task: T, done: done): void
    pause(): any
    resume(): any
    idle(): boolean
    length(): number
    getQueue(): T[]
    kill(): any
    killAndDrain(): any
    concurrency: number
    drain(): any
    empty: () => void
    saturated: () => void
  }
}

export = fastq