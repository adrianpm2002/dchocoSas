import fs from 'node:fs'
import path from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import type { Db, SqlParams } from './db'
import { SCHEMA } from './schema'

let cached: Db | null = null

export function createLocalSqlite(file = path.resolve('data/dchoco.sqlite')): Db {
  if (cached) return cached

  fs.mkdirSync(path.dirname(file), { recursive: true })
  const sqlite = new DatabaseSync(file)
  sqlite.exec('PRAGMA foreign_keys = ON')
  sqlite.exec('PRAGMA journal_mode = WAL')
  sqlite.exec(SCHEMA)

  const runSync = (sql: string, params: SqlParams = []) => {
    const stmt = sqlite.prepare(sql)
    params.length ? stmt.run(...params) : stmt.run()
  }

  cached = {
    async all<T>(sql: string, params: SqlParams = []) {
      const stmt = sqlite.prepare(sql)
      const rows = params.length ? stmt.all(...params) : stmt.all()
      return rows as T[]
    },
    async first<T>(sql: string, params: SqlParams = []) {
      const stmt = sqlite.prepare(sql)
      const row = params.length ? stmt.get(...params) : stmt.get()
      return (row as T | undefined) ?? null
    },
    async run(sql: string, params: SqlParams = []) {
      runSync(sql, params)
    },
    async exec(sql: string) {
      sqlite.exec(sql)
    },
    async batch(statements) {
      sqlite.exec('BEGIN')
      try {
        for (const item of statements) runSync(item.sql, item.params)
        sqlite.exec('COMMIT')
      } catch (error) {
        sqlite.exec('ROLLBACK')
        throw error
      }
    },
  }

  return cached
}
