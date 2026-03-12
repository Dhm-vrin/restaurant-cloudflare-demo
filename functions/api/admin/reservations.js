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
    const status = url.searchParams.get("status");
    const date = url.searchParams.get("date");

    try {
        const sql = neon(env.DATABASE_URL);
        const reservations = await sql`
            select
                id,
                name,
                email,
                phone,
                reservation_date,
                reservation_time,
                guests,
                seating,
                message,
                status,
                created_at
            from reservations
            where (${status || null}::text is null or status = ${status || null})
              and (${date || null}::date is null or reservation_date = ${date || null})
            order by reservation_date desc, reservation_time desc, id desc
            limit 200
        `;

        const summary = await sql`
            select
                status,
                count(*)::int as total
            from reservations
            where (${status || null}::text is null or status = ${status || null})
              and (${date || null}::date is null or reservation_date = ${date || null})
            group by status
            order by status asc
        `;

        return json({
            reservations,
            summary,
            allowedStatuses: ["pending", "confirmed", "cancelled"]
        });
    } catch (error) {
        console.error("admin list failed", error);
        return json({ error: "Αποτυχία φόρτωσης κρατήσεων." }, 500);
    }
}
