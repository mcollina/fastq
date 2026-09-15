# Security Policy

## Supported Versions

Use this section to tell people about which versions of your project are
currently being supported with security updates.

| Version | Supported          |
| ------- | ------------------ |
| 1.x     | :white_check_mark: |
| < 1.0   | :x:                |

## Threat Model

fastq is an in-process work queue. It does not create a security boundary
between code running in the same process.

### Trust Boundaries

The queue owner, workers, completion callbacks, and error handlers are trusted.
Code with a queue reference can inspect queued values, stop processing, discard
work, and change concurrency. Malicious use of that access is outside this
threat model.

Task values may originate from untrusted users, but fastq treats them as opaque
values. Applications and workers are responsible for validating task data and
authorizing the operations it requests.

### Security Properties

fastq aims to:

- avoid exposing data from a previously pooled task to another task;
- never interpret a task value as code;
- preserve queue and object-pool integrity during documented API usage; and
- avoid cross-task data corruption or disclosure.

Concurrency, ordering, callback, and drain behavior are correctness guarantees.
A violation is security-relevant only when an attacker can trigger it and cross
an application security boundary.

### Outside the Threat Model

The following are application responsibilities rather than security guarantees
provided by fastq:

- admission control and memory limits for unbounded task submission;
- workers completing reliably and invoking callback functions exactly once;
- durability, transactional behavior, and exactly-once processing;
- synchronization or atomicity of external resources; and
- protection from code that already has direct access to the queue.

### Demonstrating Security Impact

A security report should demonstrate:

1. the attacker's capabilities and required access;
2. a path from attacker-controlled input to the reported behavior through
   documented API usage;
3. the application security boundary or authorization policy being bypassed;
4. an unauthorized confidentiality, integrity, or availability impact; and
5. a minimal reproduction whose expectations match the documented queue and
   cancellation semantics.

Correctness failures without an attacker-controlled path or unauthorized impact
should be reported as regular bugs.

## Reporting a Vulnerability

Please report all vulnerabilities at [https://github.com/mcollina/fastq/security](https://github.com/mcollina/fastq/security).
