import { sql } from '../lib/db.js'
import { handler, HttpError, isDate } from '../lib/http.js'

async function today() {
  const [r] = await sql`select (now() at time zone timezone)::date::text as d from settings where id = 1`
  return r.d
}

async function employeeMonth(id, month) {
  if (!/^\d{4}-\d{2}$/.test(month ?? '')) month = (await today()).slice(0, 7)
  const [emp] = await sql`select id, roll_no, name, shift, active from employees where id = ${id}`
  if (!emp) throw new HttpError(404, 'Employee not found')
  const from = `${month}-01`
  const days = await sql`
    select a.shift_date::text as date, a.photo_url, a.face_score,
      to_char(a.marked_at at time zone s.timezone, 'HH24:MI') as time
    from attendance a cross join settings s
    where a.employee_id = ${id}
      and a.shift_date >= ${from}::date
      and a.shift_date < ${from}::date + interval '1 month'
    order by a.shift_date`
  return { employee: emp, month, today: await today(), days }
}

async function dayAndPeriod(date, period) {
  const unit = period === 'month' ? 'month' : 'week'
  const [range] = await sql`
    select f::text as "from", t::text as "to", today::text as today,
      greatest(0, least(t, today) - f + 1)::int as "daysElapsed"
    from (
      select date_trunc(${unit}, ${date}::date)::date as f,
        (date_trunc(${unit}, ${date}::date) + ${'1 ' + unit}::interval - interval '1 day')::date as t,
        (now() at time zone (select timezone from settings where id = 1))::date as today
    ) x`

  const day = await sql`
    select e.id, e.roll_no, e.name, e.shift, a.photo_url, a.face_score,
      to_char(a.marked_at at time zone s.timezone, 'HH24:MI') as time
    from employees e cross join settings s
    left join attendance a on a.employee_id = e.id and a.shift_date = ${date}
    where e.active or a.id is not null
    order by e.shift, length(e.roll_no), e.roll_no`

  const perEmployee = await sql`
    select e.id, e.roll_no, e.name, e.shift, count(a.id)::int as present
    from employees e
    left join attendance a on a.employee_id = e.id and a.shift_date between ${range.from} and ${range.to}
    where e.active
    group by e.id
    order by e.shift, length(e.roll_no), e.roll_no`

  const daily = await sql`
    select g.d::date::text as date, count(a.id)::int as present
    from generate_series(${range.from}::date, ${range.to}::date, interval '1 day') g(d)
    left join attendance a on a.shift_date = g.d::date
    group by g.d order by g.d`

  return { date, period: unit, range, day, perEmployee, daily }
}

export default handler({
  GET: {
    role: 'admin',
    fn: async req => {
      const { employee, month, date, period } = req.query
      if (employee) return employeeMonth(employee, month)
      return dayAndPeriod(isDate(date) ? date : await today(), period)
    },
  },
})
