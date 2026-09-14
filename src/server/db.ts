import { SCHEMA } from './schema'

export type SqlValue = string | number | null
export type SqlParams = SqlValue[]

export interface Db {
  all<T = Record<string, unknown>>(sql: string, params?: SqlParams): Promise<T[]>
  first<T = Record<string, unknown>>(sql: string, params?: SqlParams): Promise<T | null>
  run(sql: string, params?: SqlParams): Promise<void>
  exec(sql: string): Promise<void>
  batch(statements: { sql: string; params?: SqlParams }[]): Promise<void>
}

export interface D1PreparedStatement {
  bind(...values: SqlValue[]): D1PreparedStatement
  all<T = Record<string, unknown>>(): Promise<{ results: T[] }>
  first<T = Record<string, unknown>>(): Promise<T | null>
  run(): Promise<unknown>
}

export interface D1Database {
  prepare(query: string): D1PreparedStatement
  exec(query: string): Promise<unknown>
  batch<T = unknown>(statements: D1PreparedStatement[]): Promise<T[]>
}

const ensured = new WeakMap<Db, Promise<void>>()

function schemaStatements(): { sql: string }[] {
  return SCHEMA.split(';')
    .map(part => part.trim())
    .filter(Boolean)
    .map(sql => ({ sql }))
}

export function ensureSchema(db: Db): Promise<void> {
  let pending = ensured.get(db)
  if (!pending) {
    pending = db.batch(schemaStatements())
    ensured.set(db, pending)
  }
  return pending
}

export function createD1(d1: D1Database): Db {
  return {
    async all<T>(sql: string, params: SqlParams = []) {
      const stmt = params.length ? d1.prepare(sql).bind(...params) : d1.prepare(sql)
      const result = await stmt.all<T>()
      return result.results
    },
    async first<T>(sql: string, params: SqlParams = []) {
      const stmt = params.length ? d1.prepare(sql).bind(...params) : d1.prepare(sql)
      return stmt.first<T>()
    },
    async run(sql: string, params: SqlParams = []) {
      const stmt = params.length ? d1.prepare(sql).bind(...params) : d1.prepare(sql)
      await stmt.run()
    },
    async exec(sql: string) {
      await d1.exec(sql)
    },
    async batch(statements) {
      await d1.batch(
        statements.map(item =>
          item.params?.length ? d1.prepare(item.sql).bind(...item.params) : d1.prepare(item.sql),
        ),
      )
    },
  }
}

export function newId(): string {
  return crypto.randomUUID()
}
