/**
 * @author: srinivasaimandi
 */

const fs = require("fs");
const path = require("path");

const { getData, saveData } = require("../utils/dataUtils");
const User = require("../models/User");

exports.getAllUsers = (req, res) => {
  try {
    const data = getData();
    if (data.users && data.users.length > 0) {
      res.status(200).json(data.users);
    } else {
      // No Content
      res.status(204).json([]);
    }
  } catch (error) {
    res
      .status(500)
      .json({ message: "Failed to fetch users.", error: error.message });
  }
};

exports.searchUsers = (req, res) => {
  try {
    const data = getData();
    const { name, email } = req.query;
    let results = data.users;

    if (name) {
      results = results.filter((user) =>
        user.name.toLowerCase().includes(name.toLowerCase()),
      );
    }
    if (email) {
      results = results.filter((user) =>
        user.email.toLowerCase().includes(email.toLowerCase()),
      );
    }

    if (results.length > 0) {
      res.status(200).json(results);
    } else {
      // No Content
      res.status(204).json([]);
    }
  } catch (error) {
    res
      .status(500)
      .json({ message: "Failed to search users.", error: error.message });
  }
};

exports.getUserCount = (req, res) => {
  try {
    const data = getData();
    res.status(200).json({ count: data.users.length });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Failed to get user count.", error: error.message });
  }
};

exports.getUserById = (req, res) => {
  try {
    const data = getData();
    const userId = parseInt(req.params.id, 10);
    const user = data.users.find((user) => user.id === userId);

    if (user) {
      res.status(200).json(user);
    } else {
      res.status(404).json({ message: "User not found" });
    }
  } catch (error) {
    res
      .status(500)
      .json({ message: "Failed to fetch user.", error: error.message });
  }
};

exports.createUser = (req, res) => {
  const data = getData();
  const newUserData = req.body;
  const maxId = data.users.reduce(
    (max, user) => (user.id > max ? user.id : max),
    0,
  );
  const newUser = new User({
    id: maxId + 1,
    name: newUserData.name,
    email: newUserData.email,
    username: newUserData.username,
    password: newUserData.password,
    status: newUserData.status || "active",
  });
  if (
    !newUser.name ||
    !newUser.email ||
    !newUser.username ||
    !newUser.password
  ) {
    return res
      .status(400)
      .json({ message: "All fields are required for each user" });
  } else if (
    data.users.some((existingUser) => existingUser.email === newUser.email)
  ) {
    return res
      .status(400)
      .json({ message: `Email ${newUser.email} already exists` });
  } else if (
    data.users.some(
      (existingUser) => existingUser.username === newUser.username,
    )
  ) {
    return res
      .status(400)
      .json({ message: `Username ${newUser.username} already exists` });
  } else {
    data.users.push(newUser);
    saveData(data);
    return res.status(201).json(newUser);
  }
};

exports.bulkAddUsers = (req, res) => {
  const data = getData();
  const newUsersData = req.body;
  const maxId = data.users.reduce(
    (max, user) => (user.id > max ? user.id : max),
    0,
  );
  const newUsers = newUsersData.map(
    (userData, index) =>
      new User({
        id: maxId + index + 2,
        name: userData.name,
        email: userData.email,
        username: userData.username,
        password: userData.password,
        status: userData.status || "active",
      }),
  );
  for (const user of newUsers) {
    if (!user.name || !user.email || !user.username || !user.password) {
      return res
        .status(400)
        .json({ message: "All fields are required for each user" });
    } else if (
      data.users.some((existingUser) => existingUser.email === user.email)
    ) {
      return res
        .status(400)
        .json({ message: `Email ${user.email} already exists` });
    } else if (
      data.users.some((existingUser) => existingUser.username === user.username)
    ) {
      return res
        .status(400)
        .json({ message: `Username ${user.username} already exists` });
    } else {
      data.users.push(user);
    }
  }
  saveData(data);
  res.status(201).json(newUsers);
};

exports.updateUser = (req, res) => {
  const data = getData();
  const userId = parseInt(req.params.id, 10);
  const userIndex = data.users.findIndex((user) => user.id === userId);

  if (userIndex !== -1) {
    const allowedFields = ["name", "email", "username", "password", "status"];
    const updates = {};
    for (const key of allowedFields) {
      if (req.body[key] !== undefined) {
        updates[key] = req.body[key];
      }
    }
    const updatedUser = { ...data.users[userIndex], ...updates };
    data.users[userIndex] = updatedUser;
    saveData(data);
    res.status(200).json(updatedUser);
  } else {
    res.status(404).json({ message: "User not found" });
  }
};

exports.deleteUser = (req, res) => {
  const data = getData();
  const userId = parseInt(req.params.id, 10);
  const userIndex = data.users.findIndex((user) => user.id === userId);

  if (userId === 3) {
    return res
      .status(403)
      .json({ message: `User with id ${userId} is restricted from deleting` });
  } else if (userIndex === -1) {
    return res.status(404).json({ message: "User not found" });
  } else {
    data.users.splice(userIndex, 1);
    saveData(data);
    return res.status(204).send({ message: "User deleted successfully" });
  }
};

exports.resetData = (req, res) => {
  const backupPath = path.join(__dirname, "../data/data-backup.json");
  const dataPath = path.join(__dirname, "../data/data.json");

  try {
    const backupContent = fs.readFileSync(backupPath, "utf-8");
    fs.writeFileSync(dataPath, backupContent, "utf-8");

    // Reset Node.js require cache for data.json
    const dataJsonPath = require.resolve(dataPath);
    if (require.cache[dataJsonPath]) {
      delete require.cache[dataJsonPath];
    }

    res.status(200).json({ message: "Data has been reset from backup." });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Failed to reset data.", error: error.message });
  }
};
