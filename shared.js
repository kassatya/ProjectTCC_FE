// ===== SHARED UTILITIES - FUTSAL ADMIN =====

// ---- Base URL — ganti dengan URL Cloud Run GCP kamu ----
const API_URL = "https://GANTI-DENGAN-URL-CLOUD-RUN.us-central1.run.app/api/v1";

window.api = axios.create({ baseURL: API_URL });

// ---- Toast ----
function showToast(message, type = 'success', duration = 3000) {
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        document.body.appendChild(container);
    }
    const icons = { success: '✅', error: '❌', warning: '⚠️' };
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `<span>${icons[type] || ''}</span><span>${message}</span>`;
    container.appendChild(toast);
    setTimeout(() => {
        toast.style.animation = 'toastIn .3s ease reverse forwards';
        setTimeout(() => toast.remove(), 300);
    }, duration);
}
window.showToast = showToast;

// ---- Loading ----
function setLoading(active) {
    let overlay = document.getElementById('loading-overlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'loading-overlay';
        overlay.className = 'loading-overlay';
        overlay.innerHTML = '<div class="spinner"></div>';
        document.body.appendChild(overlay);
    }
    if (active) overlay.classList.add('active');
    else overlay.classList.remove('active');
}
window.setLoading = setLoading;

// ---- Modal helpers ----
function openModal(id) {
    document.getElementById(id)?.classList.add('active');
    document.body.style.overflow = 'hidden';
}
function closeModal(id) {
    document.getElementById(id)?.classList.remove('active');
    document.body.style.overflow = '';
}
window.openModal = openModal;
window.closeModal = closeModal;

// ---- Format currency ----
function formatRupiah(amount) {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount);
}
window.formatRupiah = formatRupiah;

// ---- Format date ----
function formatDate(dateStr) {
    const d = new Date(dateStr);
    return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
}
window.formatDate = formatDate;

// ---- Active nav ----
document.addEventListener('DOMContentLoaded', () => {
    const path = window.location.pathname.split('/').pop() || 'index.html';
    document.querySelectorAll('.nav-link').forEach(link => {
        const href = link.getAttribute('href') || '';
        if (href.includes(path) || (path === 'index.html' && href.includes('index'))) {
            link.classList.add('active');
        }
    });
});