const express = require("express");
const router = express.Router();
const { authenticateUser } = require("../middleware/AuthMiddleware");
const {
    createInquiry,
    getAllInquiries,
    getInquiriesByUserId,
    getInquiryById,
    respondToInquiry,
    updateInquiryStatus,
    deleteInquiry
} = require("../controller/InquiryController");

// Create inquiry (Any authenticated user)
router.post("/", authenticateUser, createInquiry);

// Get all inquiries (Admin only)
router.get("/", authenticateUser, getAllInquiries);

// Get inquiries by user ID (Admin or owner)
router.get("/user/:userId", authenticateUser, getInquiriesByUserId);

// Get a specific inquiry (Admin or owner)
router.get("/:inquiryId", authenticateUser, getInquiryById);

// Respond to inquiry (Admin only)
router.post("/:inquiryId/respond", authenticateUser, respondToInquiry);

// Update inquiry status (Admin only)
router.patch("/:inquiryId/status", authenticateUser, updateInquiryStatus);

// Delete inquiry (Admin only)
router.delete("/:inquiryId", authenticateUser, deleteInquiry);

module.exports = router; 