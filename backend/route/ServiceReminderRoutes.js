const express = require("express");
const router = express.Router();
const ServiceReminderController = require("../controller/ServiceReminderController");
const { authenticateUser } = require("../middleware/AuthMiddleware");

// Route to get users due for service on a specific date (default 14 days from now)
router.get("/due-for-service", authenticateUser, ServiceReminderController.getUsersDueForService);

// Route to send service reminder emails to users
router.post("/send-reminders", authenticateUser, ServiceReminderController.sendServiceReminders);

// Route to send custom emails to selected users
router.post("/send-custom-emails", authenticateUser, ServiceReminderController.sendCustomEmails);

module.exports = router; 