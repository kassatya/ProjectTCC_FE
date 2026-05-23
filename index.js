// ===== DATA USER - index.js =====
// Pola pemanggilan API mengikuti kode asli:
// - port prompt langsung di DOMContentLoaded
// - getApiBase() → /api/v1/users
// - getUser(), tampilkanUser(), hapusUser(), editUser()
// - elemen: #user-form, #name, #email, #table-user

let port = 3000;

const getApiBase = () => `http://localhost:${port}/api/v1/users`;

// ===== INIT =====
document.addEventListener("DOMContentLoaded", () => {
  const inputPort = prompt("Masukkan port Back-End\nPort default: 3000");
  if (inputPort && inputPort.trim() !== "") {
    port = inputPort.trim();
  }
  getUser();

  // Tutup modal kalau klik overlay
  document.querySelectorAll(".modal-overlay").forEach((overlay) => {
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) {
        overlay.classList.remove("active");
        document.body.style.overflow = "";
      }
    });
  });
});

// ===== FORM SUBMIT (Tambah / Edit) =====
const formulir = document.querySelector("#user-form");

formulir.addEventListener("submit", async (e) => {
  e.preventDefault();

  const elemenName = document.querySelector("#name");
  const elemenEmail = document.querySelector("#email");

  const username = elemenName.value.trim();
  const email = elemenEmail.value.trim();
  const id = elemenName.dataset.id || "";

  if (!username || !email) {
    showToast("Username dan email wajib diisi.", "warning");
    return;
  }

  setLoading(true);
  try {
    if (id === "") {
      await axios.post(getApiBase(), { username, email });
      showToast(`User "${username}" berhasil ditambahkan. ✅`, "success");
    } else {
      await axios.put(`${getApiBase()}/${id}`, { username, email });
      showToast(`User "${username}" berhasil diperbarui. ✅`, "success");
    }

    // Reset form
    elemenName.dataset.id = "";
    elemenName.value = "";
    elemenEmail.value = "";

    // Reset mode form ke "Tambah"
    setFormMode("add");

    getUser();
  } catch (error) {
    const msg = error.response?.data?.message || error.message;
    showToast("Gagal menyimpan: " + msg, "error");
    console.log(error.response?.data || error.message);
  } finally {
    setLoading(false);
  }
});

// ===== GET USER =====
async function getUser() {
  setLoading(true);
  try {
    const response = await axios.get(getApiBase());
    const users = response.data?.data || [];

    updateStats(users);

    const table = document.querySelector("#table-user");
    let tampilan = "";
    let no = 1;

    for (const user of users) {
      tampilan += tampilkanUser(no, user);
      no++;
    }

    if (users.length === 0) {
      table.innerHTML = `
        <tr>
          <td colspan="5">
            <div class="empty-state">
              <div class="empty-icon">👥</div>
              <p>Belum ada data user.</p>
            </div>
          </td>
        </tr>`;
    } else {
      table.innerHTML = tampilan;
      hapusUser();
      editUser();
    }
  } catch (error) {
    const msg = error.response?.data?.message || error.message;
    showToast("Gagal memuat user: " + msg, "error");
    document.querySelector("#table-user").innerHTML = `
      <tr>
        <td colspan="5">
          <div class="empty-state">
            <div class="empty-icon">❌</div>
            <p>Gagal memuat data. Pastikan backend berjalan di port ${port}.</p>
          </div>
        </td>
      </tr>`;
    console.log(error.response?.data || error.message);
  } finally {
    setLoading(false);
  }
}

// ===== RENDER ROW =====
function tampilkanUser(no, user) {
  // Buat inisial avatar dari username
  const initials = (user.username || "U")
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return `
    <tr>
      <td style="color:var(--gray-400);font-size:12px;">${no}</td>
      <td>
        <div class="user-cell">
          <div class="user-avatar">${initials}</div>
          <div>
            <div class="user-name name">${user.username ?? "-"}</div>
            <div class="user-email email">${user.email ?? "-"}</div>
          </div>
        </div>
      </td>
      <td>${user.createdAt ? formatDate(user.createdAt) : "-"}</td>
      <td>
        <button data-id="${user.id}" class="btn btn-secondary btn-sm btn-edit" type="button">✏️ Edit</button>
      </td>
      <td>
        <button data-id="${user.id}" data-name="${user.username ?? ""}" class="btn btn-danger btn-sm btn-hapus" type="button">🗑️ Hapus</button>
      </td>
    </tr>
  `;
}

// ===== HAPUS USER =====
function hapusUser() {
  const tombolHapus = document.querySelectorAll(".btn-hapus");

  tombolHapus.forEach((btn) => {
    btn.addEventListener("click", () => {
      // Simpan id & nama ke modal konfirmasi, lalu tampilkan modal
      const id = btn.dataset.id;
      const name = btn.dataset.name || "user ini";
      document.getElementById("deleteUserName").textContent = name;
      document.getElementById("deleteConfirmBtn").dataset.id = id;
      document.getElementById("deleteModal").classList.add("active");
      document.body.style.overflow = "hidden";
    });
  });

  // Tombol konfirmasi di dalam modal
  const confirmBtn = document.getElementById("deleteConfirmBtn");
  // Bersihkan listener lama supaya tidak ganda
  confirmBtn.replaceWith(confirmBtn.cloneNode(true));
  document.getElementById("deleteConfirmBtn").addEventListener("click", async () => {
    const id = document.getElementById("deleteConfirmBtn").dataset.id;
    setLoading(true);
    try {
      await axios.delete(`${getApiBase()}/${id}`);
      showToast("User berhasil dihapus.", "success");
      document.getElementById("deleteModal").classList.remove("active");
      document.body.style.overflow = "";
      getUser();
    } catch (error) {
      const msg = error.response?.data?.message || error.message;
      showToast("Gagal menghapus: " + msg, "error");
      console.log(error.response?.data || error.message);
    } finally {
      setLoading(false);
    }
  });
}

// ===== EDIT USER =====
function editUser() {
  const tombolEdit = document.querySelectorAll(".btn-edit");

  tombolEdit.forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.dataset.id;
      const row = btn.closest("tr");

      // Ambil nilai dari cell (class .name dan .email ada di dalam user-cell)
      const name = row.querySelector(".user-name").innerText;
      const email = row.querySelector(".user-email").innerText;

      const elemenName = document.querySelector("#name");
      const elemenEmail = document.querySelector("#email");

      elemenName.dataset.id = id;
      elemenName.value = name;
      elemenEmail.value = email;

      setFormMode("edit", name);

      // Scroll ke form
      document.querySelector(".form-panel").scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });
}

// ===== SEARCH / FILTER =====
function filterUsers() {
  const q = document.getElementById("searchInput").value.toLowerCase();
  const rows = document.querySelectorAll("#table-user tr");
  rows.forEach((row) => {
    const text = row.innerText.toLowerCase();
    row.style.display = text.includes(q) ? "" : "none";
  });
}

// ===== RESET FORM =====
function resetForm() {
  const elemenName = document.querySelector("#name");
  const elemenEmail = document.querySelector("#email");
  elemenName.dataset.id = "";
  elemenName.value = "";
  elemenEmail.value = "";
  setFormMode("add");
}

// ===== FORM MODE (Tambah / Edit) =====
function setFormMode(mode, username = "") {
  const badge = document.getElementById("formModeBadge");
  const title = document.getElementById("formPanelTitle");
  const btn = document.getElementById("formSubmitBtn");
  const info = document.getElementById("editingInfo");

  if (mode === "edit") {
    badge.textContent = "Edit";
    badge.className = "form-mode-badge edit";
    title.textContent = "Edit User";
    btn.textContent = "💾 Update";
    info.style.display = "";
    info.innerHTML = `✏️ Mode edit aktif untuk <strong>${username}</strong>. Klik Reset untuk batal.`;
  } else {
    badge.textContent = "Baru";
    badge.className = "form-mode-badge add";
    title.textContent = "Tambah User";
    btn.textContent = "✅ Simpan";
    info.style.display = "none";
  }
}

// ===== UPDATE STATS =====
function updateStats(users) {
  document.getElementById("statTotal").textContent = users.length;

  // Hitung user terdaftar 30 hari terakhir
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const newUsers = users.filter(
    (u) => u.createdAt && new Date(u.createdAt) >= thirtyDaysAgo
  ).length;
  document.getElementById("statNew").textContent = newUsers;
}