const ITERATIONS = 100_000

function bytesToHex(bytes) {
  return Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('')
}

async function hashPassword(password) {
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits'])
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt, iterations: ITERATIONS },
    key,
    256,
  )
  return `${bytesToHex(salt)}:${bytesToHex(new Uint8Array(bits))}`
}

const password = process.argv[2]
if (!password) {
  console.error('Uso: node scripts/hash-password.mjs "tu-contraseña"')
  process.exit(1)
}

console.log(await hashPassword(password))
