const menuToggle = document.querySelector(".menu-toggle");
const navLinks = document.querySelector(".nav-links");
const navScrim = document.querySelector(".nav-scrim");
const reservationDate = document.querySelector("#reservation-date");
const reservationForm = document.querySelector("#reservation-form");
const reservationSummary = document.querySelector("#reservation-summary");
const formFeedback = document.querySelector("#form-feedback");
const timeSelect = reservationForm?.querySelector('select[name="time"]');

if (menuToggle && navLinks) {
    const syncMenuState = (isOpen) => {
        navLinks.classList.toggle("open", isOpen);
        document.body.classList.toggle("nav-open", isOpen);
        menuToggle.setAttribute("aria-expanded", String(isOpen));

        if (navScrim) {
            navScrim.hidden = !isOpen;
            navScrim.classList.toggle("visible", isOpen);
        }
    };

    menuToggle.addEventListener("click", () => {
        syncMenuState(!navLinks.classList.contains("open"));
    });

    navScrim?.addEventListener("click", () => {
        syncMenuState(false);
    });

    navLinks.querySelectorAll("a").forEach((link) => {
        link.addEventListener("click", () => {
            syncMenuState(false);
        });
    });

    window.addEventListener("resize", () => {
        if (window.innerWidth > 760) {
            syncMenuState(false);
        }
    });
}

if (reservationDate) {
    const today = new Date();
    const localDate = new Date(today.getTime() - today.getTimezoneOffset() * 60000)
        .toISOString()
        .split("T")[0];
    reservationDate.min = localDate;
}

const seatingLabels = {
    indoor: "Εσωτερικός χώρος",
    patio: "Αυλή",
    "chef-table": "Chef's table"
};

const updateSummary = () => {
    if (!reservationForm || !reservationSummary) {
        return;
    }

    const formData = new FormData(reservationForm);
    const fields = ["name", "date", "time", "guests", "seating"];
    const hasAnyValue = fields.some((field) => formData.get(field));

    if (!hasAnyValue) {
        reservationSummary.textContent = "Συμπλήρωσε τη φόρμα και έλεγξε τα στοιχεία πριν την αποστολή.";
        return;
    }

    const name = formData.get("name") || "επισκέπτης";
    const date = formData.get("date") || "ημερομηνία προς επιλογή";
    const time = formData.get("time") || "ώρα προς επιλογή";
    const guests = formData.get("guests") || "χωρίς επιλογή ατόμων";
    const seating = seatingLabels[formData.get("seating")] || "χωρίς προτίμηση";

    reservationSummary.innerHTML = `
        <strong>Περίληψη κράτησης</strong><br>
        ${name} για ${guests} στις ${time}, ${date}.<br>
        Προτίμηση χώρου: ${seating}.
    `;
};

const setFeedback = (message, type = "") => {
    if (!formFeedback) {
        return;
    }

    formFeedback.textContent = message;
    formFeedback.className = "form-feedback";

    if (type) {
        formFeedback.classList.add(type);
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

const resetTimeOptions = () => {
    if (!timeSelect) {
        return;
    }

    [...timeSelect.options].forEach((option, index) => {
        if (index === 0) {
            option.disabled = false;
            option.textContent = "Επιλογή ώρας";
            return;
        }

        option.disabled = false;
        option.textContent = option.value;
    });
};

const markUnavailableTimes = (reservedTimes) => {
    if (!timeSelect) {
        return;
    }

    resetTimeOptions();
    const reservedSet = new Set(reservedTimes);

    [...timeSelect.options].forEach((option) => {
        if (!option.value) {
            return;
        }

        if (reservedSet.has(option.value)) {
            option.disabled = true;
            option.textContent = `${option.value} • unavailable`;

            if (timeSelect.value === option.value) {
                timeSelect.value = "";
            }
        }
    });
};

const loadAvailability = async (date) => {
    if (!date || !timeSelect) {
        resetTimeOptions();
        return;
    }

    try {
        const response = await fetch(`/api/availability?date=${encodeURIComponent(date)}`);
        const result = await parseResponsePayload(response);

        if (!response.ok) {
            throw new Error(result.error || "Αποτυχία φόρτωσης διαθεσιμότητας.");
        }

        markUnavailableTimes(result.reservedTimes || []);
    } catch (error) {
        resetTimeOptions();
        setFeedback(error.message || "Δεν φορτώθηκε η διαθεσιμότητα.", "is-error");
    }
};

const goToThanks = () => {
    window.setTimeout(() => {
        window.location.href = "thanks.html";
    }, 500);
};

if (reservationForm) {
    reservationForm.addEventListener("input", updateSummary);
    updateSummary();

    reservationDate?.addEventListener("change", async () => {
        await loadAvailability(reservationDate.value);
        updateSummary();
    });

    if (reservationDate.value) {
        loadAvailability(reservationDate.value);
    }

    reservationForm.addEventListener("submit", async (event) => {
        event.preventDefault();

        if (!reservationForm.reportValidity()) {
            setFeedback("Συμπλήρωσε σωστά τα υποχρεωτικά πεδία πριν συνεχίσεις.", "is-error");
            return;
        }

        const selectedOption = timeSelect?.selectedOptions?.[0];
        if (selectedOption?.disabled) {
            setFeedback("Η ώρα που διάλεξες δεν είναι διαθέσιμη. Επίλεξε άλλη.", "is-error");
            return;
        }

        setFeedback("Η κράτησή σου καταχωρείται...", "is-success");

        const submitButton = reservationForm.querySelector(".submit-button");
        if (submitButton) {
            submitButton.disabled = true;
            submitButton.textContent = "Αποθήκευση...";
        }

        const formData = new FormData(reservationForm);
        const payload = Object.fromEntries(formData.entries());
        let shouldRedirect = false;

        try {
            const response = await fetch("/api/reservations", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(payload)
            });

            const result = await parseResponsePayload(response);

            if (response.status === 409) {
                setFeedback(result.error || "Η ώρα αυτή δεν είναι διαθέσιμη.", "is-error");
                await loadAvailability(payload.date);
                return;
            }

            if (!response.ok) {
                throw new Error(result.error || "Αποτυχία αποθήκευσης κράτησης.");
            }

            await loadAvailability(payload.date);
            shouldRedirect = true;
        } catch (error) {
            console.warn("Reservation request failed", error);
            setFeedback(error.message || "Αποτυχία αποθήκευσης κράτησης.", "is-error");
            return;
        } finally {
            if (submitButton) {
                submitButton.disabled = false;
                submitButton.textContent = "Αποθήκευση κράτησης";
            }
        }

        if (!shouldRedirect) {
            return;
        }

        reservationForm.reset();
        await loadAvailability(payload.date);
        updateSummary();
        setFeedback("Η φόρμα ολοκληρώθηκε. Μεταφορά στη σελίδα επιβεβαίωσης...", "is-success");
        goToThanks();
    });
}

