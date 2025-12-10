// src/Utils/confirmDelete.js
export function confirmDelete(message = "Are you sure you want to delete this item?") {
    return window.confirm(message);
}
