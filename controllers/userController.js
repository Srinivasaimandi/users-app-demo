/**
 * @author: srinivasaimandi
 */

const { getData, saveData, resetData } = require("../utils/dataUtils");
const User = require("../models/User");
const {
  PROTECTED_USER_IDS,
  validateNewUser,
  validateUserUpdate,
  pickUserUpdates,
  parseUserId,
  nextUserId,
} = require("../utils/userValidation");

exports.getAllUsers = (req, res) => {
  try {
    const data = getData();
    if (data.users && data.users.length > 0) {
      res.status(200).json(data.users.map(User.toPublic));
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
    // ?name=a&name=b arrives as an array; only a single value is supported
    for (const [param, value] of Object.entries({ name, email })) {
      if (value !== undefined && typeof value !== "string") {
        return res
          .status(400)
          .json({ message: `Query parameter ${param} must be a single value` });
      }
    }
    let results = data.users;

    if (name) {
      results = results.filter((user) =>
        user.name.toLowerCase().includes(name.toLowerCase())
      );
    }
    if (email) {
      results = results.filter((user) =>
        user.email.toLowerCase().includes(email.toLowerCase())
      );
    }

    if (results.length > 0) {
      res.status(200).json(results.map(User.toPublic));
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
    const userId = parseUserId(req.params.id);
    const user = data.users.find((user) => user.id === userId);

    if (user) {
      res.status(200).json(User.toPublic(user));
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
  const newUserData = pickUserUpdates(req.body);
  const newUser = new User({
    id: nextUserId(data),
    name: newUserData.name,
    email: newUserData.email,
    username: newUserData.username,
    password: newUserData.password,
  });
  const error = validateNewUser(data.users, newUser);
  if (error) {
    return res.status(400).json({ message: error });
  }
  data.users.push(newUser);
  saveData(data);
  return res.status(201).json(User.toPublic(newUser));
};

exports.bulkAddUsers = (req, res) => {
  const data = getData();
  const newUsersData = req.body;
  if (!Array.isArray(newUsersData)) {
    return res
      .status(400)
      .json({ message: "Request body must be an array of users" });
  }
  const newUsers = [];
  for (const userData of newUsersData) {
    const fields = pickUserUpdates(userData);
    const user = new User({
      id: nextUserId(data),
      name: fields.name,
      email: fields.email,
      username: fields.username,
      password: fields.password,
    });
    // Users already pushed in this batch count as existing, so duplicates
    // within the batch are rejected too. Nothing is saved unless all pass.
    const error = validateNewUser(data.users, user);
    if (error) {
      return res.status(400).json({ message: error });
    }
    data.users.push(user);
    newUsers.push(user);
  }
  saveData(data);
  res.status(201).json(newUsers.map(User.toPublic));
};

exports.updateUser = (req, res) => {
  const data = getData();
  const userId = parseUserId(req.params.id);
  const userIndex = data.users.findIndex((user) => user.id === userId);

  if (PROTECTED_USER_IDS.includes(userId)) {
    return res
      .status(403)
      .json({ message: `User with id ${userId} is restricted from editing` });
  }
  if (userIndex === -1) {
    return res.status(404).json({ message: "User not found" });
  }
  const updates = pickUserUpdates(req.body);
  const error = validateUserUpdate(data.users, userId, updates);
  if (error) {
    return res.status(400).json({ message: error });
  }
  const updatedUser = { ...data.users[userIndex], ...updates };
  data.users[userIndex] = updatedUser;
  saveData(data);
  res.status(200).json(User.toPublic(updatedUser));
};

exports.deleteUser = (req, res) => {
  const data = getData();
  const userId = parseUserId(req.params.id);
  const userIndex = data.users.findIndex((user) => user.id === userId);

  if (PROTECTED_USER_IDS.includes(userId)) {
    return res
      .status(403)
      .json({ message: `User with id ${userId} is restricted from deleting` });
  } else if (userIndex === -1) {
    return res.status(404).json({ message: "User not found" });
  } else {
    data.users.splice(userIndex, 1);
    saveData(data);
    return res.status(204).send();
  }
};

exports.resetData = (req, res) => {
  try {
    resetData();
    res.status(200).json({ message: "Data has been reset from backup." });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Failed to reset data.", error: error.message });
  }
};
