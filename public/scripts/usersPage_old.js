// Fetch and render users after login
let allUsers = [];
const themeKey = "users-app-theme";
const storedTheme = localStorage.getItem(themeKey);
if (storedTheme) {
  document.body.setAttribute("data-theme", storedTheme);
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
      allUsers = users;
      renderUsers(allUsers);
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

function renderUsers(users) {
  const tbody = document.querySelector("#users-table tbody");
  tbody.innerHTML = "";
  users
    .filter((user) => String(user.id) !== "0")
    .forEach((user) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
          <td>${user.id}</td>
          <td>${user.name}</td>
          <td>${user.email}</td>
          <td>${user.username}</td>
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
}

// Filter function
function filterUsers(query) {
  const q = query.toLowerCase().trim();
  if (!q) {
    renderUsers(allUsers);
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
  renderUsers(filtered);
}

// Search listener
document.addEventListener("DOMContentLoaded", () => {
  const searchInput = document.getElementById("search-input");
  searchInput.addEventListener("input", (e) => {
    filterUsers(e.target.value);
  });

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

  const isValidEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

  const openAddModal = () => {
    addError.style.display = "none";
    addForm.reset();
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
        await fetchUsers();
        return;
      }

      let message = "Failed to add user.";
      try {
        const data = await response.json();
        if (data && data.message) message = data.message;
      } catch (_) {
        // Ignore JSON parse errors
      }

      addError.textContent = message;
      addError.style.display = "block";
    } catch (err) {
      addError.textContent = "Failed to add user.";
      addError.style.display = "block";
    } finally {
      addSave.disabled = false;
    }
  });

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

  const openEditModal = (user) => {
    editError.style.display = "none";
    editId.value = user.id;
    editName.value = user.name || "";
    editEmail.value = user.email || "";
    editUsername.value = user.username || "";
    editPassword.value = "";
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
        const query = document.getElementById("search-input").value || "";
        filterUsers(query);
        return;
      }

      let message = "Failed to update user.";
      try {
        const data = await response.json();
        if (data && data.message) message = data.message;
      } catch (_) {
        // Ignore JSON parse errors
      }

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

  const tbody = document.querySelector("#users-table tbody");
  tbody.addEventListener("click", async (e) => {
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
      const token = localStorage.getItem("x-api-token");
      deleteBtn.disabled = true;
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
          const row = deleteBtn.closest("tr");
          if (row) row.remove();
          return;
        }

        let message = "Failed to delete user.";
        try {
          const data = await response.json();
          if (data && data.message) message = data.message;
        } catch (_) {
          // Ignore JSON parse errors
        }

        errorMsg.textContent = message;
        errorMsg.style.display = "block";
      } catch (err) {
        errorMsg.textContent = "Failed to delete user.";
        errorMsg.style.display = "block";
      } finally {
        deleteBtn.disabled = false;
      }
    }
  });
});

// Logout link clears token
document.getElementById("logout-link").addEventListener("click", function (e) {
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
        fetchUsers();
        return;
      }

      let message = "Failed to reset data.";
      try {
        const data = await response.json();
        if (data && data.message) message = data.message;
      } catch (_) {
        // Ignore JSON parse errors
      }

      errorMsg.textContent = message;
      errorMsg.style.display = "block";
    } catch (err) {
      errorMsg.textContent = "Failed to reset data.";
      errorMsg.style.display = "block";
    }
  });

// On page load
fetchUsers();
