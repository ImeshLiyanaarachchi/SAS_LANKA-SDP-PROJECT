const express = require('express');
const router = express.Router();
const { authenticateUser } = require('../middleware/AuthMiddleware');
const {
    createFeedback,
    getAllFeedback,
    getFeedbackById,
    getFeedbackByUserId,
    updateFeedback,
    deleteFeedback
} = require('../controller/FeedbackController');

// Create new feedback (requires authentication)
router.post('/', authenticateUser, createFeedback);

// Get all feedback
router.get('/', getAllFeedback);

// Get feedback by ID
router.get('/:id', getFeedbackById);

// Get feedback by user ID
router.get('/user/:userId', getFeedbackByUserId);

// Update feedback (requires authentication)
router.put('/:id', authenticateUser, updateFeedback);

// Delete feedback (requires authentication)
router.delete('/:id', authenticateUser, deleteFeedback);

module.exports = router; 