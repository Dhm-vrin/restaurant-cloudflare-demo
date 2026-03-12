const summaryContainer = document.querySelector("#admin-summary");
const listContainer = document.querySelector("#admin-list");
const dateFilter = document.querySelector("#admin-date-filter");
const statusFilter = document.querySelector("#admin-status-filter");
const refreshButton = document.querySelector("#admin-refresh");
const feedback = document.querySelector("#admin-feedback");

const setFeedback = (message, type = "") => {
    if (!feedback) {
        return;
    }

    feedback.textContent = message;
    feedback.className = "form-feedback";

    if (type) {
        feedback.classList.add(type);
    }
};

const parseResponsePayload = async (response) => {
    const raw = await response.text();

    if (!raw) {
        return {};
    }

    try {
        return JSON.parse(raw);
    } catch {
        return { raw };
    }
};

const formatDate = (value) => {
    if (!value) {
        return "-";
    }

    return new Intl.DateTimeFormat("el-GR", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit"
    }).format(new Date(value));
};

const formatDateTime = (value) => {
    if (!value) {
        return "-";
    }

    return new Intl.DateTimeFormat("el-GR", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit"
    }).format(new Date(value));
};

const renderSummary = (summary = []) => {
    if (!summaryContainer) {
        return;
    }

    const defaults = {
        pending: 0,
        confirmed: 0,
        cancelled: 0
    };

    summary.forEach((entry) => {
        defaults[entry.status] = entry.total;
    });

    summaryContainer.innerHTML = Object.entries(defaults).map(([status, total]) => `
        <article class="admin-stat">
            <span class="admin-stat-label">${status}</span>
            <strong class="admin-stat-value">${total}</strong>
        </article>
    `).join("");
};

const renderReservations = (reservations = []) => {
    if (!listContainer) {
        return;
    }

    if (!reservations.length) {
        listContainer.innerHTML = `
            <article class="reservation-panel admin-empty">
                Δεν υπάρχουν κρατήσεις με αυτά τα φίλτρα.
            </article>
        `;
        return;
    }

    listContainer.innerHTML = reservations.map((reservation) => `
        <article class="reservation-panel admin-card" data-id="${reservation.id}">
            <div class="admin-card-top">
                <div>
                    <p class="admin-card-id">#${reservation.id}</p>
                    <h3>${reservation.name}</h3>
                    <p class="admin-card-meta">${formatDate(reservation.reservation_date)} • ${String(reservation.reservation_time).slice(0, 5)} • ${reservation.guests} άτομα</p>
                </div>
                <span class="admin-status status-${reservation.status}">${reservation.status}</span>
            </div>
            <div class="admin-card-grid">
                <p><strong>Email:</strong> ${reservation.email}</p>
                <p><strong>Τηλέφωνο:</strong> ${reservation.phone}</p>
                <p><strong>Χώρος:</strong> ${reservation.seating || "Χωρίς προτίμηση"}</p>
                <p><strong>Δημιουργία:</strong> ${formatDateTime(reservation.created_at)}</p>
            </div>
            <p class="admin-message"><strong>Σχόλια:</strong> ${reservation.message || "-"}</p>
            <div class="admin-card-actions">
                <button class="button primary admin-action" data-action="confirmed" type="button">Confirm</button>
                <button class="button secondary admin-action admin-secondary" data-action="pending" type="button">Pending</button>
                <button class="button secondary admin-action admin-cancel" data-action="cancelled" type="button">Cancel</button>
            </div>
        </article>
    `).join("");
};

const loadReservations = async () => {
    const params = new URLSearchParams();

    if (dateFilter?.value) {
        params.set("date", dateFilter.value);
    }

    if (statusFilter?.value) {
        params.set("status", statusFilter.value);
    }

    const url = params.toString() ? `/api/admin/reservations?${params}` : "/api/admin/reservations";
    setFeedback("Γίνεται φόρτωση κρατήσεων...", "is-success");

    try {
        const response = await fetch(url);
        const result = await parseResponsePayload(response);

        if (!response.ok) {
            throw new Error(result.error || "Αποτυχία φόρτωσης κρατήσεων.");
        }

        renderSummary(result.summary || []);
        renderReservations(result.reservations || []);
        setFeedback("Οι κρατήσεις ενημερώθηκαν.", "is-success");
    } catch (error) {
        setFeedback(error.message || "Αποτυχία φόρτωσης κρατήσεων.", "is-error");
    }
};

const updateReservationStatus = async (id, status, button) => {
    const originalLabel = button.textContent;
    button.disabled = true;
    button.textContent = "Αποθήκευση...";

    try {
        const response = await fetch("/api/admin/reservation", {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ id, status })
        });

        const result = await parseResponsePayload(response);

        if (!response.ok) {
            throw new Error(result.error || "Αποτυχία ενημέρωσης κράτησης.");
        }

        setFeedback(`Η κράτηση #${id} ενημερώθηκε σε ${status}.`, "is-success");
        await loadReservations();
    } catch (error) {
        setFeedback(error.message || "Αποτυχία ενημέρωσης κράτησης.", "is-error");
    } finally {
        button.disabled = false;
        button.textContent = originalLabel;
    }
};

refreshButton?.addEventListener("click", loadReservations);
dateFilter?.addEventListener("change", loadReservations);
statusFilter?.addEventListener("change", loadReservations);

listContainer?.addEventListener("click", async (event) => {
    const button = event.target.closest(".admin-action");
    if (!button) {
        return;
    }

    const card = button.closest(".admin-card");
    const id = Number.parseInt(card?.dataset.id || "", 10);
    const status = button.dataset.action;

    if (!Number.isInteger(id) || !status) {
        return;
    }

    await updateReservationStatus(id, status, button);
});

loadReservations();
