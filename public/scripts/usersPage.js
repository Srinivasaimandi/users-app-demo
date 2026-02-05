// Fetch and render users after login
    let allUsers = [];
    async function fetchUsers() {
      const token = localStorage.getItem('x-api-token');
      const errorMsg = document.getElementById('error-msg');
      const table = document.getElementById('users-table');
      if (!token) {
        errorMsg.textContent = "You must login first.";
        errorMsg.style.display = "block";
        return;
      }
      try {
        const response = await fetch('/api/users', {
          method: 'GET',
          headers: {
            "Content-Type": "application/json",
            'x-api-key': token
          }
        });
        if (response.status === 401 || response.status === 403) {
          errorMsg.textContent = "Unauthorized. Please login again.";
          errorMsg.style.display = "block";
          localStorage.removeItem('x-api-token');
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
      const tbody = document.querySelector('#users-table tbody');
      tbody.innerHTML = "";
      users.slice(1).forEach(user => {
        const tr = document.createElement('tr');
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
            <button class="save-btn" data-user-id="${user.id}" title="Save changes" aria-label="Save changes" style="display: none;">
              Save
            </button>
          </td>
        `;
        tbody.appendChild(tr);
      });
    }

    // Filter function
    function filterUsers(query) {
      const filtered = allUsers.filter(user =>
        user.name.toLowerCase().includes(query.toLowerCase()) ||
        user.email.toLowerCase().includes(query.toLowerCase())
      );
      renderUsers(filtered);
    }

    // Search listener
    document.addEventListener('DOMContentLoaded', () => {
      const searchInput = document.getElementById('search-input');
      searchInput.addEventListener('input', (e) => {
        filterUsers(e.target.value);
      });

      const tbody = document.querySelector('#users-table tbody');
      tbody.addEventListener('click', async (e) => {
        const editBtn = e.target.closest('.edit-btn');
        const deleteBtn = e.target.closest('.delete-btn');
        const saveBtn = e.target.closest('.save-btn');
        if (!editBtn && !deleteBtn && !saveBtn) return;

        const errorMsg = document.getElementById('error-msg');
        errorMsg.style.display = "none";

        if (editBtn) {
          const row = editBtn.closest('tr');
          if (!row) return;
          const cells = row.querySelectorAll('td');
          const name = cells[1].textContent.trim();
          const email = cells[2].textContent.trim();
          const username = cells[3].textContent.trim();

          cells[1].innerHTML = `<input class="inline-input" type="text" value="${name}">`;
          cells[2].innerHTML = `<input class="inline-input" type="email" value="${email}">`;
          cells[3].innerHTML = `<input class="inline-input" type="text" value="${username}">`;

          const actionCell = cells[4];
          actionCell.querySelector('.edit-btn').style.display = "none";
          actionCell.querySelector('.delete-btn').style.display = "none";
          actionCell.querySelector('.save-btn').style.display = "inline-flex";
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

            if (response.ok) {
              const updatedUser = await response.json();
              allUsers = allUsers.map(user =>
                String(user.id) === String(userId) ? updatedUser : user
              );
              const query = document.getElementById('search-input').value || "";
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
    document.getElementById('logout-link').addEventListener('click', function (e) {
      e.preventDefault();
      localStorage.removeItem('x-api-token');
      window.location.href = "index.html";
    });

    document.getElementById('refresh-btn').addEventListener('click', function () {
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
