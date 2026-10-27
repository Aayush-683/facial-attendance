import { del, put } from '@vercel/blob'
import { sql } from '../lib/db.js'
import { handler, HttpError } from '../lib/http.js'

const MAX_PHOTO_BYTES = 500 * 1024

async function findEligible(roll) {
  const [emp] = await sql`
    select e.id, e.roll_no, e.name, e.shift,
      shift_date_for(e.shift)::text as shift_date,
      to_char(s.start_time, 'HH24:MI') as shift_start,
      to_char(s.end_time, 'HH24:MI') as shift_end
    from employees e join shifts s on s.name = e.shift
    where e.roll_no = ${roll} and e.active`
  if (!emp) throw new HttpError(404, 'Roll number not found', 'NOT_FOUND')
  if (!emp.shift_date) {
    throw new HttpError(403, 'Not your shift time', 'OUTSIDE_SHIFT', {
      name: emp.name, shiftStart: emp.shift_start, shiftEnd: emp.shift_end,
    })
  }
  const [already] = await sql`
    select to_char(a.marked_at at time zone st.timezone, 'HH24:MI') as time
    from attendance a cross join settings st
    where a.employee_id = ${emp.id} and a.shift_date = ${emp.shift_date}`
  if (already) {
    throw new HttpError(409, 'Already marked', 'ALREADY_MARKED', { name: emp.name, time: already.time })
  }
  return emp
}

export default handler({
  POST: {
    role: 'kiosk',
    fn: async req => {
      const { action, roll, photo, faceScore } = req.body ?? {}
      const rollNo = String(roll ?? '').trim()
      if (!rollNo) throw new HttpError(400, 'Enter roll number', 'BAD_INPUT')

      const emp = await findEligible(rollNo)
      if (action === 'check') return { name: emp.name, shift: emp.shift }
      if (action !== 'mark') throw new HttpError(400, 'Bad action')

      const match = /^data:image\/jpeg;base64,(.+)$/.exec(photo ?? '')
      if (!match) throw new HttpError(400, 'Photo missing', 'NO_PHOTO')
      const buffer = Buffer.from(match[1], 'base64')
      if (buffer.length > MAX_PHOTO_BYTES) throw new HttpError(413, 'Photo too large', 'BAD_INPUT')

      const blob = await put(`photos/${emp.shift_date}/${emp.roll_no}.jpg`, buffer, {
        access: 'public',
        contentType: 'image/jpeg',
        addRandomSuffix: true,
      })

      const score = Number.isFinite(faceScore) ? faceScore : null
      const [row] = await sql`
        insert into attendance (employee_id, shift_date, photo_url, photo_bytes, face_score)
        values (${emp.id}, ${emp.shift_date}, ${blob.url}, ${buffer.length}, ${score})
        on conflict (employee_id, shift_date) do nothing
        returning to_char(marked_at at time zone (select timezone from settings where id = 1), 'HH24:MI') as time`
      if (!row) {
        // two taps raced each other; keep the first one
        await del(blob.url)
        throw new HttpError(409, 'Already marked', 'ALREADY_MARKED', { name: emp.name })
      }
      return { name: emp.name, time: row.time }
    },
  },
})
