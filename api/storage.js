import { sql } from '../lib/db.js'
import { handler, HttpError, isDate } from '../lib/http.js'
import { purgeRange } from '../lib/purge.js'

const MB = 1024 * 1024

export default handler({
  GET: {
    role: 'admin',
    fn: async () => {
      const [db] = await sql`select pg_database_size(current_database())::bigint as bytes`
      const [totals] = await sql`
        select count(*)::int as records,
          count(photo_url)::int as photos,
          coalesce(sum(photo_bytes), 0)::bigint as photo_bytes,
          min(shift_date)::text as oldest,
          max(shift_date)::text as newest
        from attendance`
      const months = await sql`
        select to_char(shift_date, 'YYYY-MM') as month,
          count(*)::int as records,
          count(photo_url)::int as photos,
          coalesce(sum(photo_bytes), 0)::bigint as photo_bytes
        from attendance group by 1 order by 1 desc`
      const [retention] = await sql`select photo_retention_days, record_retention_days from settings where id = 1`

      return {
        db: { used: Number(db.bytes), limit: Number(process.env.DB_LIMIT_MB || 512) * MB },
        photos: { used: Number(totals.photo_bytes), limit: Number(process.env.BLOB_LIMIT_MB || 1024) * MB },
        totals: { ...totals, photo_bytes: Number(totals.photo_bytes) },
        months: months.map(m => ({ ...m, photo_bytes: Number(m.photo_bytes) })),
        retention,
      }
    },
  },
  POST: {
    role: 'admin',
    fn: async req => {
      const { from, to, mode } = req.body ?? {}
      if (!isDate(from) || !isDate(to) || from > to) throw new HttpError(400, 'Pick a valid date range')
      if (mode !== 'photos' && mode !== 'all') throw new HttpError(400, 'Pick what to delete')
      return purgeRange(from, to, mode)
    },
  },
})
