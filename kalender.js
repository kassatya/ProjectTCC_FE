// ===== KALENDER BOOKING - kalender.js =====

let currentView = 'monthly';
let currentDate = new Date();
let lapanganList = [];
let selectedLapanganId = null;
let allBookings = [];
let selectedBooking = null;

// ===== INIT =====
document.addEventListener('DOMContentLoaded', async () => {
    await loadLapangan();
    loadCalendar();

    document.querySelectorAll('.modal-overlay').forEach(overlay => {
        overlay.addEventListener('click', e => {
            if (e.target === overlay) {
                overlay.classList.remove('active');
                document.body.style.overflow = '';
            }
        });
    });
});

// ===== LAPANGAN =====
async function loadLapangan() {
    try {
        const res = await window.api.get('/lapangan');
        lapanganList = res.data?.data || res.data || [];
        renderLapanganTabs();
    } catch (err) {
        showToast('Gagal memuat lapangan: ' + (err.response?.data?.message || err.message), 'error');
    }
}

function renderLapanganTabs() {
    const container = document.getElementById('lapanganTabs');
    container.innerHTML = `<div class="lapangan-tab active" onclick="selectLapangan(null, this)">Semua</div>`;
    lapanganList.forEach(l => {
        const tab = document.createElement('div');
        tab.className = 'lapangan-tab';
        tab.textContent = l.nama_lapangan || l.name;
        tab.onclick = () => selectLapangan(l.id || l._id, tab);
        container.appendChild(tab);
    });
}

function selectLapangan(id, el) {
    selectedLapanganId = id;
    document.querySelectorAll('.lapangan-tab').forEach(t => t.classList.remove('active'));
    el.classList.add('active');
    loadCalendar();
}

// ===== VIEW SWITCH =====
function switchView(view) {
    currentView = view;
    document.getElementById('monthlyView').style.display = view === 'monthly' ? '' : 'none';
    document.getElementById('weeklyView').style.display = view === 'weekly' ? '' : 'none';
    document.getElementById('btnMonthly').classList.toggle('active', view === 'monthly');
    document.getElementById('btnWeekly').classList.toggle('active', view === 'weekly');
    loadCalendar();
}

// ===== NAVIGATION =====
function navigate(dir) {
    if (currentView === 'monthly') {
        currentDate.setMonth(currentDate.getMonth() + dir);
    } else {
        currentDate.setDate(currentDate.getDate() + dir * 7);
    }
    currentDate = new Date(currentDate);
    loadCalendar();
}

function goToday() {
    currentDate = new Date();
    loadCalendar();
}

// ===== LOAD CALENDAR =====
async function loadCalendar() {
    setLoading(true);
    try {
        allBookings = await fetchBookingsForPeriod();
        updateStats(allBookings);
        if (currentView === 'monthly') renderMonthly();
        else renderWeekly();
    } catch (err) {
        showToast('Gagal memuat booking: ' + (err.response?.data?.message || err.message), 'error');
    } finally {
        setLoading(false);
    }
}

async function fetchBookingsForPeriod() {
    const lapanganIds = selectedLapanganId
        ? [selectedLapanganId]
        : lapanganList.map(l => l.id || l._id);

    if (!lapanganIds.length) return [];

    // Determine date range
    let startDate, endDate;
    if (currentView === 'monthly') {
        startDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
        endDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
    } else {
        const day = currentDate.getDay();
        const monday = new Date(currentDate);
        monday.setDate(currentDate.getDate() - ((day + 6) % 7));
        startDate = monday;
        endDate = new Date(monday);
        endDate.setDate(monday.getDate() + 6);
    }

    const bookings = [];
    const dateRange = getDatesInRange(startDate, endDate);

    await Promise.all(
        lapanganIds.map(async lapanganId => {
            await Promise.all(
                dateRange.map(async dateStr => {
                    try {
                        const res = await window.api.get('/booking/check', {
                            params: { lapanganId, tanggal: dateStr }
                        });
                        const dayBookings = res.data?.data || res.data || [];
                        dayBookings.forEach(b => {
                            bookings.push({ ...b, lapanganId, tanggal: dateStr });
                        });
                    } catch (_) { /* skip */ }
                })
            );
        })
    );

    return bookings;
}

function getDatesInRange(start, end) {
    const dates = [];
    const cur = new Date(start);
    while (cur <= end) {
        dates.push(formatDateISO(cur));
        cur.setDate(cur.getDate() + 1);
    }
    return dates;
}

function formatDateISO(date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function updateStats(bookings) {
    document.getElementById('statTotalBooking').textContent = bookings.length;
    document.getElementById('statTerboking').textContent = bookings.filter(b => b.status === 'PAID_DP').length;
    document.getElementById('statPending').textContent = bookings.filter(b => b.status === 'PENDING_PAYMENT').length;
    document.getElementById('statBlocked').textContent = bookings.filter(b => b.status === 'BLOCKED').length;
}

// ===== MONTHLY RENDER =====
function renderMonthly() {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const label = currentDate.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
    document.getElementById('calLabel').textContent = label;

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startOffset = (firstDay.getDay() + 6) % 7; // Monday first
    const today = formatDateISO(new Date());

    const dayNames = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];
    let html = dayNames.map(d => `<div class="cal-day-header">${d}</div>`).join('');

    // Prev month padding
    for (let i = 0; i < startOffset; i++) {
        const pd = new Date(year, month, -(startOffset - i - 1));
        html += `<div class="cal-cell other-month"><div class="cal-date" style="color:var(--gray-300);">${pd.getDate()}</div></div>`;
    }

    for (let d = 1; d <= lastDay.getDate(); d++) {
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        const dayBookings = allBookings.filter(b => b.tanggal === dateStr);
        const isToday = dateStr === today;

        let eventsHtml = dayBookings.slice(0, 3).map(b => {
            const lapangan = lapanganList.find(l => (l.id || l._id) === b.lapanganId);
            const lapNama = lapangan?.nama_lapangan || 'Lapangan';
            const label = `${b.jam_mulai || ''} ${lapNama}`;
            return `<span class="cal-event ${b.status}" onclick='openBookingDetail(${JSON.stringify(b).replace(/'/g, "&apos;")})'>${label}</span>`;
        }).join('');

        if (dayBookings.length > 3) {
            eventsHtml += `<span style="font-size:11px;color:var(--gray-400);font-weight:600;">+${dayBookings.length - 3} lainnya</span>`;
        }

        html += `
      <div class="cal-cell ${isToday ? 'today' : ''}">
        <div class="cal-date">${isToday ? `<div class="cal-date" style="background:var(--green-600);color:#fff;width:24px;height:24px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:12px;">${d}</div>` : d}</div>
        ${eventsHtml}
      </div>`;
    }

    // Next month padding
    const totalCells = startOffset + lastDay.getDate();
    const remaining = totalCells % 7 === 0 ? 0 : 7 - (totalCells % 7);
    for (let i = 1; i <= remaining; i++) {
        html += `<div class="cal-cell other-month"><div class="cal-date" style="color:var(--gray-300);">${i}</div></div>`;
    }

    document.getElementById('monthlyGrid').innerHTML = html;
}

// ===== WEEKLY RENDER =====
function renderWeekly() {
    const day = currentDate.getDay();
    const monday = new Date(currentDate);
    monday.setDate(currentDate.getDate() - ((day + 6) % 7));

    const weekDays = Array.from({ length: 7 }, (_, i) => {
        const d = new Date(monday);
        d.setDate(monday.getDate() + i);
        return d;
    });

    const dayNames = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];
    const today = formatDateISO(new Date());

    const startStr = weekDays[0].toLocaleDateString('id-ID', { day: '2-digit', month: 'short' });
    const endStr = weekDays[6].toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
    document.getElementById('calLabel').textContent = `${startStr} — ${endStr}`;

    // Hours 07:00 - 23:00
    const hours = Array.from({ length: 17 }, (_, i) => i + 7);

    let html = '';

    // Header row
    html += `<div class="week-header-cell"></div>`;
    weekDays.forEach((d, i) => {
        const dateStr = formatDateISO(d);
        const isToday = dateStr === today;
        html += `
      <div class="week-header-cell">
        <div class="week-day-name">${dayNames[i]}</div>
        <div class="${isToday ? 'week-day-num today-num' : 'week-day-num'}">${d.getDate()}</div>
      </div>`;
    });

    // Time rows
    hours.forEach(h => {
        const hourStr = `${String(h).padStart(2, '0')}:00`;
        // Time column
        html += `<div class="week-time-col"><div class="week-time-slot">${hourStr}</div></div>`;

        // Day columns
        weekDays.forEach(d => {
            const dateStr = formatDateISO(d);
            const slotBookings = allBookings.filter(b => {
                if (b.tanggal !== dateStr) return false;
                const startH = parseInt((b.jam_mulai || '00:00').split(':')[0]);
                return startH === h;
            });

            let slotsHtml = '';
            slotBookings.forEach(b => {
                const lapangan = lapanganList.find(l => (l.id || l._id) === b.lapanganId);
                const lapNama = lapangan?.nama_lapangan || 'Lap';
                slotsHtml += `
          <div class="week-booking-block ${b.status}" onclick='openBookingDetail(${JSON.stringify(b).replace(/'/g, "&apos;")})' title="${lapNama} - ${b.status}">
            ${b.jam_mulai}–${b.jam_selesai || ''} ${lapNama}
          </div>`;
            });

            html += `<div class="week-day-col"><div class="week-slot">${slotsHtml}</div></div>`;
        });
    });

    document.getElementById('weeklyGrid').innerHTML = html;
}

// ===== BOOKING DETAIL MODAL =====
function openBookingDetail(booking) {
    selectedBooking = booking;
    const lapangan = lapanganList.find(l => (l.id || l._id) === booking.lapanganId);
    const lapNama = lapangan?.nama_lapangan || '-';
    const statusMap = {
        PAID_DP: '<span class="badge badge-green">● DP Terbayar</span>',
        PENDING_PAYMENT: '<span class="badge badge-yellow">● Pending</span>',
        BLOCKED: '<span class="badge badge-pink">● Diblokir</span>',
    };

    const isPending = booking.status === 'PENDING_PAYMENT';
    document.getElementById('btnKonfirmasiDP').style.display = isPending ? '' : 'none';

    document.getElementById('bookingModalBody').innerHTML = `
    <div class="detail-row">
      <span class="detail-label">Lapangan</span>
      <span class="detail-value">${lapNama}</span>
    </div>
    <div class="detail-row">
      <span class="detail-label">Tanggal</span>
      <span class="detail-value">${formatDate(booking.tanggal || booking.date)}</span>
    </div>
    <div class="detail-row">
      <span class="detail-label">Jam</span>
      <span class="detail-value">${booking.jam_mulai || '–'} – ${booking.jam_selesai || '–'}</span>
    </div>
    <div class="detail-row">
      <span class="detail-label">Penyewa</span>
      <span class="detail-value">${booking.userId || booking.user_id || booking.nama_penyewa || '-'}</span>
    </div>
    <div class="detail-row">
      <span class="detail-label">Total Harga</span>
      <span class="detail-value">${booking.total_harga ? formatRupiah(booking.total_harga) : '-'}</span>
    </div>
    <div class="detail-row">
      <span class="detail-label">DP Dibayar</span>
      <span class="detail-value">${booking.jumlah_dp ? formatRupiah(booking.jumlah_dp) : '-'}</span>
    </div>
    <div class="detail-row">
      <span class="detail-label">Status</span>
      <span class="detail-value">${statusMap[booking.status] || booking.status}</span>
    </div>
    ${booking.catatan ? `<div class="detail-row"><span class="detail-label">Catatan</span><span class="detail-value">${booking.catatan}</span></div>` : ''}

    ${isPending ? `
    <div class="dp-form">
      <div class="form-group">
        <label class="form-label">Jumlah DP (Rp)</label>
        <input class="form-control" id="inputJumlahDP" type="number" placeholder="Contoh: 100000" min="0" />
      </div>
      <div class="form-group">
        <label class="form-label">Bukti Transfer (URL / Nomor Ref)</label>
        <input class="form-control" id="inputBuktiTransfer" type="text" placeholder="Link bukti atau nomor referensi" />
      </div>
    </div>` : ''}
  `;

    openModal('bookingModal');
}

async function submitKonfirmasiDP() {
    if (!selectedBooking) return;
    const jumlah_dp = parseFloat(document.getElementById('inputJumlahDP')?.value);
    const bukti_transfer = document.getElementById('inputBuktiTransfer')?.value?.trim();

    if (!jumlah_dp || jumlah_dp <= 0) {
        showToast('Jumlah DP harus diisi dan lebih dari 0.', 'warning');
        return;
    }

    setLoading(true);
    try {
        const bookingId = selectedBooking.id || selectedBooking._id;
        await window.api.put(`/booking/confirm/${bookingId}`, { jumlah_dp, bukti_transfer });
        showToast('Booking berhasil dikonfirmasi DP!', 'success');
        closeModal('bookingModal');
        loadCalendar();
    } catch (err) {
        showToast('Gagal konfirmasi DP: ' + (err.response?.data?.message || err.message), 'error');
    } finally {
        setLoading(false);
    }
}