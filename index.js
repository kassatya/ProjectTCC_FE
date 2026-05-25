// ===== DATA USER - index.js =====
// Pola pemanggilan mengikuti kode asli:
// getUser(), tampilkanUser(), hapusUser(), editUser()
// elemen: #user-form, #name, #email, #table-user
// Base URL diambil dari shared.js (window.api)

// ===== INIT =====
document.addEventListener("DOMContentLoaded", () => {
  getUser();

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
      await window.api.post("/users", { username, email });
      showToast(`User "${username}" berhasil ditambahkan. ✅`, "success");
    } else {
      await window.api.put(`/users/${id}`, { username, email });
      showToast(`User "${username}" berhasil diperbarui. ✅`, "success");
    }

    elemenName.dataset.id = "";
    elemenName.value = "";
    elemenEmail.value = "";
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
    const response = await window.api.get("/users");
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
            <p>Gagal memuat data. Periksa koneksi ke backend.</p>
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
            <div class="user-name">${user.username ?? "-"}</div>
            <div class="user-email">${user.email ?? "-"}</div>
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
  document.querySelectorAll(".btn-hapus").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.dataset.id;
      const name = btn.dataset.name || "user ini";
      document.getElementById("deleteUserName").textContent = name;
      // clone untuk bersihkan listener lama
      const old = document.getElementById("deleteConfirmBtn");
      const fresh = old.cloneNode(true);
      old.replaceWith(fresh);
      fresh.addEventListener("click", async () => {
        setLoading(true);
        try {
          await window.api.delete(`/users/${id}`);
          showToast("User berhasil dihapus.", "success");
          closeModal("deleteModal");
          getUser();
        } catch (error) {
          const msg = error.response?.data?.message || error.message;
          showToast("Gagal menghapus: " + msg, "error");
          console.log(error.response?.data || error.message);
        } finally {
          setLoading(false);
        }
      });
      openModal("deleteModal");
    });
  });
}

// ===== EDIT USER =====
function editUser() {
  document.querySelectorAll(".btn-edit").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.dataset.id;
      const row = btn.closest("tr");

      const username = row.querySelector(".user-name").innerText;
      const email = row.querySelector(".user-email").innerText;

      const elemenName = document.querySelector("#name");
      const elemenEmail = document.querySelector("#email");

      elemenName.dataset.id = id;
      elemenName.value = username;
      elemenEmail.value = email;

      setFormMode("edit", username);
      document.querySelector(".form-panel").scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });
}

// ===== SEARCH =====
function filterUsers() {
  const q = document.getElementById("searchInput").value.toLowerCase();
  document.querySelectorAll("#table-user tr").forEach((row) => {
    row.style.display = row.innerText.toLowerCase().includes(q) ? "" : "none";
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

// ===== FORM MODE =====
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
    info.innerHTML = `✏️ Mode edit: <strong>${username}</strong>. Klik Reset untuk batal.`;
  } else {
    badge.textContent = "Baru";
    badge.className = "form-mode-badge add";
    title.textContent = "Tambah User";
    btn.textContent = "✅ Simpan";
    info.style.display = "none";
  }
}

// ===== STATS =====
function updateStats(users) {
  document.getElementById("statTotal").textContent = users.length;

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const newUsers = users.filter(
    (u) => u.createdAt && new Date(u.createdAt) >= thirtyDaysAgo
  ).length;
  document.getElementById("statNew").textContent = newUsers;
}