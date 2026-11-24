/**
 * @author: srinivasaimandi
 */

const express = require("express");
const crypto = require("crypto");
const { getData } = require("../utils/dataUtils");
const { addApiKey } = require("../middleware/auth");

const router = express.Router();

/**
 * @swagger
 * /login:
 *   post:
 *     summary: User login
 *     tags: [Auth]
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
 *         description: Login successful, returns API key
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

module.exports = router;
