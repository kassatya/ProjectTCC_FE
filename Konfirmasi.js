// ===== KONFIRMASI DP - konfirmasi-dp.js =====

let lapanganList = [];
let allPendingBookings = [];
let filteredBookings = [];
let selectedBookingForDP = null;
let konfirmasiHariIni = 0;

// ===== INIT =====
document.addEventListener('DOMContentLoaded', async () => {
    await loadLapanganList();
    await loadPendingBookings();

    document.querySelectorAll('.modal-overlay').forEach(overlay => {
        overlay.addEventListener('click', e => {
            if (e.target === overlay) {
                overlay.classList.remove('active');
                document.body.style.overflow = '';
            }
        });
    });

    // DP amount progress preview
    document.getElementById('modalJumlahDP').addEventListener('input', updateDPProgress);
});

// ===== LOAD LAPANGAN =====
async function loadLapanganList() {
    try {
        const res = await window.api.get('/lapangan');
        lapanganList = res.data?.data || res.data || [];
        populateLapanganFilter();
    } catch (err) {
        showToast('Gagal memuat lapangan.', 'error');
    }
}

function populateLapanganFilter() {
    const sel = document.getElementById('filterLapangan');
    lapanganList.forEach(l => {
        const opt = document.createElement('option');
        opt.value = l.id || l._id;
        opt.textContent = l.nama_lapangan || l.name;
        sel.appendChild(opt);
    });
}

// ===== LOAD PENDING BOOKINGS =====
async function loadPendingBookings() {
    setLoading(true);
    allPendingBookings = [];

    try {
        // Fetch bookings for each lapangan for a range of dates (today-7 to today+60)
        const today = new Date();
        const dateRange = [];
        for (let i = -7; i <= 60; i++) {
            const d = new Date(today);
            d.setDate(today.getDate() + i);
            dateRange.push(formatDateISO(d));
        }

        const idsToFetch = lapanganList.map(l => l.id || l._id);
        if (!idsToFetch.length) {
            renderTable([]);
            setLoading(false);
            return;
        }

        // Batch fetch – do lapangan x date in parallel but limit to avoid flooding
        const batchSize = 10;
        const tasks = [];
        idsToFetch.forEach(lapanganId => {
            dateRange.forEach(tanggal => {
                tasks.push({ lapanganId, tanggal });
            });
        });

        // Process in batches
        for (let i = 0; i < tasks.length; i += batchSize) {
            const batch = tasks.slice(i, i + batchSize);
            await Promise.all(batch.map(async ({ lapanganId, tanggal }) => {
                try {
                    const res = await window.api.get('/booking/check', { params: { lapanganId, tanggal } });
                    const bookings = res.data?.data || res.data || [];
                    bookings.forEach(b => {
                        if (b.status === 'PENDING_PAYMENT') {
                            allPendingBookings.push({ ...b, lapanganId, tanggal });
                        }
                    });
                } catch (_) { /* skip errors per cell */ }
            }));
        }

        // Deduplicate by booking id
        const seen = new Set();
        allPendingBookings = allPendingBookings.filter(b => {
            const id = b.id || b._id;
            if (seen.has(id)) return false;
            seen.add(id);
            return true;
        });

        // Sort by date
        allPendingBookings.sort((a, b) => (a.tanggal > b.tanggal ? 1 : -1));

        updateStats();
        applyFilters();
    } catch (err) {
        showToast('Gagal memuat booking: ' + (err.message), 'error');
    } finally {
        setLoading(false);
    }
}

function formatDateISO(date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

// ===== STATS =====
function updateStats() {
    const pending = allPendingBookings.length;
    document.getElementById('statPending').textContent = pending;
    document.getElementById('statKonfirmasi').textContent = konfirmasiHariIni;

    const totalDP = allPendingBookings.reduce((sum, b) => sum + (parseFloat(b.total_harga) || 0), 0);
    document.getElementById('statTotalDP').textContent = formatRupiah(totalDP);

    // Badge
    const badge = document.getElementById('pendingBadge');
    badge.textContent = pending;
    badge.style.display = pending > 0 ? '' : 'none';

    // Alert banner
    const alert = document.getElementById('alertBanner');
    if (pending > 0) {
        alert.style.display = '';
        document.getElementById('alertCount').textContent = pending;
    } else {
        alert.style.display = 'none';
    }
}

// ===== FILTERS =====
function applyFilters() {
    const lapId = document.getElementById('filterLapangan').value;
    const tanggal = document.getElementById('filterTanggal').value;

    filteredBookings = allPendingBookings.filter(b => {
        if (lapId && b.lapanganId !== lapId) return false;
        if (tanggal && b.tanggal !== tanggal) return false;
        return true;
    });

    renderTable(filteredBookings);
}

function clearFilters() {
    document.getElementById('filterLapangan').value = '';
    document.getElementById('filterTanggal').value = '';
    applyFilters();
}

// ===== RENDER TABLE =====
function renderTable(bookings) {
    const tbody = document.getElementById('pendingTableBody');
    document.getElementById('tableCount').textContent = `${(bookings || filteredBookings).length} booking`;

    const list = bookings || filteredBookings;
    if (!list.length) {
        tbody.innerHTML = `
      <tr>
        <td colspan="9">
          <div class="empty-state">
            <div class="empty-icon">🎉</div>
            <p>Tidak ada booking pending saat ini.</p>
          </div>
        </td>
      </tr>`;
        return;
    }

    tbody.innerHTML = list.map((b, idx) => {
        const lapangan = lapanganList.find(l => (l.id || l._id) === b.lapanganId);
        const lapNama = lapangan?.nama_lapangan || b.lapanganId || '-';
        const bookingId = b.id || b._id;
        const totalHarga = b.total_harga ? formatRupiah(b.total_harga) : '-';
        const dpTerbayar = b.jumlah_dp ? formatRupiah(b.jumlah_dp) : '<span style="color:var(--gray-300);">—</span>';
        const penyewa = b.userId || b.user_id || b.nama_penyewa || b.user?.nama || '-';

        return `
      <tr>
        <td style="color:var(--gray-400);font-size:12px;">${idx + 1}</td>
        <td>
          <div style="font-weight:600;">${lapNama}</div>
        </td>
        <td>
          <div style="font-weight:500;">${penyewa}</div>
          ${b.user?.email ? `<div style="font-size:11px;color:var(--gray-400);">${b.user.email}</div>` : ''}
        </td>
        <td>${formatDate(b.tanggal)}</td>
        <td>
          <span style="font-weight:600;">${b.jam_mulai || '–'}</span>
          <span style="color:var(--gray-400)"> – </span>
          <span style="font-weight:600;">${b.jam_selesai || '–'}</span>
        </td>
        <td style="font-weight:700;color:var(--gray-800);">${totalHarga}</td>
        <td>${dpTerbayar}</td>
        <td><span class="badge badge-yellow">⏳ Pending</span></td>
        <td>
          <button class="btn btn-warning btn-sm" onclick="openDPModal('${bookingId}', ${idx})">
            💰 Konfirmasi DP
          </button>
        </td>
      </tr>`;
    }).join('');
}

// ===== DP MODAL =====
function openDPModal(bookingId, idx) {
    selectedBookingForDP = filteredBookings[idx] || allPendingBookings.find(b => (b.id || b._id) === bookingId);
    if (!selectedBookingForDP) return;

    const lapangan = lapanganList.find(l => (l.id || l._id) === selectedBookingForDP.lapanganId);
    const lapNama = lapangan?.nama_lapangan || '-';
    const penyewa = selectedBookingForDP.userId || selectedBookingForDP.user_id || selectedBookingForDP.nama_penyewa || '-';

    document.getElementById('dpModalInfo').innerHTML = `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
      <div>
        <div style="font-size:11px;color:var(--gray-400);font-weight:600;text-transform:uppercase;letter-spacing:.6px;">Lapangan</div>
        <div style="font-weight:700;margin-top:2px;">${lapNama}</div>
      </div>
      <div>
        <div style="font-size:11px;color:var(--gray-400);font-weight:600;text-transform:uppercase;letter-spacing:.6px;">Tanggal</div>
        <div style="font-weight:700;margin-top:2px;">${formatDate(selectedBookingForDP.tanggal)}</div>
      </div>
      <div>
        <div style="font-size:11px;color:var(--gray-400);font-weight:600;text-transform:uppercase;letter-spacing:.6px;">Jam</div>
        <div style="font-weight:700;margin-top:2px;">${selectedBookingForDP.jam_mulai} – ${selectedBookingForDP.jam_selesai || '-'}</div>
      </div>
      <div>
        <div style="font-size:11px;color:var(--gray-400);font-weight:600;text-transform:uppercase;letter-spacing:.6px;">Penyewa</div>
        <div style="font-weight:700;margin-top:2px;">${penyewa}</div>
      </div>
      <div style="grid-column:span 2;">
        <div style="font-size:11px;color:var(--gray-400);font-weight:600;text-transform:uppercase;letter-spacing:.6px;">Total Harga</div>
        <div style="font-weight:800;font-size:18px;color:var(--green-700);margin-top:2px;">${selectedBookingForDP.total_harga ? formatRupiah(selectedBookingForDP.total_harga) : '-'}</div>
      </div>
    </div>`;

    document.getElementById('modalJumlahDP').value = '';
    document.getElementById('modalBuktiTransfer').value = '';
    document.getElementById('dpProgressBar').style.display = 'none';
    document.getElementById('dpProgressLabel').textContent = '';

    openModal('dpModal');
}

function updateDPProgress() {
    const dp = parseFloat(document.getElementById('modalJumlahDP').value) || 0;
    const total = parseFloat(selectedBookingForDP?.total_harga) || 0;
    if (!total || !dp) {
        document.getElementById('dpProgressBar').style.display = 'none';
        document.getElementById('dpProgressLabel').textContent = '';
        return;
    }
    const pct = Math.min(100, (dp / total * 100)).toFixed(1);
    document.getElementById('dpProgressBar').style.display = '';
    document.getElementById('dpProgressFill').style.width = pct + '%';
    document.getElementById('dpProgressLabel').textContent = `${pct}% dari total harga`;
}

async function submitDPFromModal() {
    if (!selectedBookingForDP) return;
    const jumlah_dp = parseFloat(document.getElementById('modalJumlahDP').value);
    const bukti_transfer = document.getElementById('modalBuktiTransfer').value.trim();

    if (!jumlah_dp || jumlah_dp <= 0) {
        showToast('Jumlah DP harus diisi dan lebih dari 0.', 'warning');
        document.getElementById('modalJumlahDP').focus();
        return;
    }

    setLoading(true);
    try {
        const bookingId = selectedBookingForDP.id || selectedBookingForDP._id;
        await window.api.put(`/booking/confirm/${bookingId}`, { jumlah_dp, bukti_transfer });
        showToast('DP berhasil dikonfirmasi! ✅', 'success');
        konfirmasiHariIni++;
        closeModal('dpModal');
        // Remove from list
        allPendingBookings = allPendingBookings.filter(b => (b.id || b._id) !== bookingId);
        updateStats();
        applyFilters();
    } catch (err) {
        showToast('Gagal konfirmasi DP: ' + (err.response?.data?.message || err.message), 'error');
    } finally {
        setLoading(false);
    }
}