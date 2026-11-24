// Fetch and render users after login
    let allUsers = [];
    // Must match PROTECTED_USER_IDS in utils/userValidation.js (admin, srinivasaimandi)
    const PROTECTED_USER_IDS = [0, 3];
    const themeKey = "users-app-theme";
    const storedTheme = localStorage.getItem(themeKey);
    if (storedTheme) {
      document.body.setAttribute("data-theme", storedTheme);
    }
    // The API key is missing or no longer valid (e.g. the server restarted): go back to login
    function redirectToLogin() {
      localStorage.removeItem('x-api-token');
      window.location.href = "index.html";
    }

    async function fetchUsers() {
      const token = localStorage.getItem('x-api-token');
      const errorMsg = document.getElementById('error-msg');
      const table = document.getElementById('users-table');
      if (!token) {
        redirectToLogin();
        return;
      }
      // Clear any message left over from an earlier action
      errorMsg.style.display = "none";
      try {
        const response = await fetch('/api/users', {
          method: 'GET',
          headers: {
            "Content-Type": "application/json",
            'x-api-key': token
          }
        });
        if (response.status === 401) {
          redirectToLogin();
          return;
        }
        if (response.status === 204) {
          allUsers = [];
          renderUsers(allUsers);
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
          allUsers = [];
          renderUsers(allUsers);
          errorMsg.textContent = "No users found.";
          errorMsg.style.display = "block";
        }
      } catch (err) {
        errorMsg.textContent = "Failed to fetch users.";
        errorMsg.style.display = "block";
      }
    }

    // Static markup only: user data is never inserted as HTML (see textCell)
    const LOCK_HTML = `
      <span class="protected-user" title="This user can't be edited or deleted" aria-label="Protected user">
        <i class="fas fa-lock"></i>
      </span>`;
    const ACTION_BUTTONS_HTML = `
      <button class="edit-btn" title="Edit row" aria-label="Edit row">
        <i class="fas fa-pen"></i>
      </button>
      <button class="delete-btn" title="Delete row" aria-label="Delete row">
        <i class="fas fa-trash"></i>
      </button>
      <button class="save-btn" title="Save changes" aria-label="Save changes" style="display: none;">
        Save
      </button>
      <button class="cancel-btn" title="Cancel editing" aria-label="Cancel editing" style="display: none;">
        Cancel
      </button>`;

    function textCell(value) {
      const td = document.createElement('td');
      td.textContent = value == null ? "" : String(value);
      return td;
    }

    function buildRow(user) {
      const tr = document.createElement('tr');
      tr.append(
        textCell(user.id),
        textCell(user.name),
        textCell(user.email),
        textCell(user.username)
      );
      const actionCell = document.createElement('td');
      actionCell.innerHTML = PROTECTED_USER_IDS.includes(Number(user.id))
        ? LOCK_HTML
        : ACTION_BUTTONS_HTML;
      actionCell.querySelectorAll('button').forEach(button => {
        button.dataset.userId = user.id;
      });
      tr.appendChild(actionCell);
      return tr;
    }

    // Searching re-draws the table, which would throw away unsaved edits,
    // so the search box is locked while any row is being edited.
    function updateSearchLock() {
      const searchInput = document.getElementById('search-input');
      const editing = !!document.querySelector('#users-table tbody .inline-input');
      searchInput.disabled = editing;
      searchInput.title = editing ? "Save or cancel your edit to search" : "";
    }

    function renderUsers(users) {
      const tbody = document.querySelector('#users-table tbody');
      tbody.innerHTML = "";
      users.filter(user => String(user.id) !== "0").forEach(user => {
        tbody.appendChild(buildRow(user));
      });
      updateSearchLock();
    }

    // Puts a row back to its saved (non-editing) state
    function restoreRow(row, userId) {
      const user = allUsers.find(u => String(u.id) === String(userId));
      if (user) {
        row.replaceWith(buildRow(user));
      } else {
        row.remove();
      }
      updateSearchLock();
    }

    // Filter function
    function filterUsers(query) {
      const q = query.toLowerCase().trim();
      if (!q) {
        renderUsers(allUsers);
        return;
      }
      const qCompact = q.replace(/\s+/g, "");
      const filtered = allUsers.filter(user => {
        const id = String(user.id || "").toLowerCase();
        const name = String(user.name || "").toLowerCase();
        const email = String(user.email || "").toLowerCase();
        const username = String(user.username || "").toLowerCase();
        const haystack = `${id} ${name} ${email} ${username}`;
        const haystackCompact = haystack.replace(/\s+/g, "");
        return (
          haystack.includes(q) ||
          (qCompact && haystackCompact.includes(qCompact))
        );
      });
      renderUsers(filtered);
    }

    // Search listener
    document.addEventListener('DOMContentLoaded', () => {
      const searchInput = document.getElementById('search-input');
      searchInput.addEventListener('input', (e) => {
        filterUsers(e.target.value);
      });

      const addBtn = document.getElementById('add-btn');
      const addModal = document.getElementById('add-user-modal');
      const addForm = document.getElementById('add-user-form');
      const addClose = document.getElementById('add-user-close');
      const addCancel = document.getElementById('add-user-cancel');
      const addError = document.getElementById('add-user-error');
      const addSave = document.getElementById('add-user-save');
      const addName = document.getElementById('add-name');
      const addEmail = document.getElementById('add-email');
      const addUsername = document.getElementById('add-username');
      const addPassword = document.getElementById('add-password');

      const isValidEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

      const openAddModal = () => {
        addError.style.display = "none";
        addForm.reset();
        addModal.classList.add('is-open');
        addModal.setAttribute('aria-hidden', 'false');
        addName.focus();
      };

      const closeAddModal = () => {
        addModal.classList.remove('is-open');
        addModal.setAttribute('aria-hidden', 'true');
      };

      // Delete confirmation: resolves true if the user clicks Delete
      const deleteModal = document.getElementById('delete-user-modal');
      const deleteMessage = document.getElementById('delete-user-message');
      const deleteConfirm = document.getElementById('delete-user-confirm');
      const deleteCancel = document.getElementById('delete-user-cancel');
      const deleteClose = document.getElementById('delete-user-close');
      let resolveDelete = null;

      const confirmDelete = (user) => {
        deleteMessage.textContent = user
          ? `Delete ${user.name} (${user.username})? This can't be undone.`
          : "Delete this user? This can't be undone.";
        deleteModal.classList.add('is-open');
        deleteModal.setAttribute('aria-hidden', 'false');
        deleteCancel.focus();
        return new Promise(resolve => { resolveDelete = resolve; });
      };

      const closeDeleteModal = (confirmed) => {
        deleteModal.classList.remove('is-open');
        deleteModal.setAttribute('aria-hidden', 'true');
        if (resolveDelete) {
          resolveDelete(confirmed);
          resolveDelete = null;
        }
      };

      deleteConfirm.addEventListener('click', () => closeDeleteModal(true));
      deleteCancel.addEventListener('click', () => closeDeleteModal(false));
      deleteClose.addEventListener('click', () => closeDeleteModal(false));
      deleteModal.addEventListener('click', (e) => {
        if (e.target === deleteModal) closeDeleteModal(false);
      });

      addBtn.addEventListener('click', openAddModal);
      addClose.addEventListener('click', closeAddModal);
      addCancel.addEventListener('click', closeAddModal);
      addModal.addEventListener('click', (e) => {
        if (e.target === addModal) closeAddModal();
      });

      addEmail.addEventListener('input', () => {
        const value = addEmail.value.trim();
        if (value.length === 0 || isValidEmail(value)) {
          addEmail.classList.remove('is-invalid');
          addEmail.setCustomValidity("");
        } else {
          addEmail.classList.add('is-invalid');
          addEmail.setCustomValidity("Invalid email address.");
        }
      });

      document.addEventListener('keydown', (e) => {
        if (e.key !== 'Escape') return;
        if (addModal.classList.contains('is-open')) {
          closeAddModal();
        } else if (deleteModal.classList.contains('is-open')) {
          closeDeleteModal(false);
        } else if (e.target.classList && e.target.classList.contains('inline-input')) {
          const row = e.target.closest('tr');
          const cancelBtn = row && row.querySelector('.cancel-btn');
          if (cancelBtn) restoreRow(row, cancelBtn.dataset.userId);
        }
      });

      addForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        addError.style.display = "none";

        const payload = {
          name: addName.value.trim(),
          email: addEmail.value.trim(),
          username: addUsername.value.trim(),
          password: addPassword.value.trim()
        };

        if (!payload.name || !payload.email || !payload.username || !payload.password) {
          addError.textContent = "Please fill out all fields.";
          addError.style.display = "block";
          return;
        }

        if (!isValidEmail(payload.email)) {
          addEmail.classList.add('is-invalid');
          addEmail.setCustomValidity("Invalid email address.");
          addError.textContent = "Please enter a valid email address.";
          addError.style.display = "block";
          addEmail.focus();
          return;
        }

        const token = localStorage.getItem('x-api-token');
        addSave.disabled = true;
        try {
          const response = await fetch('/api/users', {
            method: 'POST',
            headers: {
              "Content-Type": "application/json",
              'x-api-key': token
            },
            body: JSON.stringify(payload)
          });

          if (response.status === 401) {
            redirectToLogin();
            return;
          }
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

      const tbody = document.querySelector('#users-table tbody');
      tbody.addEventListener('click', async (e) => {
        const editBtn = e.target.closest('.edit-btn');
        const deleteBtn = e.target.closest('.delete-btn');
        const saveBtn = e.target.closest('.save-btn');
        const cancelBtn = e.target.closest('.cancel-btn');
        if (!editBtn && !deleteBtn && !saveBtn && !cancelBtn) return;

        const errorMsg = document.getElementById('error-msg');
        errorMsg.style.display = "none";

        if (editBtn) {
          const row = editBtn.closest('tr');
          if (!row) return;
          const cells = row.querySelectorAll('td');
          const name = cells[1].textContent.trim();
          const email = cells[2].textContent.trim();
          const username = cells[3].textContent.trim();

          const makeInput = (type, value) => {
            const input = document.createElement('input');
            input.className = "inline-input";
            input.type = type;
            input.value = value;
            return input;
          };
          cells[1].replaceChildren(makeInput("text", name));
          cells[2].replaceChildren(makeInput("email", email));
          cells[3].replaceChildren(makeInput("text", username));

          const actionCell = cells[4];
          actionCell.querySelector('.edit-btn').style.display = "none";
          actionCell.querySelector('.delete-btn').style.display = "none";
          actionCell.querySelector('.save-btn').style.display = "inline-flex";
          actionCell.querySelector('.cancel-btn').style.display = "inline-flex";
          updateSearchLock();
          cells[1].querySelector('input').focus();
          return;
        }

        if (cancelBtn) {
          const row = cancelBtn.closest('tr');
          if (row) restoreRow(row, cancelBtn.dataset.userId);
          return;
        }

        if (saveBtn) {
          const row = saveBtn.closest('tr');
          if (!row) return;
          const userId = saveBtn.getAttribute('data-user-id');
          const inputs = row.querySelectorAll('.inline-input');
          const [nameInput, emailInput, usernameInput] = inputs;
          const payload = {
            name: nameInput.value.trim(),
            email: emailInput.value.trim(),
            username: usernameInput.value.trim()
          };

          const token = localStorage.getItem('x-api-token');
          saveBtn.disabled = true;
          try {
            const response = await fetch(`/api/users/${userId}`, {
              method: 'PUT',
              headers: {
                "Content-Type": "application/json",
                'x-api-key': token
              },
              body: JSON.stringify(payload)
            });

            if (response.status === 401) {
              redirectToLogin();
              return;
            }
            if (response.ok) {
              const updatedUser = await response.json();
              allUsers = allUsers.map(user =>
                String(user.id) === String(userId) ? updatedUser : user
              );
              restoreRow(row, userId);
              return;
            }

            let message = "Failed to update user.";
            try {
              const data = await response.json();
              if (data && data.message) message = data.message;
            } catch (_) {
              // Ignore JSON parse errors
            }

            errorMsg.textContent = message;
            errorMsg.style.display = "block";
          } catch (err) {
            errorMsg.textContent = "Failed to update user.";
            errorMsg.style.display = "block";
          } finally {
            saveBtn.disabled = false;
          }
          return;
        }

        if (deleteBtn) {
          const userId = deleteBtn.getAttribute('data-user-id');
          const user = allUsers.find(u => String(u.id) === String(userId));
          if (!(await confirmDelete(user))) return;
          const token = localStorage.getItem('x-api-token');
          deleteBtn.disabled = true;
          try {
            const response = await fetch(`/api/users/${userId}`, {
              method: 'DELETE',
              headers: {
                "Content-Type": "application/json",
                'x-api-key': token
              }
            });

            if (response.status === 401) {
              redirectToLogin();
              return;
            }
            if (response.status === 204) {
              allUsers = allUsers.filter(user => String(user.id) !== String(userId));
              const row = deleteBtn.closest('tr');
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
    document.getElementById('logout-link').addEventListener('click', async function (e) {
      e.preventDefault();
      const token = localStorage.getItem('x-api-token');
      try {
        // Revoke the key on the server so it can't be reused
        await fetch('/api/logout', { method: 'POST', headers: { 'x-api-key': token } });
      } catch (_) {
        // Log out locally even if the server can't be reached
      }
      localStorage.removeItem('x-api-token');
      window.location.href = "index.html";
    });

    document.getElementById('refresh-btn').addEventListener('click', function () {
      document.getElementById('search-input').value = "";
      fetchUsers();
    });

    document.getElementById('reset-btn').addEventListener('click', async function () {
      const token = localStorage.getItem('x-api-token');
      const errorMsg = document.getElementById('error-msg');
      errorMsg.style.display = "none";
      try {
        const response = await fetch('/api/users/reset-data', {
          method: 'PUT',
          headers: {
            "Content-Type": "application/json",
            'x-api-key': token
          }
        });

        if (response.status === 401) {
          redirectToLogin();
          return;
        }
        if (response.ok) {
          document.getElementById('search-input').value = "";
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
