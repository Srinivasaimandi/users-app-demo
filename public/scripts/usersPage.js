// Fetch and render users after login
let allUsers = [];
let currentPage = 1;
let itemsPerPage = 10;
let sortBy = null;
let sortAsc = true;
let pendingDeleteUserId = null;

const themeKey = "users-app-theme";
const storedTheme = localStorage.getItem(themeKey);
if (storedTheme) {
  document.body.setAttribute("data-theme", storedTheme);
}

// Toast notification system
function showToast(message, type = "success") {
  const successMsg = document.getElementById("success-msg");
  successMsg.textContent = message;
  successMsg.className = `alert alert-${type === "error" ? "danger" : "success"} py-2`;
  successMsg.style.display = "block";
  setTimeout(() => {
    successMsg.style.display = "none";
  }, 3000);
}

async function fetchUsers() {
  const token = localStorage.getItem("x-api-token");
  const errorMsg = document.getElementById("error-msg");
  const table = document.getElementById("users-table");
  if (!token) {
    errorMsg.textContent = "You must login first.";
    errorMsg.style.display = "block";
    return;
  }
  try {
    const response = await fetch("/api/users", {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": token,
      },
    });
    if (response.status === 401 || response.status === 403) {
      errorMsg.textContent = "Unauthorized. Please login again.";
      errorMsg.style.display = "block";
      localStorage.removeItem("x-api-token");
      return;
    }
    if (response.status === 204) {
      errorMsg.textContent = "No users found.";
      errorMsg.style.display = "block";
      return;
    }
    const users = await response.json();
    if (Array.isArray(users) && users.length > 0) {
      allUsers = users.map((user) => ({
        ...user,
        status: user.status || "active",
      }));
      currentPage = 1;
      applySort();
      renderUsers();
      table.style.display = "";
    } else {
      errorMsg.textContent = "No users found.";
      errorMsg.style.display = "block";
    }
  } catch (err) {
    errorMsg.textContent = "Failed to fetch users.";
    errorMsg.style.display = "block";
  }
}

function applySort() {
  if (sortBy) {
    allUsers.sort((a, b) => {
      const aVal = a[sortBy];
      const bVal = b[sortBy];
      if (typeof aVal === "string") {
        return sortAsc ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      return sortAsc ? aVal - bVal : bVal - aVal;
    });
  }
}

function getPaginatedUsers() {
  const filtered = allUsers.filter((user) => String(user.id) !== "0");
  const start = (currentPage - 1) * itemsPerPage;
  const end = start + itemsPerPage;
  return filtered.slice(start, end);
}

function getTotalPages() {
  const filtered = allUsers.filter((user) => String(user.id) !== "0");
  return Math.ceil(filtered.length / itemsPerPage);
}

function renderUsers() {
  const tbody = document.querySelector("#users-table tbody");
  tbody.innerHTML = "";
  const paginatedUsers = getPaginatedUsers();
  const totalPages = getTotalPages();

  paginatedUsers.forEach((user) => {
    const tr = document.createElement("tr");
    const status = user.status || "active";
    const badgeClass = status === "active" ? "bg-success" : "bg-secondary";
    tr.innerHTML = `
      <td>${user.id}</td>
      <td>${user.name}</td>
      <td>${user.email}</td>
      <td>${user.username}</td>
      <td>
        <span class="badge ${badgeClass}">
          ${status}
        </span>
      </td>
      <td>
        <button class="edit-btn" data-user-id="${user.id}" title="Edit row" aria-label="Edit row">
          <i class="fas fa-pen"></i>
        </button>
        <button class="delete-btn" data-user-id="${user.id}" title="Delete row" aria-label="Delete row">
          <i class="fas fa-trash"></i>
        </button>
      </td>
    `;
    tbody.appendChild(tr);
  });

  // Update pagination
  const pageInfo = document.getElementById("page-info");
  const prevBtn = document.getElementById("prev-page");
  const nextBtn = document.getElementById("next-page");
  pageInfo.textContent = `Page ${currentPage} of ${totalPages || 1}`;
  prevBtn.disabled = currentPage <= 1;
  nextBtn.disabled = currentPage >= totalPages;
}

// Filter function
function filterUsers(query) {
  const q = query.toLowerCase().trim();
  if (!q) {
    currentPage = 1;
    applySort();
    renderUsers();
    return;
  }
  const qCompact = q.replace(/\s+/g, "");
  const filtered = allUsers.filter((user) => {
    const id = String(user.id || "").toLowerCase();
    const name = String(user.name || "").toLowerCase();
    const email = String(user.email || "").toLowerCase();
    const username = String(user.username || "").toLowerCase();
    const haystack = `${id} ${name} ${email} ${username}`;
    const haystackCompact = haystack.replace(/\s+/g, "");
    return (
      haystack.includes(q) || (qCompact && haystackCompact.includes(qCompact))
    );
  });
  allUsers = filtered;
  currentPage = 1;
  renderUsers();
}

// Export users
function exportUsers(format) {
  const filtered = allUsers.filter((user) => String(user.id) !== "0");
  let content, filename, mimeType;

  if (format === "json") {
    content = JSON.stringify(filtered, null, 2);
    filename = "users.json";
    mimeType = "application/json";
  } else if (format === "csv") {
    const headers = ["ID", "Name", "Email", "Username", "Status"];
    const rows = filtered.map((user) => [
      user.id,
      user.name,
      user.email,
      user.username,
      user.status || "active",
    ]);
    content =
      headers.join(",") +
      "\n" +
      rows.map((row) => row.map((cell) => `"${cell}"`).join(",")).join("\n");
    filename = "users.csv";
    mimeType = "text/csv";
  } else if (format === "txt") {
    content = filtered
      .map(
        (user) =>
          `ID: ${user.id}\nName: ${user.name}\nEmail: ${user.email}\nUsername: ${user.username}\nStatus: ${user.status || "active"}\n`,
      )
      .join("\n---\n");
    filename = "users.txt";
    mimeType = "text/plain";
  }

  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
  showToast(`Users exported as ${filename}`);
}

// Import users
function handleImport(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = async (e) => {
    try {
      let users = [];
      if (file.name.endsWith(".json")) {
        users = JSON.parse(e.target.result);
      } else if (file.name.endsWith(".csv")) {
        const lines = e.target.result.split("\n").filter((line) => line.trim());
        const headers = lines[0]
          .split(",")
          .map((h) => h.replace(/"/g, "").trim());
        users = lines.slice(1).map((line) => {
          const values = line.split(",").map((v) => v.replace(/"/g, "").trim());
          const user = {};
          headers.forEach((header, index) => {
            user[header.toLowerCase()] = values[index];
          });
          return user;
        });
      }

      if (!Array.isArray(users) || users.length === 0) {
        showToast("Invalid file format", "error");
        return;
      }

      const token = localStorage.getItem("x-api-token");
      let successCount = 0;
      let errorCount = 0;

      for (const user of users) {
        try {
          const response = await fetch("/api/users", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-api-key": token,
            },
            body: JSON.stringify({
              name: user.name || user.Name || "",
              email: user.email || user.Email || "",
              username: user.username || user.Username || "",
              password: user.password || user.Password || "123456",
            }),
          });
          if (response.ok) {
            successCount++;
          } else {
            errorCount++;
          }
        } catch (err) {
          errorCount++;
        }
      }

      showToast(`Imported ${successCount} users, ${errorCount} failed`);
      await fetchUsers();
    } catch (error) {
      showToast("Error parsing file", "error");
    }
  };
  reader.readAsText(file);
  event.target.value = "";
}

// Search listener
document.addEventListener("DOMContentLoaded", () => {
  const searchInput = document.getElementById("search-input");
  searchInput.addEventListener("input", (e) => {
    filterUsers(e.target.value);
  });

  // Pagination event listeners
  document.getElementById("prev-page").addEventListener("click", () => {
    if (currentPage > 1) {
      currentPage--;
      renderUsers();
    }
  });

  document.getElementById("next-page").addEventListener("click", () => {
    const totalPages = getTotalPages();
    if (currentPage < totalPages) {
      currentPage++;
      renderUsers();
    }
  });

  document.getElementById("items-per-page").addEventListener("change", (e) => {
    itemsPerPage = parseInt(e.target.value);
    currentPage = 1;
    renderUsers();
  });

  // Sorting event listeners
  document.querySelectorAll("th[data-sort]").forEach((th) => {
    th.addEventListener("click", () => {
      const column = th.getAttribute("data-sort");
      if (sortBy === column) {
        sortAsc = !sortAsc;
      } else {
        sortBy = column;
        sortAsc = true;
      }
      applySort();
      currentPage = 1;
      renderUsers();
    });
  });

  // Export buttons
  const exportBtn = document.getElementById("export-btn");
  const exportMenu = document.createElement("div");
  exportMenu.className = "dropdown-menu";
  exportMenu.style.cssText =
    "position: absolute; background: white; border: 1px solid #ddd; border-radius: 4px; z-index: 1000; display: none;";
  exportMenu.innerHTML = `
    <button class="dropdown-item" id="export-json" style="display: block; width: 100%; padding: 8px 12px; text-align: left; border: none; background: none; cursor: pointer;">Export as JSON</button>
    <button class="dropdown-item" id="export-csv" style="display: block; width: 100%; padding: 8px 12px; text-align: left; border: none; background: none; cursor: pointer;">Export as CSV</button>
    <button class="dropdown-item" id="export-txt" style="display: block; width: 100%; padding: 8px 12px; text-align: left; border: none; background: none; cursor: pointer;">Export as Text</button>
  `;
  document.body.appendChild(exportMenu);

  exportBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    const rect = exportBtn.getBoundingClientRect();
    exportMenu.style.top = rect.bottom + "px";
    exportMenu.style.left = rect.left + "px";
    exportMenu.style.display =
      exportMenu.style.display === "none" ? "block" : "none";
  });

  document.getElementById("export-json").addEventListener("click", () => {
    exportUsers("json");
    exportMenu.style.display = "none";
  });
  document.getElementById("export-csv").addEventListener("click", () => {
    exportUsers("csv");
    exportMenu.style.display = "none";
  });
  document.getElementById("export-txt").addEventListener("click", () => {
    exportUsers("txt");
    exportMenu.style.display = "none";
  });

  // Import button
  document.getElementById("import-btn").addEventListener("click", () => {
    document.getElementById("import-file").click();
  });
  document
    .getElementById("import-file")
    .addEventListener("change", handleImport);

  document.addEventListener("click", (e) => {
    if (
      !e.target.closest("#export-btn") &&
      !e.target.closest(".dropdown-menu")
    ) {
      exportMenu.style.display = "none";
    }
  });

  // Add User Modal
  const addBtn = document.getElementById("add-btn");
  const addModal = document.getElementById("add-user-modal");
  const addForm = document.getElementById("add-user-form");
  const addClose = document.getElementById("add-user-close");
  const addCancel = document.getElementById("add-user-cancel");
  const addError = document.getElementById("add-user-error");
  const addSave = document.getElementById("add-user-save");
  const addName = document.getElementById("add-name");
  const addEmail = document.getElementById("add-email");
  const addUsername = document.getElementById("add-username");
  const addPassword = document.getElementById("add-password");
  const addStatus = document.getElementById("add-status");

  const isValidEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

  const openAddModal = () => {
    addError.style.display = "none";
    addForm.reset();
    addStatus.value = "active";
    addModal.classList.add("is-open");
    addModal.setAttribute("aria-hidden", "false");
    addName.focus();
  };

  const closeAddModal = () => {
    addModal.classList.remove("is-open");
    addModal.setAttribute("aria-hidden", "true");
  };

  addBtn.addEventListener("click", openAddModal);
  addClose.addEventListener("click", closeAddModal);
  addCancel.addEventListener("click", closeAddModal);
  addModal.addEventListener("click", (e) => {
    if (e.target === addModal) closeAddModal();
  });

  addEmail.addEventListener("input", () => {
    const value = addEmail.value.trim();
    if (value.length === 0 || isValidEmail(value)) {
      addEmail.classList.remove("is-invalid");
      addEmail.setCustomValidity("");
    } else {
      addEmail.classList.add("is-invalid");
      addEmail.setCustomValidity("Invalid email address.");
    }
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && addModal.classList.contains("is-open")) {
      closeAddModal();
    }
  });

  addForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    addError.style.display = "none";

    const payload = {
      name: addName.value.trim(),
      email: addEmail.value.trim(),
      username: addUsername.value.trim(),
      password: addPassword.value.trim(),
      status: addStatus.value,
    };

    if (
      !payload.name ||
      !payload.email ||
      !payload.username ||
      !payload.password
    ) {
      addError.textContent = "Please fill out all fields.";
      addError.style.display = "block";
      return;
    }

    if (!isValidEmail(payload.email)) {
      addEmail.classList.add("is-invalid");
      addEmail.setCustomValidity("Invalid email address.");
      addError.textContent = "Please enter a valid email address.";
      addError.style.display = "block";
      addEmail.focus();
      return;
    }

    const token = localStorage.getItem("x-api-token");
    addSave.disabled = true;
    try {
      const response = await fetch("/api/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": token,
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        closeAddModal();
        showToast("User added successfully");
        await fetchUsers();
        return;
      }

      let message = "Failed to add user.";
      try {
        const data = await response.json();
        if (data && data.message) message = data.message;
      } catch (_) {}

      addError.textContent = message;
      addError.style.display = "block";
    } catch (err) {
      addError.textContent = "Failed to add user.";
      addError.style.display = "block";
    } finally {
      addSave.disabled = false;
    }
  });

  // Edit User Modal
  const editModal = document.getElementById("edit-user-modal");
  const editForm = document.getElementById("edit-user-form");
  const editClose = document.getElementById("edit-user-close");
  const editCancel = document.getElementById("edit-user-cancel");
  const editDownload = document.getElementById("edit-user-download");
  const editError = document.getElementById("edit-user-error");
  const editId = document.getElementById("edit-user-id");
  const editName = document.getElementById("edit-name");
  const editEmail = document.getElementById("edit-email");
  const editUsername = document.getElementById("edit-username");
  const editPassword = document.getElementById("edit-password");
  const editStatus = document.getElementById("edit-status");

  const openEditModal = (user) => {
    editError.style.display = "none";
    editId.value = user.id;
    editName.value = user.name || "";
    editEmail.value = user.email || "";
    editUsername.value = user.username || "";
    editPassword.value = "";
    editStatus.value = user.status || "active";
    editModal.classList.add("is-open");
    editModal.setAttribute("aria-hidden", "false");
    editName.focus();
  };

  const closeEditModal = () => {
    editModal.classList.remove("is-open");
    editModal.setAttribute("aria-hidden", "true");
  };

  editClose.addEventListener("click", closeEditModal);
  editCancel.addEventListener("click", closeEditModal);
  editDownload.addEventListener("click", () => {
    const userId = editId.value;
    const user = allUsers.find((user) => String(user.id) === String(userId));
    if (!user) {
      editError.textContent = "User not found.";
      editError.style.display = "block";
      return;
    }

    const fileName = `user-${user.id}.txt`;
    const textLines = Object.entries(user)
      .map(([key, value]) => `${key}: ${value}`)
      .join("\n");
    const blob = new Blob([textLines], {
      type: "text/plain",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = fileName;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
    showToast("User data downloaded");
  });
  editModal.addEventListener("click", (e) => {
    if (e.target === editModal) closeEditModal();
  });

  editForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    editError.style.display = "none";

    const payload = {
      name: editName.value.trim(),
      email: editEmail.value.trim(),
      username: editUsername.value.trim(),
      status: editStatus.value,
    };

    if (editPassword.value.trim()) {
      payload.password = editPassword.value.trim();
    }

    if (!payload.name || !payload.email || !payload.username) {
      editError.textContent = "Please fill out all fields.";
      editError.style.display = "block";
      return;
    }

    if (!isValidEmail(payload.email)) {
      editEmail.classList.add("is-invalid");
      editEmail.setCustomValidity("Invalid email address.");
      editError.textContent = "Please enter a valid email address.";
      editError.style.display = "block";
      editEmail.focus();
      return;
    }

    const userId = editId.value;
    const token = localStorage.getItem("x-api-token");

    try {
      const response = await fetch(`/api/users/${userId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": token,
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        const updatedUser = await response.json();
        allUsers = allUsers.map((user) =>
          String(user.id) === String(userId) ? updatedUser : user,
        );
        closeEditModal();
        showToast("User updated successfully");
        applySort();
        currentPage = 1;
        renderUsers();
        return;
      }

      let message = "Failed to update user.";
      try {
        const data = await response.json();
        if (data && data.message) message = data.message;
      } catch (_) {}

      editError.textContent = message;
      editError.style.display = "block";
    } catch (err) {
      editError.textContent = "Failed to update user.";
      editError.style.display = "block";
    }
  });

  editEmail.addEventListener("input", () => {
    const value = editEmail.value.trim();
    if (value.length === 0 || isValidEmail(value)) {
      editEmail.classList.remove("is-invalid");
      editEmail.setCustomValidity("");
    } else {
      editEmail.classList.add("is-invalid");
      editEmail.setCustomValidity("Invalid email address.");
    }
  });

  editModal.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && editModal.classList.contains("is-open")) {
      closeEditModal();
    }
  });

  // Confirmation dialog
  const confirmDeleteModal = document.getElementById("confirm-delete-modal");
  const confirmDeleteYes = document.getElementById("confirm-delete-yes");
  const confirmDeleteNo = document.getElementById("confirm-delete-no");
  const confirmDeleteClose = document.getElementById("confirm-delete-close");

  const openConfirmDeleteModal = (userId) => {
    pendingDeleteUserId = userId;
    confirmDeleteModal.classList.add("is-open");
    confirmDeleteModal.setAttribute("aria-hidden", "false");
  };

  const closeConfirmDeleteModal = () => {
    confirmDeleteModal.classList.remove("is-open");
    confirmDeleteModal.setAttribute("aria-hidden", "true");
    pendingDeleteUserId = null;
  };

  confirmDeleteClose.addEventListener("click", closeConfirmDeleteModal);
  confirmDeleteNo.addEventListener("click", closeConfirmDeleteModal);
  confirmDeleteYes.addEventListener("click", async () => {
    const userId = pendingDeleteUserId;
    const token = localStorage.getItem("x-api-token");
    const errorMsg = document.getElementById("error-msg");
    closeConfirmDeleteModal();

    try {
      const response = await fetch(`/api/users/${userId}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": token,
        },
      });

      if (response.status === 204) {
        allUsers = allUsers.filter(
          (user) => String(user.id) !== String(userId),
        );
        showToast("User deleted successfully");
        const totalPages = getTotalPages();
        if (currentPage > totalPages) {
          currentPage = Math.max(1, totalPages);
        }
        renderUsers();
        return;
      }

      let message = "Failed to delete user.";
      try {
        const data = await response.json();
        if (data && data.message) message = data.message;
      } catch (_) {}

      showToast(message, "error");
    } catch (err) {
      showToast("Failed to delete user.", "error");
    }
  });

  confirmDeleteModal.addEventListener("click", (e) => {
    if (e.target === confirmDeleteModal) closeConfirmDeleteModal();
  });

  // Table event listeners
  const tbody = document.querySelector("#users-table tbody");
  tbody.addEventListener("click", (e) => {
    const editBtn = e.target.closest(".edit-btn");
    const deleteBtn = e.target.closest(".delete-btn");
    if (!editBtn && !deleteBtn) return;

    const errorMsg = document.getElementById("error-msg");
    errorMsg.style.display = "none";

    if (editBtn) {
      const userId = editBtn.getAttribute("data-user-id");
      const user = allUsers.find((user) => String(user.id) === String(userId));
      if (!user) {
        errorMsg.textContent = "User not found.";
        errorMsg.style.display = "block";
        return;
      }
      openEditModal(user);
      return;
    }

    if (deleteBtn) {
      const userId = deleteBtn.getAttribute("data-user-id");
      openConfirmDeleteModal(userId);
    }
  });

  // Logout link clears token
  document
    .getElementById("logout-link")
    .addEventListener("click", function (e) {
      e.preventDefault();
      localStorage.removeItem("x-api-token");
      window.location.href = "index.html";
    });

  document.getElementById("refresh-btn").addEventListener("click", function () {
    fetchUsers();
  });

  document
    .getElementById("reset-btn")
    .addEventListener("click", async function () {
      const token = localStorage.getItem("x-api-token");
      const errorMsg = document.getElementById("error-msg");
      errorMsg.style.display = "none";
      try {
        const response = await fetch("/api/users/reset-data", {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": token,
          },
        });

        if (response.ok) {
          showToast("Data reset successfully");
          fetchUsers();
          return;
        }

        let message = "Failed to reset data.";
        try {
          const data = await response.json();
          if (data && data.message) message = data.message;
        } catch (_) {}

        showToast(message, "error");
      } catch (err) {
        showToast("Failed to reset data.", "error");
      }
    });

  // On page load
  fetchUsers();
});
