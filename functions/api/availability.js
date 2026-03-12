import { neon } from "@neondatabase/serverless";

const json = (payload, status = 200) => new Response(JSON.stringify(payload), {
    status,
    headers: {
        "Content-Type": "application/json"
    }
});

export async function onRequestGet(context) {
    const { request, env } = context;

    if (!env.DATABASE_URL) {
        return json({ error: "DATABASE_URL is not configured" }, 500);
    }

    const url = new URL(request.url);
    const date = url.searchParams.get("date");

    if (!date) {
        return json({ error: "date query parameter is required" }, 400);
    }

    try {
        const sql = neon(env.DATABASE_URL);
        const rows = await sql`
            select reservation_time::text as time
            from reservations
            where reservation_date = ${date}
            order by reservation_time asc
        `;

        return json({
            date,
            reservedTimes: rows.map((row) => String(row.time).slice(0, 5))
        });
    } catch (error) {
        console.error("get-availability failed", error);
        return json({ error: "Αποτυχία φόρτωσης διαθεσιμότητας." }, 500);
    }
}
