const fs = require("fs");
const path = require("path");

// data-backup.json is the tracked seed data. data.json is the app's working
// copy: it is created from the backup when missing and is not tracked in git.
const dataPath = path.join(__dirname, "../data/data.json");
const backupPath = path.join(__dirname, "../data/data-backup.json");

function resetData() {
  fs.copyFileSync(backupPath, dataPath);
}

function ensureDataFile() {
  if (!fs.existsSync(dataPath)) {
    resetData();
  }
}

function maxUserId(users) {
  return users.reduce((max, user) => (user.id > max ? user.id : max), 0);
}

// lastUserId is the highest id ever handed out. It only goes up, so a
// deleted user's id is never given to someone new. Files written before
// this field existed get it filled in from the users present.
function getData() {
  ensureDataFile();
  const fileContent = fs.readFileSync(dataPath, "utf-8");
  const data = JSON.parse(fileContent);
  if (!Number.isInteger(data.lastUserId)) {
    data.lastUserId = maxUserId(data.users || []);
  }
  return data;
}

function saveData(data) {
  data.lastUserId = Math.max(data.lastUserId || 0, maxUserId(data.users || []));
  fs.writeFileSync(dataPath, JSON.stringify(data, null, 2), "utf-8");
}

module.exports = { getData, saveData, resetData, ensureDataFile, maxUserId };
