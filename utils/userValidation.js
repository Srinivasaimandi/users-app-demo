/**
 * @author: srinivasaimandi
 */

const USER_FIELDS = ["name", "email", "username", "password"];

// Users that cannot be edited or deleted: admin (0) and srinivasaimandi (3).
const PROTECTED_USER_IDS = [0, 3];

const isBlank = (value) => typeof value !== "string" || value.trim() === "";

// Same rule as the Add User form in public/scripts/usersPage.js
const isValidEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

// Emails are unique regardless of case: Bob@x.com and bob@x.com are the same address
const sameEmail = (a, b) =>
  typeof a === "string" && typeof b === "string" && a.toLowerCase() === b.toLowerCase();

/**
 * Checks a new user against the existing users.
 * Returns an error message, or null if the user is valid.
 */
function validateNewUser(users, user) {
  if (USER_FIELDS.some((field) => isBlank(user[field]))) {
    return "All fields are required for each user";
  }
  if (!isValidEmail(user.email)) {
    return `Email ${user.email} is not a valid email address`;
  }
  if (users.some((existing) => sameEmail(existing.email, user.email))) {
    return `Email ${user.email} already exists`;
  }
  if (users.some((existing) => existing.username === user.username)) {
    return `Username ${user.username} already exists`;
  }
  return null;
}

/**
 * Checks partial updates to the user with the given id.
 * Only fields present in `updates` are checked; uniqueness ignores the user itself.
 * Returns an error message, or null if the updates are valid.
 */
function validateUserUpdate(users, userId, updates) {
  const blankField = USER_FIELDS.find(
    (field) => updates[field] !== undefined && isBlank(updates[field])
  );
  if (blankField) {
    return `${blankField} cannot be empty`;
  }
  if (updates.email !== undefined && !isValidEmail(updates.email)) {
    return `Email ${updates.email} is not a valid email address`;
  }
  const others = users.filter((existing) => existing.id !== userId);
  if (
    updates.email !== undefined &&
    others.some((existing) => sameEmail(existing.email, updates.email))
  ) {
    return `Email ${updates.email} already exists`;
  }
  if (
    updates.username !== undefined &&
    others.some((existing) => existing.username === updates.username)
  ) {
    return `Username ${updates.username} already exists`;
  }
  return null;
}

/**
 * Copies only the known user fields that are present in `source`,
 * trimming surrounding spaces. The login form trims what people type, so a
 * username or password saved with spaces could never be used to log in.
 */
function pickUserUpdates(source) {
  const updates = {};
  if (!source || typeof source !== "object") return updates;
  for (const field of USER_FIELDS) {
    const value = source[field];
    if (value !== undefined && value !== null) {
      updates[field] = typeof value === "string" ? value.trim() : value;
    }
  }
  return updates;
}

/** Parses a user id from a URL; only plain whole numbers are accepted ("4abc" is not 4). */
function parseUserId(value) {
  return /^\d+$/.test(String(value)) ? Number(value) : null;
}

function nextUserId(users) {
  return users.reduce((max, user) => (user.id > max ? user.id : max), 0) + 1;
}

module.exports = {
  PROTECTED_USER_IDS,
  validateNewUser,
  validateUserUpdate,
  pickUserUpdates,
  parseUserId,
  nextUserId,
};
