// src/Helpers/dateTimeIST.js
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
