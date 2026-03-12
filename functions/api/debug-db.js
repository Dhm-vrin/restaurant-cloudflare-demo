import { neon } from "@neondatabase/serverless";

const json = (payload, status = 200) =>
    new Response(JSON.stringify(payload), {
        status,
        headers: {
            "Content-Type": "application/json"
        }
    });

export async function onRequestGet(context) {
    const { env } = context;

    if (!env.DATABASE_URL) {
        return json({ error: "DATABASE_URL is not configured" }, 500);
    }

    try {
        const sql = neon(env.DATABASE_URL);
        const database = await sql`select current_database() as name`;
        const user = await sql`select current_user as name`;
        const count = await sql`select count(*)::int as count from reservations`;
        const latest = await sql`
            select id, reservation_date, reservation_time, created_at
            from reservations
            order by created_at desc
            limit 5
        `;

        return json({
            database: database[0]?.name ?? null,
            user: user[0]?.name ?? null,
            count: count[0]?.count ?? 0,
            latest
        });
    } catch (error) {
        return json(
            {
                error: "Debug query failed",
                message: error instanceof Error ? error.message : String(error)
            },
            500
        );
    }
}
