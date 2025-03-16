const express = require('express');
const router = express.Router();
const { authenticateUser } = require('../middleware/AuthMiddleware');
const {
    createInquiry,
    getAllInquiries,
    getInquiryById,
    getInquiriesByUserId,
    takeInquiry,
    updateInquiryStatus,
    deleteInquiry
} = require('../controller/InquiryController');

// Create new inquiry (requires authentication)
router.post('/', authenticateUser, createInquiry);

// Get all inquiries (admin only)
router.get('/', authenticateUser, getAllInquiries);

// Get inquiry by ID
router.get('/:id', authenticateUser, getInquiryById);

// Get inquiries by user ID
router.get('/user/:userId', authenticateUser, getInquiriesByUserId);

// Technician takes an inquiry
router.post('/:id/take', authenticateUser, takeInquiry);

// Technician updates inquiry status
router.put('/:id/status', authenticateUser, updateInquiryStatus);

// Delete inquiry (admin only)
router.delete('/:id', authenticateUser, deleteInquiry);

module.exports = router; 