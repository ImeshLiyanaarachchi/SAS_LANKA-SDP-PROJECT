const express = require('express');
const serviceTypeController = require('../controller/ServiceTypeController');
const { authenticateUser } = require('../middleware/AuthMiddleware');
const router = express.Router();

// Public route - get all service types
router.get('/', serviceTypeController.getAllServiceTypes);

// Public route - get service type by ID
router.get('/:id', serviceTypeController.getServiceTypeById);

// Admin only routes
router.post('/', authenticateUser, serviceTypeController.createServiceType);
router.put('/:id', authenticateUser, serviceTypeController.updateServiceType);
router.delete('/:id', authenticateUser, serviceTypeController.deleteServiceType);

module.exports = router; 