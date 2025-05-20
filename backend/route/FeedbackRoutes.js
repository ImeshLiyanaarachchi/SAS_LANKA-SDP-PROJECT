const express = require("express");
const router = express.Router();
const { authenticateUser } = require("../middleware/AuthMiddleware");
const {
    createFeedback,
    getAllFeedback,
    getUserFeedback,
    getFeedbackById,
    updateFeedback,
    deleteFeedback,
    getFeedbackStats
} = require("../controller/FeedbackController");

// Feedback routes
router.post("/", authenticateUser, createFeedback);
router.get("/", authenticateUser, getAllFeedback); // Admin only (checked in controller)
router.get("/stats", authenticateUser, getFeedbackStats); // Admin only (checked in controller)
router.get("/user", authenticateUser, getUserFeedback);
router.get("/:feedbackId", authenticateUser, getFeedbackById);
router.put("/:feedbackId", authenticateUser, updateFeedback);
router.delete("/:feedbackId", authenticateUser, deleteFeedback);

module.exports = router; 