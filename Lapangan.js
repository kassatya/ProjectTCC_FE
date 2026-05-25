// ===== KELOLA LAPANGAN (READ ONLY) - lapangan.js =====
// Form tambah/edit dan tombol aksi dihapus sesuai permintaan.
// Halaman ini hanya menampilkan daftar lapangan.

document.addEventListener('DOMContentLoaded', () => {
    loadLapangan();
});

async function loadLapangan() {
    setLoading(true);
    try {
        const res = await window.api.get('/lapangan');
        const lapanganList = res.data?.data || res.data || [];
        renderTable(lapanganList);
        updateStats(lapanganList);
    } catch (err) {
        showToast('Gagal memuat lapangan: ' + (err.response?.data?.message || err.message), 'error');
        document.getElementById('lapanganTableBody').innerHTML = `
      <tr><td colspan="4">
        <div class="empty-state">
          <div class="empty-icon">❌</div>
          <p>Gagal memuat data. Periksa koneksi ke backend.</p>
        </div>
      </td></tr>`;
    } finally {
        setLoading(false);
    }
}

function updateStats(list) {
    document.getElementById('statTotal').textContent = list.length;
    document.getElementById('statRumput').textContent = list.filter(l => (l.jenis_rumput || '').toLowerCase().includes('asli')).length;
    document.getElementById('statSintetis').textContent = list.filter(l => (l.jenis_rumput || '').toLowerCase().includes('sintetis')).length;
    document.getElementById('lapanganCount').textContent = `${list.length} lapangan`;
}

function getBadgeClass(jenisRumput) {
    const j = (jenisRumput || '').toLowerCase();
    if (j.includes('sintetis')) return 'sintetis';
    if (j.includes('asli') || j.includes('rumput')) return 'rumput';
    if (j.includes('parquet') || j.includes('vinyl')) return 'futsal';
    return 'other';
}

function renderTable(list) {
    const tbody = document.getElementById('lapanganTableBody');
    if (!list.length) {
        tbody.innerHTML = `
      <tr><td colspan="4">
        <div class="empty-state">
          <div class="empty-icon">🏟️</div>
          <p>Belum ada data lapangan.</p>
        </div>
      </td></tr>`;
        return;
    }

    tbody.innerHTML = list.map((l, idx) => {
        const id = l.id || l._id;
        const badgeClass = getBadgeClass(l.jenis_rumput);
        return `
      <tr>
        <td style="color:var(--gray-400);font-size:12px;">${idx + 1}</td>
        <td>
          <div style="font-weight:600;color:var(--gray-800);">${l.nama_lapangan || '-'}</div>
          <div style="font-size:11px;color:var(--gray-400);">ID: ${id}</div>
        </td>
        <td><span class="field-type-badge ${badgeClass}">${l.jenis_rumput || '-'}</span></td>
        <td><span class="price-tag">${l.harga_per_jam ? formatRupiah(l.harga_per_jam) : '-'}</span></td>
      </tr>`;
    }).join('');
}