import { del } from '@vercel/blob'
import { sql } from './db.js'

async function deleteBlobs(urls) {
  for (let i = 0; i < urls.length; i += 100) {
    await del(urls.slice(i, i + 100))
  }
}

// mode 'photos' keeps the attendance rows and just drops the pictures.
// mode 'all' deletes the rows too.
export async function purgeRange(from, to, mode) {
  const rows = await sql`
    select photo_url from attendance
    where shift_date between ${from} and ${to} and photo_url is not null`
  await deleteBlobs(rows.map(r => r.photo_url))

  let recordsDeleted = 0
  if (mode === 'all') {
    const deleted = await sql`delete from attendance where shift_date between ${from} and ${to} returning id`
    recordsDeleted = deleted.length
  } else {
    await sql`
      update attendance set photo_url = null, photo_bytes = null
      where shift_date between ${from} and ${to} and photo_url is not null`
  }
  return { photosDeleted: rows.length, recordsDeleted }
}

export async function purgeEmployeePhotos(employeeId) {
  const rows = await sql`select photo_url from attendance where employee_id = ${employeeId} and photo_url is not null`
  await deleteBlobs(rows.map(r => r.photo_url))
}
