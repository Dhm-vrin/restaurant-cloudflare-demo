const ADMIN_PASSWORD = "casa2026";
const ADMIN_SESSION_KEY = "casa-di-vento-admin";

const loginPanel = document.querySelector("#admin-login-panel");
const loginForm = document.querySelector("#admin-login-form");
const loginFeedback = document.querySelector("#admin-login-feedback");
const passwordInput = document.querySelector("#admin-password");
const adminApp = document.querySelector("#admin-app");
const logoutButton = document.querySelector("#admin-logout");
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

const setLoginFeedback = (message, type = "") => {
    if (!loginFeedback) {
        return;
    }

    loginFeedback.textContent = message;
    loginFeedback.className = "form-feedback";

    if (type) {
        loginFeedback.classList.add(type);
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

const renderActionButton = (label, status, tone) => `
    <button class="admin-action-tile tone-${tone}" data-action="${status}" type="button">
        <span class="admin-action-title">${label}</span>
        <span class="admin-action-subtitle">Αλλαγή status σε ${status}</span>
    </button>
`;

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
                ${renderActionButton("Confirm", "confirmed", "confirm")}
                ${renderActionButton("Pending", "pending", "pending")}
                ${renderActionButton("Cancel", "cancelled", "cancel")}
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
    const title = button.querySelector(".admin-action-title");
    const subtitle = button.querySelector(".admin-action-subtitle");
    const originalTitle = title?.textContent || button.textContent;
    const originalSubtitle = subtitle?.textContent || "";
    button.disabled = true;

    if (title) {
        title.textContent = "Αποθήκευση...";
    }

    if (subtitle) {
        subtitle.textContent = "Περίμενε λίγο";
    }

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

        if (title) {
            title.textContent = originalTitle;
        }

        if (subtitle) {
            subtitle.textContent = originalSubtitle;
        }
    }
};

const showAdminApp = () => {
    loginPanel.hidden = true;
    adminApp.hidden = false;
    loadReservations();
};

const logout = () => {
    sessionStorage.removeItem(ADMIN_SESSION_KEY);
    adminApp.hidden = true;
    loginPanel.hidden = false;
    passwordInput.value = "";
    setLoginFeedback("Έγινε αποσύνδεση.", "is-success");
};

refreshButton?.addEventListener("click", loadReservations);
dateFilter?.addEventListener("change", loadReservations);
statusFilter?.addEventListener("change", loadReservations);
logoutButton?.addEventListener("click", logout);

loginForm?.addEventListener("submit", (event) => {
    event.preventDefault();

    if ((passwordInput?.value || "").trim() !== ADMIN_PASSWORD) {
        setLoginFeedback("Λάθος κωδικός. Δοκίμασε ξανά.", "is-error");
        return;
    }

    sessionStorage.setItem(ADMIN_SESSION_KEY, "ok");
    setLoginFeedback("");
    showAdminApp();
});

listContainer?.addEventListener("click", async (event) => {
    const button = event.target.closest(".admin-action-tile");
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

if (sessionStorage.getItem(ADMIN_SESSION_KEY) === "ok") {
    showAdminApp();
}
