declare module 'node:fs' {
  export function readFileSync(path: string, encoding: 'utf8'): string
  export function readdirSync(path: string): string[]
}

declare module 'node:sqlite' {
  export class StatementSync {
    get(...params: unknown[]): unknown
    all(...params: unknown[]): unknown[]
    run(...params: unknown[]): { changes: number | bigint; lastInsertRowid: number | bigint }
  }
  export class DatabaseSync {
    constructor(location: string)
    exec(sql: string): void
    prepare(sql: string): StatementSync
  }
}

declare module 'node:test' {
  export function describe(name: string, fn: () => void | Promise<void>): void
  export function it(name: string, fn: () => void | Promise<void>): void
}

declare module 'node:assert/strict' {
  const assert: {
    equal(actual: unknown, expected: unknown, message?: string): void
    ok(value: unknown, message?: string): asserts value
    match(value: string, regExp: RegExp, message?: string): void
    doesNotMatch(value: string, regExp: RegExp, message?: string): void
  }
  export default assert
}

declare module 'node:child_process' {
  export function execFileSync(file: string, args: string[], options?: { stdio?: string }): unknown
}

declare module 'node:crypto' {
  export function randomUUID(): string
}

declare const process: {
  argv: string[]
  exit(code?: number): never
}

interface ImportMeta {
  url: string
}
