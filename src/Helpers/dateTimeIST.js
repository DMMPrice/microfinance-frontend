/**
 * IST helpers (Asia/Kolkata)
 * Keep all IST logic here so the app stays consistent everywhere.
 */

export function getISTNowDate() {
    // Using timeZone in Intl gives correct date parts in IST.
    // For most UI logic we only need formatted output.
    return new Date();
}

export function getISTWeekday(date = new Date()) {
    // Returns "Monday", "Tuesday", ...
    return new Intl.DateTimeFormat("en-US", {
        weekday: "long",
        timeZone: "Asia/Kolkata",
    }).format(date);
}

/**
 * Convert GMT/UTC datetime string to IST by adding 5:30 hours
 * @param {string|Date} dateInput - GMT/UTC date string or Date object
 * @returns {Date} - Date object adjusted to IST
 */
export function convertToIST(dateInput) {
    if (!dateInput) return null;

    const date = typeof dateInput === "string" ? new Date(dateInput) : dateInput;

    // Add 5 hours and 30 minutes (in milliseconds)
    const IST_OFFSET = 5.5 * 60 * 60 * 1000; // 5.5 hours in milliseconds
    return new Date(date.getTime() + IST_OFFSET);
}

/**
 * Format GMT/UTC datetime to IST string
 * @param {string|Date} dateInput - GMT/UTC date string or Date object
 * @param {boolean} includeTime - Whether to include time (default: true)
 * @returns {string} - Formatted IST datetime string
 */
export function formatToIST(dateInput, includeTime = true) {
    if (!dateInput) return "-";

    const istDate = convertToIST(dateInput);

    if (includeTime) {
        return istDate.toLocaleString("en-IN", {
            timeZone: "Asia/Kolkata",
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
            hour12: true,
        });
    } else {
        return istDate.toLocaleDateString("en-IN", {
            timeZone: "Asia/Kolkata",
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
        });
    }
}

/**
 * Get current IST datetime string for datetime-local input
 * @returns {string} - YYYY-MM-DDTHH:MM format in IST
 */
export function getISTDateTimeLocal() {
    const now = new Date();
    const istDate = convertToIST(now);

    // Format to YYYY-MM-DDTHH:MM for datetime-local input
    const year = istDate.getFullYear();
    const month = String(istDate.getMonth() + 1).padStart(2, "0");
    const day = String(istDate.getDate()).padStart(2, "0");
    const hours = String(istDate.getHours()).padStart(2, "0");
    const minutes = String(istDate.getMinutes()).padStart(2, "0");

    return `${year}-${month}-${day}T${hours}:${minutes}`;
}
/**
 * Get today's date in IST as YYYY-MM-DD
 */
export function getISTTodayISO(date = new Date()) {
    // Use formatToParts to avoid timezone drift
    const parts = new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Kolkata",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    }).formatToParts(date);

    const get = (type) => parts.find((p) => p.type === type)?.value || "";
    const y = get("year");
    const m = get("month");
    const d = get("day");
    return `${y}-${m}-${d}`;
}

/**
 * Get current month range in IST.
 * @returns {{from_date: string, to_date: string}} - YYYY-MM-DD for first and last day of this month in IST
 */
export function getISTCurrentMonthRange(date = new Date()) {
    // Get IST year/month from the provided date
    const parts = new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Kolkata",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    }).formatToParts(date);

    const get = (type) => parts.find((p) => p.type === type)?.value || "";
    const year = Number(get("year"));
    const month2 = get("month"); // 01-12
    const monthIndex = Number(month2) - 1;

    // Last day count for the month (safe with JS Date)
    const lastDay = new Date(year, monthIndex + 1, 0).getDate();

    const from_date = `${year}-${month2}-01`;
    const to_date = `${year}-${month2}-${String(lastDay).padStart(2, "0")}`;

    return {from_date, to_date};
}
