// ===== KELOLA LAPANGAN - lapangan.js =====

let lapanganList = [];
let editingId = null;
let deletingId = null;

// ===== INIT =====
document.addEventListener('DOMContentLoaded', () => {
    loadLapangan();

    document.querySelectorAll('.modal-overlay').forEach(overlay => {
        overlay.addEventListener('click', e => {
            if (e.target === overlay) {
                overlay.classList.remove('active');
                document.body.style.overflow = '';
            }
        });
    });
});

// ===== LOAD =====
async function loadLapangan() {
    setLoading(true);
    try {
        const res = await window.api.get('/lapangan');
        lapanganList = res.data?.data || res.data || [];
        renderTable();
        updateStats();
    } catch (err) {
        showToast('Gagal memuat lapangan: ' + (err.response?.data?.message || err.message), 'error');
        document.getElementById('lapanganTableBody').innerHTML = `
      <tr><td colspan="5">
        <div class="empty-table">
          <div class="empty-icon">❌</div>
          <p>Gagal memuat data. Pastikan backend berjalan.</p>
        </div>
      </td></tr>`;
    } finally {
        setLoading(false);
    }
}

function updateStats() {
    document.getElementById('statTotal').textContent = lapanganList.length;
    const rumput = lapanganList.filter(l => (l.jenis_rumput || '').toLowerCase().includes('asli')).length;
    const sintetis = lapanganList.filter(l => (l.jenis_rumput || '').toLowerCase().includes('sintetis')).length;
    document.getElementById('statRumput').textContent = rumput;
    document.getElementById('statSintetis').textContent = sintetis;
    document.getElementById('lapanganCount').textContent = `${lapanganList.length} lapangan`;
}

function getBadgeClass(jenisRumput) {
    const j = (jenisRumput || '').toLowerCase();
    if (j.includes('sintetis')) return 'sintetis';
    if (j.includes('asli') || j.includes('rumput')) return 'rumput';
    if (j.includes('parquet') || j.includes('vinyl')) return 'futsal';
    return 'other';
}

// ===== RENDER TABLE =====
function renderTable() {
    const tbody = document.getElementById('lapanganTableBody');
    if (!lapanganList.length) {
        tbody.innerHTML = `
      <tr><td colspan="5">
        <div class="empty-table">
          <div class="empty-icon">🏟️</div>
          <p>Belum ada lapangan. Tambahkan lapangan pertama kamu!</p>
        </div>
      </td></tr>`;
        return;
    }

    tbody.innerHTML = lapanganList.map((l, idx) => {
        const id = l.id || l._id;
        const badgeClass = getBadgeClass(l.jenis_rumput);
        const isEditing = id === editingId;
        return `
      <tr style="${isEditing ? 'background:var(--green-50);' : ''}">
        <td style="color:var(--gray-400);font-size:12px;">${idx + 1}</td>
        <td>
          <div style="font-weight:600;color:var(--gray-800);">${l.nama_lapangan || '-'}</div>
          <div style="font-size:11px;color:var(--gray-400);">ID: ${id}</div>
        </td>
        <td><span class="field-type-badge ${badgeClass}">${l.jenis_rumput || '-'}</span></td>
        <td><span class="price-tag">${l.harga_per_jam ? formatRupiah(l.harga_per_jam) : '-'}</span></td>
        <td>
          <div class="row-actions">
            <button class="btn btn-secondary btn-sm" onclick="startEdit('${id}')">✏️</button>
            <button class="btn btn-danger btn-sm" onclick="openDeleteModal('${id}', '${(l.nama_lapangan || '').replace(/'/g, "\\'")}')">🗑️</button>
          </div>
        </td>
      </tr>`;
    }).join('');
}

// ===== FORM =====
function resetForm() {
    editingId = null;
    document.getElementById('fieldNamaLapangan').value = '';
    document.getElementById('fieldJenisRumput').value = '';
    document.getElementById('fieldHarga').value = '';
    document.getElementById('formPanelTitle').textContent = 'Tambah Lapangan';
    document.getElementById('formModeBadge').textContent = 'Baru';
    document.getElementById('formModeBadge').className = 'form-mode-badge add';
    document.getElementById('saveButtonText').textContent = '✅ Simpan';
    document.getElementById('editingInfo').style.display = 'none';
    renderTable();
}

function startEdit(id) {
    const lapangan = lapanganList.find(l => (l.id || l._id) === id);
    if (!lapangan) return;

    editingId = id;
    document.getElementById('fieldNamaLapangan').value = lapangan.nama_lapangan || '';
    document.getElementById('fieldJenisRumput').value = lapangan.jenis_rumput || '';
    document.getElementById('fieldHarga').value = lapangan.harga_per_jam || '';
    document.getElementById('formPanelTitle').textContent = 'Edit Lapangan';
    document.getElementById('formModeBadge').textContent = 'Edit';
    document.getElementById('formModeBadge').className = 'form-mode-badge edit';
    document.getElementById('saveButtonText').textContent = '💾 Update';
    document.getElementById('editingInfo').style.display = '';

    // Scroll to form on mobile
    document.querySelector('.form-panel').scrollIntoView({ behavior: 'smooth', block: 'start' });
    renderTable();
}

async function saveLapangan() {
    const nama_lapangan = document.getElementById('fieldNamaLapangan').value.trim();
    const jenis_rumput = document.getElementById('fieldJenisRumput').value.trim();
    const harga_per_jam = parseFloat(document.getElementById('fieldHarga').value);

    if (!nama_lapangan) {
        showToast('Nama lapangan wajib diisi.', 'warning');
        document.getElementById('fieldNamaLapangan').focus();
        return;
    }
    if (!jenis_rumput) {
        showToast('Jenis rumput wajib dipilih.', 'warning');
        document.getElementById('fieldJenisRumput').focus();
        return;
    }
    if (!harga_per_jam || harga_per_jam <= 0) {
        showToast('Harga per jam wajib diisi.', 'warning');
        document.getElementById('fieldHarga').focus();
        return;
    }

    const payload = { nama_lapangan, jenis_rumput, harga_per_jam };
    setLoading(true);
    try {
        if (editingId) {
            await window.api.put(`/lapangan/${editingId}`, payload);
            showToast(`Lapangan "${nama_lapangan}" berhasil diperbarui.`, 'success');
        } else {
            await window.api.post('/lapangan', payload);
            showToast(`Lapangan "${nama_lapangan}" berhasil ditambahkan.`, 'success');
        }
        resetForm();
        await loadLapangan();
    } catch (err) {
        showToast('Gagal menyimpan: ' + (err.response?.data?.message || err.message), 'error');
    } finally {
        setLoading(false);
    }
}

// ===== DELETE =====
function openDeleteModal(id, name) {
    deletingId = id;
    document.getElementById('deleteLapanganName').textContent = name;
    openModal('deleteModal');
}

async function confirmDelete() {
    if (!deletingId) return;
    setLoading(true);
    try {
        await window.api.delete(`/lapangan/${deletingId}`);
        showToast('Lapangan berhasil dihapus.', 'success');
        closeModal('deleteModal');
        if (editingId === deletingId) resetForm();
        deletingId = null;
        await loadLapangan();
    } catch (err) {
        showToast('Gagal menghapus: ' + (err.response?.data?.message || err.message), 'error');
    } finally {
        setLoading(false);
    }
}