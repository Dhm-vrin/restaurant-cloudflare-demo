import { neon } from "@neondatabase/serverless";

const activeStatuses = ["pending", "confirmed"];

const json = (payload, status = 200) => new Response(JSON.stringify(payload), {
    status,
    headers: {
        "Content-Type": "application/json"
    }
});

const getSlotCapacity = (env) => {
    const parsed = Number.parseInt(env.SLOT_CAPACITY ?? "1", 10);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : 1;
};

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
            select reservation_time::text as time, count(*)::int as reserved_count
            from reservations
            where reservation_date = ${date}
              and status = any(${activeStatuses})
            group by reservation_time
            order by reservation_time asc
        `;

        const capacity = getSlotCapacity(env);
        const reservedTimes = rows
            .filter((row) => row.reserved_count >= capacity)
            .map((row) => String(row.time).slice(0, 5));

        return json({
            date,
            slotCapacity: capacity,
            reservedTimes,
            slotCounts: rows.map((row) => ({
                time: String(row.time).slice(0, 5),
                reservedCount: row.reserved_count
            }))
        });
    } catch (error) {
        console.error("get-availability failed", error);
        return json({ error: "Αποτυχία φόρτωσης διαθεσιμότητας." }, 500);
    }
}
