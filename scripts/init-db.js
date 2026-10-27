import { readFileSync } from 'node:fs'
import { neon } from '@neondatabase/serverless'

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL missing. Run: vercel env pull .env.local')
  process.exit(1)
}

const sql = neon(process.env.DATABASE_URL)
const schema = readFileSync(new URL('../db/schema.sql', import.meta.url), 'utf8')
const statements = schema.split(/^-- ;;\r?$/m).map(s => s.trim()).filter(Boolean)

for (const stmt of statements) {
  await sql.query(stmt)
}
console.log(`Schema applied (${statements.length} statements).`)
