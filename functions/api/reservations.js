import { neon } from "@neondatabase/serverless";

const allowedTimes = new Set([
    "13:00", "13:30", "14:00", "14:30", "15:00", "15:30",
    "16:00", "16:30", "17:00", "17:30", "18:00", "18:30",
    "19:00", "19:30", "20:00", "20:30", "21:00", "21:30",
    "22:00", "22:30", "23:00", "23:30"
]);

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

const sendNotificationEmail = async (payload, env) => {
    if (!env.RESEND_API_KEY || !env.NOTIFY_EMAIL_TO || !env.NOTIFY_EMAIL_FROM) {
        return;
    }

    await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
            Authorization: `Bearer ${env.RESEND_API_KEY}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            from: env.NOTIFY_EMAIL_FROM,
            to: [env.NOTIFY_EMAIL_TO],
            reply_to: payload.email,
            subject: `Νέα κράτηση: ${payload.date} στις ${payload.time}`,
            html: `
                <h2>Νέα κράτηση</h2>
                <p><strong>Όνομα:</strong> ${payload.name}</p>
                <p><strong>Email:</strong> ${payload.email}</p>
                <p><strong>Τηλέφωνο:</strong> ${payload.phone}</p>
                <p><strong>Ημερομηνία:</strong> ${payload.date}</p>
                <p><strong>Ώρα:</strong> ${payload.time}</p>
                <p><strong>Άτομα:</strong> ${payload.guests}</p>
                <p><strong>Χώρος:</strong> ${payload.seating || "Χωρίς προτίμηση"}</p>
                <p><strong>Σχόλια:</strong> ${payload.message || "-"}</p>
            `
        })
    });
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

    try {
        const inserted = await sql`
            insert into reservations (
                name,
                email,
                phone,
                reservation_date,
                reservation_time,
                guests,
                seating,
                message
            )
            values (
                ${payload.name.trim()},
                ${payload.email.trim()},
                ${payload.phone.trim()},
                ${payload.date},
                ${payload.time},
                ${guests},
                ${payload.seating?.trim() || null},
                ${payload.message?.trim() || null}
            )
            on conflict (reservation_date, reservation_time) do nothing
            returning id, status, created_at
        `;

        if (!inserted[0]) {
            return json({ error: "Η συγκεκριμένη ημέρα και ώρα δεν είναι πλέον διαθέσιμη." }, 409);
        }

        context.waitUntil(sendNotificationEmail(payload, env).catch((error) => {
            console.error("notification email failed", error);
        }));

        return json({ ok: true, reservation: inserted[0] }, 200);
    } catch (error) {
        console.error("create-reservation failed", error);
        return json({ error: "Αποτυχία αποθήκευσης κράτησης στη βάση." }, 500);
    }
}
