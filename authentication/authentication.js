/* ============================================================
   NEWSWAVE — Authentication JavaScript
   Handles login & signup form validation + UX
   ============================================================ */

"use strict";

// ─────────────────────────────────────────────
// UTILITIES
// ─────────────────────────────────────────────

function $(id) { return document.getElementById(id); }

function setError(fieldId, message) {
  const fg  = $(`fg-${fieldId}`);
  const err = $(`err-${fieldId}`);
  if (fg)  fg.classList.add("has-error");
  if (fg)  fg.classList.remove("is-valid");
  if (err) err.textContent = message;
}

function setValid(fieldId) {
  const fg  = $(`fg-${fieldId}`);
  const err = $(`err-${fieldId}`);
  if (fg)  fg.classList.remove("has-error");
  if (fg)  fg.classList.add("is-valid");
  if (err) err.textContent = "";
}

function clearField(fieldId) {
  const fg  = $(`fg-${fieldId}`);
  const err = $(`err-${fieldId}`);
  if (fg)  fg.classList.remove("has-error", "is-valid");
  if (err) err.textContent = "";
}

function showAlert(type, message) {
  const el = $("formAlert");
  if (!el) return;
  el.className = `form-alert ${type}`;
  el.textContent = message;
}

function hideAlert() {
  const el = $("formAlert");
  if (!el) return;
  el.className = "form-alert";
  el.textContent = "";
}

function setLoading(isLoading) {
  const btn = $("submitBtn");
  if (!btn) return;
  btn.disabled = isLoading;
  btn.classList.toggle("loading", isLoading);
}

// Validate email format
function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

// ─────────────────────────────────────────────
// SOCIAL LOGIN (stub — wire up your OAuth here)
// ─────────────────────────────────────────────
window.socialLogin = function(provider) {
  showAlert("success", `Redirecting to ${provider}… (connect your OAuth provider)`);
};

// ─────────────────────────────────────────────
// PASSWORD TOGGLE
// ─────────────────────────────────────────────
const togglePw = $("togglePw");
if (togglePw) {
  togglePw.addEventListener("click", () => {
    const pw = $("password");
    if (!pw) return;
    const isText = pw.type === "text";
    pw.type = isText ? "password" : "text";
    togglePw.textContent = isText ? "👁" : "🙈";
  });
}

// ─────────────────────────────────────────────
// PASSWORD STRENGTH METER (signup only)
// ─────────────────────────────────────────────
const pwInput   = $("password");
const pwBar     = $("pwBar");
const pwLabel   = $("pwLabel");

if (pwInput && pwBar && pwLabel) {
  pwInput.addEventListener("input", () => {
    const val = pwInput.value;
    const score = getPasswordScore(val);
    const levels = [
      { pct: 0,   color: "transparent",     label: "" },
      { pct: 25,  color: "#ff6b6b",         label: "Weak" },
      { pct: 50,  color: "#f5c842",         label: "Fair" },
      { pct: 75,  color: "#4f83ff",         label: "Good" },
      { pct: 100, color: "#00e5a0",         label: "Strong" },
    ];
    const { pct, color, label } = levels[score];
    pwBar.style.width     = `${pct}%`;
    pwBar.style.background = color;
    pwLabel.textContent   = val.length ? label : "";
    pwLabel.style.color   = color;
  });
}

function getPasswordScore(pw) {
  if (!pw.length) return 0;
  let score = 0;
  if (pw.length >= 8)                     score++;
  if (/[A-Z]/.test(pw))                  score++;
  if (/[0-9]/.test(pw))                  score++;
  if (/[^A-Za-z0-9]/.test(pw))          score++;
  return score;
}

// ─────────────────────────────────────────────
// LOGIN FORM
// ─────────────────────────────────────────────
const loginForm = $("loginForm");
if (loginForm) {
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    hideAlert();

    const email    = $("email")?.value.trim() || "";
    const password = $("password")?.value || "";
    let valid = true;

    // Validate email
    clearField("email");
    if (!email) {
      setError("email", "Email is required."); valid = false;
    } else if (!isValidEmail(email)) {
      setError("email", "Enter a valid email address."); valid = false;
    } else {
      setValid("email");
    }

    // Validate password
    clearField("password");
    if (!password) {
      setError("password", "Password is required."); valid = false;
    } else if (password.length < 6) {
      setError("password", "Password must be at least 6 characters."); valid = false;
    } else {
      setValid("password");
    }

    if (!valid) return;

    // ── Simulate API call (replace with your real auth logic) ──
    setLoading(true);

    try {
      await simulateApiCall(1200);

      // SUCCESS — redirect or store token
      showAlert("success", "✓ Signed in! Redirecting to home…");
      setTimeout(() => {
        window.location.href = "../index.html";
      }, 1200);

    } catch (err) {
      showAlert("error", "Invalid email or password. Please try again.");
    } finally {
      setLoading(false);
    }
  });

  // Real-time email validation
  $("email")?.addEventListener("blur", () => {
    const val = $("email")?.value.trim();
    if (!val) return;
    if (!isValidEmail(val)) setError("email", "Enter a valid email address.");
    else setValid("email");
  });
}

// ─────────────────────────────────────────────
// SIGNUP FORM
// ─────────────────────────────────────────────
const signupForm = $("signupForm");
if (signupForm) {
  signupForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    hideAlert();

    const firstname = $("firstname")?.value.trim() || "";
    const lastname  = $("lastname")?.value.trim()  || "";
    const email     = $("email")?.value.trim()      || "";
    const password  = $("password")?.value          || "";
    const confirm   = $("confirm")?.value           || "";
    const terms     = $("terms")?.checked;
    let valid = true;

    // First name
    clearField("firstname");
    if (!firstname) {
      setError("firstname", "First name required."); valid = false;
    } else {
      setValid("firstname");
    }

    // Last name
    clearField("lastname");
    if (!lastname) {
      setError("lastname", "Last name required."); valid = false;
    } else {
      setValid("lastname");
    }

    // Email
    clearField("email");
    if (!email) {
      setError("email", "Email is required."); valid = false;
    } else if (!isValidEmail(email)) {
      setError("email", "Enter a valid email address."); valid = false;
    } else {
      setValid("email");
    }

    // Password
    clearField("password");
    if (!password) {
      setError("password", "Password is required."); valid = false;
    } else if (password.length < 8) {
      setError("password", "Password must be at least 8 characters."); valid = false;
    } else if (getPasswordScore(password) < 2) {
      setError("password", "Password is too weak. Add numbers or symbols."); valid = false;
    } else {
      setValid("password");
    }

    // Confirm password
    clearField("confirm");
    if (!confirm) {
      setError("confirm", "Please confirm your password."); valid = false;
    } else if (confirm !== password) {
      setError("confirm", "Passwords do not match."); valid = false;
    } else {
      setValid("confirm");
    }

    // Terms
    const errTerms = $("err-terms");
    if (!terms) {
      if (errTerms) errTerms.textContent = "You must accept the terms to continue.";
      valid = false;
    } else {
      if (errTerms) errTerms.textContent = "";
    }

    if (!valid) return;

    // ── Simulate API call ──
    setLoading(true);

    try {
      await simulateApiCall(1500);

      showAlert("success", "✓ Account created! Welcome to NewsWave!");
      setTimeout(() => {
        window.location.href = "../index.html";
      }, 1400);

    } catch (err) {
      showAlert("error", "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  });

  // Real-time confirm password check
  $("confirm")?.addEventListener("input", () => {
    const pw  = $("password")?.value  || "";
    const cfm = $("confirm")?.value   || "";
    if (!cfm) return clearField("confirm");
    if (cfm === pw) setValid("confirm");
    else setError("confirm", "Passwords do not match.");
  });
}

// ─────────────────────────────────────────────
// FORGOT PASSWORD (stub)
// ─────────────────────────────────────────────
window.forgotPassword = function(e) {
  e.preventDefault();
  const email = $("email")?.value.trim();
  if (!email || !isValidEmail(email)) {
    setError("email", "Enter your email above first.");
    $("email")?.focus();
    return;
  }
  showAlert("success", `✓ Password reset link sent to ${email}`);
};

// ─────────────────────────────────────────────
// SIMULATE API CALL
// Replace this with your real backend / Firebase / Supabase etc.
// ─────────────────────────────────────────────
function simulateApiCall(ms) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      // Simulate ~90% success rate for demo
      Math.random() > 0.05 ? resolve() : reject(new Error("Network error"));
    }, ms);
  });
}

// ─────────────────────────────────────────────
// ENTER KEY submit
// ─────────────────────────────────────────────
document.addEventListener("keydown", e => {
  if (e.key === "Enter") {
    const form = loginForm || signupForm;
    if (form) form.dispatchEvent(new Event("submit", { cancelable: true, bubbles: true }));
  }
});