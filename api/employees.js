import { sql } from '../lib/db.js'
import { handler, HttpError } from '../lib/http.js'
import { purgeEmployeePhotos } from '../lib/purge.js'

function validate(body) {
  const roll_no = String(body.roll_no ?? '').trim()
  const name = String(body.name ?? '').trim()
  if (!/^\d{1,10}$/.test(roll_no)) throw new HttpError(400, 'Roll number must be digits only (max 10)')
  if (!name) throw new HttpError(400, 'Name is required')
  if (body.shift !== 'day' && body.shift !== 'night') throw new HttpError(400, 'Pick a shift')
  return { roll_no, name, shift: body.shift }
}

export default handler({
  GET: {
    role: 'admin',
    fn: async req => {
      if (req.query.id) {
        const [emp] = await sql`select id, roll_no, name, shift, active from employees where id = ${req.query.id}`
        if (!emp) throw new HttpError(404, 'Employee not found')
        return emp
      }
      return sql`
        select id, roll_no, name, shift, active
        from employees order by length(roll_no), roll_no`
    },
  },
  POST: {
    role: 'admin',
    fn: async req => {
      const e = validate(req.body ?? {})
      const [row] = await sql`
        insert into employees (roll_no, name, shift) values (${e.roll_no}, ${e.name}, ${e.shift})
        returning id`
      return row
    },
  },
  PUT: {
    role: 'admin',
    fn: async req => {
      const body = req.body ?? {}
      const e = validate(body)
      const [row] = await sql`
        update employees
        set roll_no = ${e.roll_no}, name = ${e.name}, shift = ${e.shift}, active = ${body.active !== false}
        where id = ${body.id} returning id`
      if (!row) throw new HttpError(404, 'Employee not found')
      return row
    },
  },
  DELETE: {
    role: 'admin',
    fn: async req => {
      await purgeEmployeePhotos(req.query.id)
      await sql`delete from employees where id = ${req.query.id}`
      return { ok: true }
    },
  },
})
