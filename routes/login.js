/**
 * @author: srinivasaimandi
 */

const express = require("express");
const crypto = require("crypto");
const { getData } = require("../utils/dataUtils");
const { addApiKey, revokeApiKey } = require("../middleware/auth");

const router = express.Router();

/**
 * @swagger
 * /login:
 *   post:
 *     summary: User login
 *     tags: [Auth]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - password
 *             properties:
 *               username:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Login successful, returns an API key valid for 24 hours
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 apiKey:
 *                   type: string
 *       401:
 *         description: Invalid credentials
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 */
router.post("/login", (req, res) => {
  const { username, password } = req.body;
  const user = getData().users.find(
    (u) => u.username === username && u.password === password
  );
  if (user) {
    const newApiKey = crypto.randomUUID();
    addApiKey(newApiKey);
    res.json({ apiKey: newApiKey });
  } else {
    res.status(401).json({ message: "Invalid credentials" });
  }
});

/**
 * @swagger
 * /logout:
 *   post:
 *     summary: User logout
 *     description: Revokes the API key sent in the x-api-key header, so it can no longer be used. The fixed automation key cannot be revoked.
 *     tags: [Auth]
 *     responses:
 *       204:
 *         description: Logged out (also returned if the key was already invalid or expired)
 */
router.post("/logout", (req, res) => {
  revokeApiKey(req.header("x-api-key"));
  res.status(204).send();
});

module.exports = router;
