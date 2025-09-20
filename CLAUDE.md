# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Testing
- `npm test` - Run linting and unit tests with 100% coverage requirements
- `npm run unit` - Run unit tests only with coverage check (100% lines, branches, functions)
- `npm run coverage` - Generate HTML coverage reports
- `npm run legacy` - Run tests on legacy Node.js versions
- `npm run typescript` - Type check TypeScript declarations

### Code Quality
- `npm run lint` - Run ESLint with neostandard configuration
- Tests and TypeScript checks run automatically on pre-commit hooks

### Test Files
- `test/test.js` - Main callback API test suite
- `test/promise.js` - Promise API test suite
- `test/example.ts` - TypeScript usage examples

## Architecture Overview

This is a high-performance, in-memory work queue library with both callback and Promise APIs.

### Core Implementation (`queue.js`)
- **Main factory function**: `fastqueue(context, worker, concurrency)` creates callback-based queues
- **Promise wrapper**: `queueAsPromised()` wraps the callback queue with Promise APIs
- **Task management**: Uses linked list with head/tail pointers for O(1) push/unshift operations
- **Memory optimization**: Uses `reusify` for object pooling to minimize garbage collection
- **Concurrency control**: Maintains running task count against concurrency limit

### Key Components
- **Task objects**: Reusable task containers with context, callback, and error handling
- **Queue state**: Tracks paused/running state, concurrency limits, and drain/empty callbacks
- **Error handling**: Global error handlers plus per-task error callbacks
- **Context binding**: Support for `this` context in worker functions

### APIs Provided
1. **Callback API**: Traditional Node.js callback style (`queue.push(task, done)`)
2. **Promise API**: Modern async/await compatible (`await queue.push(task)`)
3. **TypeScript**: Full type definitions in `index.d.ts`

### Performance Characteristics
- Optimized for high throughput (faster than async.queue and neoAsync.queue)
- Zero-overhead object reuse via reusify
- Minimal function call overhead
- Efficient queue operations using linked list

## Module Structure
- Main entry: `queue.js` (CommonJS module)
- TypeScript definitions: `index.d.ts`
- Examples: `example.js`, `example.mjs`
- Benchmarks: `bench.js`