import { neon } from "@neondatabase/serverless";

const allowedTimes = new Set([
    "13:00", "13:30", "14:00", "14:30", "15:00", "15:30",
    "16:00", "16:30", "17:00", "17:30", "18:00", "18:30",
    "19:00", "19:30", "20:00", "20:30", "21:00", "21:30",
    "22:00", "22:30", "23:00", "23:30"
]);

const activeStatuses = ["pending", "confirmed"];

const json = (payload, status = 200) => new Response(JSON.stringify(payload), {
    status,
    headers: {
        "Content-Type": "application/json"
    }
});

const parseGuests = (value) => {
    if (typeof value === "number") {
        return value;
    }

    if (typeof value !== "string") {
        return NaN;
    }

    if (value === "8+") {
        return 8;
    }

    return Number.parseInt(value, 10);
};

const getSlotCapacity = (env) => {
    const parsed = Number.parseInt(env.SLOT_CAPACITY ?? "1", 10);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : 1;
};

const escapeHtml = (value) => String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

const validatePayload = (payload) => {
    const requiredFields = ["name", "email", "phone", "date", "time", "guests"];

    for (const field of requiredFields) {
        if (!payload[field] || String(payload[field]).trim() === "") {
            return `${field} is required`;
        }
    }

    if (!allowedTimes.has(payload.time)) {
        return "time must be in 30 minute intervals";
    }

    const guests = parseGuests(payload.guests);
    if (!Number.isInteger(guests) || guests < 1) {
        return "guests must be a positive integer";
    }

    return null;
};

const sendNotificationEmail = async (payload, reservation, env) => {
    if (!env.RESEND_API_KEY || !env.NOTIFY_EMAIL_TO || !env.NOTIFY_EMAIL_FROM) {
        return;
    }

    const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
            Authorization: `Bearer ${env.RESEND_API_KEY}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            from: env.NOTIFY_EMAIL_FROM,
            to: [env.NOTIFY_EMAIL_TO],
            reply_to: payload.email,
            subject: `Νέα κράτηση | ${payload.date} στις ${payload.time}`,
            html: `
                <div style="font-family:Arial,sans-serif;background:#f7f0e4;padding:32px;color:#1e1a17;">
                    <div style="max-width:640px;margin:0 auto;background:#fff8f0;border-radius:20px;padding:32px;border:1px solid #eadbc9;">
                        <p style="margin:0 0 8px;font-size:12px;letter-spacing:0.18em;text-transform:uppercase;color:#2f5a41;">Casa di Vento</p>
                        <h1 style="margin:0 0 18px;font-size:30px;line-height:1.1;">Νέα online κράτηση</h1>
                        <p style="margin:0 0 24px;font-size:16px;color:#5d5248;">Μόλις δημιουργήθηκε νέα κράτηση από το site.</p>
                        <table style="width:100%;border-collapse:collapse;font-size:15px;">
                            <tr><td style="padding:10px 0;border-bottom:1px solid #eadbc9;"><strong>Κωδικός</strong></td><td style="padding:10px 0;border-bottom:1px solid #eadbc9;">#${escapeHtml(reservation.id)}</td></tr>
                            <tr><td style="padding:10px 0;border-bottom:1px solid #eadbc9;"><strong>Όνομα</strong></td><td style="padding:10px 0;border-bottom:1px solid #eadbc9;">${escapeHtml(payload.name)}</td></tr>
                            <tr><td style="padding:10px 0;border-bottom:1px solid #eadbc9;"><strong>Email</strong></td><td style="padding:10px 0;border-bottom:1px solid #eadbc9;">${escapeHtml(payload.email)}</td></tr>
                            <tr><td style="padding:10px 0;border-bottom:1px solid #eadbc9;"><strong>Τηλέφωνο</strong></td><td style="padding:10px 0;border-bottom:1px solid #eadbc9;">${escapeHtml(payload.phone)}</td></tr>
                            <tr><td style="padding:10px 0;border-bottom:1px solid #eadbc9;"><strong>Ημερομηνία</strong></td><td style="padding:10px 0;border-bottom:1px solid #eadbc9;">${escapeHtml(payload.date)}</td></tr>
                            <tr><td style="padding:10px 0;border-bottom:1px solid #eadbc9;"><strong>Ώρα</strong></td><td style="padding:10px 0;border-bottom:1px solid #eadbc9;">${escapeHtml(payload.time)}</td></tr>
                            <tr><td style="padding:10px 0;border-bottom:1px solid #eadbc9;"><strong>Άτομα</strong></td><td style="padding:10px 0;border-bottom:1px solid #eadbc9;">${escapeHtml(payload.guests)}</td></tr>
                            <tr><td style="padding:10px 0;border-bottom:1px solid #eadbc9;"><strong>Χώρος</strong></td><td style="padding:10px 0;border-bottom:1px solid #eadbc9;">${escapeHtml(payload.seating || "Χωρίς προτίμηση")}</td></tr>
                            <tr><td style="padding:10px 0;"><strong>Σχόλια</strong></td><td style="padding:10px 0;">${escapeHtml(payload.message || "-")}</td></tr>
                        </table>
                    </div>
                </div>
            `
        })
    });

    if (!response.ok) {
        const body = await response.text();
        throw new Error(`Resend failed: ${response.status} ${body}`);
    }
};

export async function onRequestPost(context) {
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

    const validationError = validatePayload(payload);
    if (validationError) {
        return json({ error: validationError }, 400);
    }

    const sql = neon(env.DATABASE_URL);
    const guests = parseGuests(payload.guests);
    const capacity = getSlotCapacity(env);

    try {
        const inserted = await sql`
            with slot_check as (
                select count(*)::int as reserved_count
                from reservations
                where reservation_date = ${payload.date}
                  and reservation_time = ${payload.time}
                  and status = any(${activeStatuses})
            )
            insert into reservations (
                name,
                email,
                phone,
                reservation_date,
                reservation_time,
                guests,
                seating,
                message,
                status
            )
            select
                ${payload.name.trim()},
                ${payload.email.trim()},
                ${payload.phone.trim()},
                ${payload.date},
                ${payload.time},
                ${guests},
                ${payload.seating?.trim() || null},
                ${payload.message?.trim() || null},
                'pending'
            from slot_check
            where reserved_count < ${capacity}
            returning id, status, created_at
        `;

        if (!inserted[0]) {
            return json({ error: "Η συγκεκριμένη ημέρα και ώρα δεν είναι πλέον διαθέσιμη." }, 409);
        }

        context.waitUntil(sendNotificationEmail(payload, inserted[0], env).catch((error) => {
            console.error("notification email failed", error);
        }));

        return json({ ok: true, reservation: inserted[0], slotCapacity: capacity }, 200);
    } catch (error) {
        console.error("create-reservation failed", error);
        return json({ error: "Αποτυχία αποθήκευσης κράτησης στη βάση." }, 500);
    }
}
