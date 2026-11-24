/**
 * @author: srinivasaimandi
 */

const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');

/**
 * @swagger
 * /users:
 *   get:
 *     summary: Get all users
 *     tags: [Users]
 *     responses:
 *       200:
 *         description: List of all users
 */
router.get('/', userController.getAllUsers);

/**
 * @swagger
 * /users:
 *   post:
 *     summary: Create a new user
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - email
 *               - username
 *               - password
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *               username:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       201:
 *         description: User created (the password is not included in the response)
 *       400:
 *         description: Missing field, invalid email, or duplicate email/username (emails compare case-insensitively)
 */
router.post('/', userController.createUser);

/**
 * @swagger
 * /users/search:
 *   get:
 *     summary: Search users by name or email
 *     tags: [Users]
 *     parameters:
 *       - in: query
 *         name: name
 *         schema:
 *           type: string
 *         description: Name to search for
 *       - in: query
 *         name: email
 *         schema:
 *           type: string
 *         description: Email to search for
 *     responses:
 *       200:
 *         description: List of matching users
 *       204:
 *         description: No users match
 *       400:
 *         description: A query parameter was given more than once
 */
router.get('/search', userController.searchUsers);

/**
 * @swagger
 * /users/count:
 *   get:
 *     summary: Get user count
 *     tags: [Users]
 *     responses:
 *       200:
 *         description: Number of users
 */
router.get('/count', userController.getUserCount);

/**
 * @swagger
 * /users/reset-data:
 *   put:
 *     summary: Reset user data from backup
 *     tags: [Users]
 *     description: Overwrites data.json with data-backup.json.
 *     responses:
 *       200:
 *         description: Data has been reset from backup and cache cleared.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       500:
 *         description: Failed to reset data.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 error:
 *                   type: string
 */
router.put('/reset-data', userController.resetData);

/**
 * @swagger
 * /users/bulk:
 *   post:
 *     summary: Bulk add users
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: array
 *             items:
 *               type: object
 *               required:
 *                 - name
 *                 - email
 *                 - username
 *                 - password
 *               properties:
 *                 name:
 *                   type: string
 *                 email:
 *                   type: string
 *                 username:
 *                   type: string
 *                 password:
 *                   type: string
 *     responses:
 *       201:
 *         description: Users created (passwords are not included in the response)
 *       400:
 *         description: Body is not an array, or a user is invalid or a duplicate. Nothing is saved if any user fails.
 */
router.post('/bulk', userController.bulkAddUsers);

/**
 * @swagger
 * /users/{id}:
 *   get:
 *     summary: Get user by ID
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: User ID
 *     responses:
 *       200:
 *         description: User found
 *       404:
 *         description: User not found
 */
router.get('/:id', userController.getUserById);

/**
 * @swagger
 * /users/{id}:
 *   put:
 *     summary: Update a user
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: User ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *               username:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: User updated (the password is not included in the response)
 *       400:
 *         description: Empty field, invalid email, or email/username already used by another user
 *       403:
 *         description: User is protected from editing (admin, id 0, and srinivasaimandi, id 3)
 *       404:
 *         description: User not found
 */
router.put('/:id', userController.updateUser);

/**
 * @swagger
 * /users/{id}:
 *   delete:
 *     summary: Delete a user
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: User ID
 *     responses:
 *       204:
 *         description: User deleted
 *       403:
 *         description: User is protected from deleting (admin, id 0, and srinivasaimandi, id 3)
 *       404:
 *         description: User not found
 */
router.delete('/:id', userController.deleteUser);

module.exports = router;