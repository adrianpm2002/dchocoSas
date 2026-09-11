import type { Db } from './db'
import { newId } from './db'
import { hashPassword, newSessionId, verifyPassword } from './password'

export type AuthUser = {
  id: string
  username: string
}

type UserRow = {
  id: string
  username: string
  password_hash: string
}

type SessionRow = {
  id: string
  usuario_id: string
  expira_en: string
  username: string
}

const SESSION_MS = 1000 * 60 * 60 * 24 * 30

export async function countUsers(db: Db): Promise<number> {
  const row = await db.first<{ n: number }>('SELECT COUNT(*) AS n FROM usuarios')
  return Number(row?.n ?? 0)
}

export async function findUserByUsername(db: Db, username: string): Promise<UserRow | null> {
  return db.first<UserRow>('SELECT id, username, password_hash FROM usuarios WHERE username = ?', [username])
}

export async function createUser(db: Db, username: string, password: string): Promise<AuthUser> {
  const id = newId()
  const passwordHash = await hashPassword(password)
  await db.run(
    'INSERT INTO usuarios (id, username, password_hash, creado_en) VALUES (?, ?, ?, ?)',
    [id, username, passwordHash, new Date().toISOString()],
  )
  return { id, username }
}

export async function createSession(db: Db, userId: string): Promise<{ id: string; expiresAt: Date }> {
  const id = newSessionId()
  const expiresAt = new Date(Date.now() + SESSION_MS)
  await db.run(
    'INSERT INTO sesiones (id, usuario_id, expira_en) VALUES (?, ?, ?)',
    [id, userId, expiresAt.toISOString()],
  )
  return { id, expiresAt }
}

export async function getSessionUser(db: Db, sessionId: string): Promise<AuthUser | null> {
  const row = await db.first<SessionRow>(
    `SELECT s.id, s.usuario_id, s.expira_en, u.username
     FROM sesiones s
     JOIN usuarios u ON u.id = s.usuario_id
     WHERE s.id = ?`,
    [sessionId],
  )
  if (!row) return null
  if (new Date(row.expira_en).getTime() <= Date.now()) {
    await db.run('DELETE FROM sesiones WHERE id = ?', [sessionId])
    return null
  }
  return { id: row.usuario_id, username: row.username }
}

export async function deleteSession(db: Db, sessionId: string): Promise<void> {
  await db.run('DELETE FROM sesiones WHERE id = ?', [sessionId])
}

export async function deleteExpiredSessions(db: Db): Promise<void> {
  await db.run('DELETE FROM sesiones WHERE expira_en <= ?', [new Date().toISOString()])
}

export async function authenticate(db: Db, username: string, password: string): Promise<AuthUser | null> {
  const user = await findUserByUsername(db, username)
  if (!user) {
    await hashPassword(password)
    return null
  }
  const ok = await verifyPassword(password, user.password_hash)
  return ok ? { id: user.id, username: user.username } : null
}
