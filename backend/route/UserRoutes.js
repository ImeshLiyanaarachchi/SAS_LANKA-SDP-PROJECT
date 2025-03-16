const express = require("express");
const userController = require("../controller/UserController");
const { authenticateUser } = require('../middleware/AuthMiddleware');

const router = express.Router();


// Public Routes
router.post("/register", userController.createUser); // Create User
router.post("/login", userController.login); // Login User
router.post("/logout", userController.logout); // Logout User

router.post("/", authenticateUser,userController.createUser);
router.get("/", userController.getUsers);
router.get("/:id", userController.getUserById);
router.put("/:id", userController.updateUser);
router.delete("/:id", userController.deleteUser);

module.exports = router;