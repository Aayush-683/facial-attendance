import { sql } from '../lib/db.js'
import { purgeRange } from '../lib/purge.js'

// Called daily by Vercel Cron (see vercel.json). Vercel sends the CRON_SECRET as a bearer token.
export default async function cleanup(req, res) {
  if (!process.env.CRON_SECRET || req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' })
  }
  try {
    const [cut] = await sql`
      select ((now() at time zone timezone)::date - photo_retention_days)::text as photos_before,
        ((now() at time zone timezone)::date - record_retention_days)::text as records_before
      from settings where id = 1`
    const dayBefore = d => new Date(Date.parse(d) - 86400000).toISOString().slice(0, 10)

    const photos = await purgeRange('1900-01-01', dayBefore(cut.photos_before), 'photos')
    const records = await purgeRange('1900-01-01', dayBefore(cut.records_before), 'all')
    res.status(200).json({ photos, records })
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: 'Cleanup failed' })
  }
}
