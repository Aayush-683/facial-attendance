import { sql } from '../lib/db.js'
import { handler, HttpError } from '../lib/http.js'

const isTime = s => /^\d{2}:\d{2}$/.test(s ?? '')
const isInt = (n, min, max) => Number.isInteger(n) && n >= min && n <= max

async function load() {
  const [settings] = await sql`
    select timezone, photo_retention_days, record_retention_days from settings where id = 1`
  const shifts = await sql`
    select name, to_char(start_time, 'HH24:MI') as start_time, to_char(end_time, 'HH24:MI') as end_time, early_minutes
    from shifts order by name`
  return { settings, shifts }
}

export default handler({
  GET: { role: 'admin', fn: load },
  PUT: {
    role: 'admin',
    fn: async req => {
      const { settings: s, shifts } = req.body ?? {}

      if (!isInt(s?.photo_retention_days, 1, 3650) || !isInt(s?.record_retention_days, 1, 3650)) {
        throw new HttpError(400, 'Retention must be 1 to 3650 days')
      }
      if (s.photo_retention_days > s.record_retention_days) {
        throw new HttpError(400, 'Photos cannot be kept longer than records')
      }
      try {
        if (typeof s.timezone !== 'string' || !s.timezone) throw new Error()
        await sql`select now() at time zone ${s.timezone}`
      } catch {
        throw new HttpError(400, 'Unknown timezone, use a name like Asia/Kolkata')
      }
      for (const sh of shifts ?? []) {
        if (!isTime(sh.start_time) || !isTime(sh.end_time) || !isInt(sh.early_minutes, 0, 240)) {
          throw new HttpError(400, `Check the ${sh.name} shift times`)
        }
        if (sh.start_time === sh.end_time) throw new HttpError(400, `${sh.name} shift start and end are the same`)
      }

      await sql`
        update settings set timezone = ${s.timezone},
          photo_retention_days = ${s.photo_retention_days},
          record_retention_days = ${s.record_retention_days}
        where id = 1`
      for (const sh of shifts ?? []) {
        await sql`
          update shifts set start_time = ${sh.start_time}, end_time = ${sh.end_time}, early_minutes = ${sh.early_minutes}
          where name = ${sh.name}`
      }
      return load()
    },
  },
})
