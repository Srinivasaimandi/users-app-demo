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

function getData() {
  ensureDataFile();
  const fileContent = fs.readFileSync(dataPath, "utf-8");
  return JSON.parse(fileContent);
}

function saveData(data) {
  fs.writeFileSync(dataPath, JSON.stringify(data, null, 2), "utf-8");
}

module.exports = { getData, saveData, resetData, ensureDataFile };
