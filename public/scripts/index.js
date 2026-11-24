
// UI link click handler
document.getElementById("ui-link").addEventListener("click", function (e) {
  e.preventDefault();
  document.getElementById("title-msg").style.display = "none";
  // #links has Bootstrap's d-flex (display: flex !important), so a plain inline style can't hide it
  document.getElementById("links").style.setProperty("display", "none", "important");
  document.getElementById("login-credentials").style.display = "block";
});

document.getElementById("back-arrow").addEventListener("click", function (e) {
  e.preventDefault();
  document.getElementById("title-msg").style.display = "";
  document.getElementById("links").style.removeProperty("display");
  document.getElementById("login-credentials").style.display = "none";
});

// Theme cycle on clicking "Users"
const themeCycle = ["cool", "warm", "fresh"];
const themeKey = "users-app-theme";
const themeToggle = document.getElementById("theme-toggle");
const storedTheme = localStorage.getItem(themeKey);
let themeIndex = storedTheme ? Math.max(themeCycle.indexOf(storedTheme), 0) : 0;
document.body.setAttribute("data-theme", themeCycle[themeIndex]);

themeToggle.addEventListener("click", () => {
  themeIndex = (themeIndex + 1) % themeCycle.length;
  const nextTheme = themeCycle[themeIndex];
  document.body.setAttribute("data-theme", nextTheme);
  localStorage.setItem(themeKey, nextTheme);
});

// Login form handler
document
  .getElementById("login-form")
  .addEventListener("submit", async function (e) {
    e.preventDefault();
    const username = document.getElementById("username-id").value.trim();
    const password = document.getElementById("password-id").value.trim();
    const errorMsg = document.getElementById("login-error");
    const successMsg = document.getElementById("login-success");
    errorMsg.style.display = "none";
    successMsg.style.display = "none";
    if (!username || !password) {
      errorMsg.textContent = "Please enter both username and password.";
      errorMsg.style.display = "block";
      return;
    }
    try {
      const response = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await response.json();
      if (response.ok && data.apiKey) {
        localStorage.setItem("x-api-token", data.apiKey);
        successMsg.textContent = "Login successful! Redirecting...";
        successMsg.style.display = "block";
        setTimeout(() => {
          window.location.href = "usersPage.html";
        }, 1000);
      } else {
        errorMsg.textContent = data.message || "Login failed.";
        errorMsg.style.display = "block";
      }
    } catch (err) {
      errorMsg.textContent = "Network error. Please try again.";
      errorMsg.style.display = "block";
    }
  });
