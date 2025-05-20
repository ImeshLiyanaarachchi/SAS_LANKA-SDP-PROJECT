const express = require("express");
const forgetPasswordController = require("../controller/ForgetPasswordController");

const router = express.Router();

// Public routes - no authentication required
router.post("/forgot-password", forgetPasswordController.requestPasswordReset);
router.post("/verify-code", forgetPasswordController.verifyCode);
router.post("/reset-password", forgetPasswordController.resetPassword);

module.exports = router; 