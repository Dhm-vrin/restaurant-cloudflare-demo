import { neon } from "@neondatabase/serverless";

const allowedStatuses = new Set(["pending", "confirmed", "cancelled"]);

const json = (payload, status = 200) => new Response(JSON.stringify(payload), {
    status,
    headers: {
        "Content-Type": "application/json"
    }
});

export async function onRequestPatch(context) {
    const { request, env } = context;

    if (!env.DATABASE_URL) {
        return json({ error: "DATABASE_URL is not configured" }, 500);
    }

    let payload;

    try {
        payload = await request.json();
    } catch {
        return json({ error: "Invalid JSON body" }, 400);
    }

    const id = Number.parseInt(payload.id, 10);
    const status = String(payload.status || "").trim().toLowerCase();

    if (!Number.isInteger(id) || id < 1) {
        return json({ error: "Valid reservation id is required" }, 400);
    }

    if (!allowedStatuses.has(status)) {
        return json({ error: "Valid status is required" }, 400);
    }

    try {
        const sql = neon(env.DATABASE_URL);
        const updated = await sql`
            update reservations
            set status = ${status}
            where id = ${id}
            returning id, status, reservation_date, reservation_time
        `;

        if (!updated[0]) {
            return json({ error: "Η κράτηση δεν βρέθηκε." }, 404);
        }

        return json({ ok: true, reservation: updated[0] });
    } catch (error) {
        console.error("admin update failed", error);
        return json({ error: "Αποτυχία ενημέρωσης κράτησης." }, 500);
    }
}
