const express = require("express");
const router = express.Router();
const { authenticateUser } = require("../middleware/AuthMiddleware");
const {
    createCustomServiceRecord,
    getUserCustomServiceRecords,
    getCustomServiceRecordById,
    updateCustomServiceRecord,
    deleteCustomServiceRecord,
    addCustomServicePart,
    updateCustomServicePart,
    deleteCustomServicePart,
    getVehicleCustomServiceRecords
} = require("../controller/CustomServiceRecordController");

// Create a new custom service record
router.post("/", authenticateUser, createCustomServiceRecord);

// Get all custom service records for the authenticated user
router.get("/", authenticateUser, getUserCustomServiceRecords);

// Get custom service records for a specific vehicle
router.get("/vehicle/:vehicleNumber", authenticateUser, getVehicleCustomServiceRecords);

// Get a specific custom service record
router.get("/:recordId", authenticateUser, getCustomServiceRecordById);

// Update a custom service record
router.put("/:recordId", authenticateUser, updateCustomServiceRecord);

// Delete a custom service record
router.delete("/:recordId", authenticateUser, deleteCustomServiceRecord);

// Add a part to a custom service record
router.post("/:recordId/parts", authenticateUser, addCustomServicePart);

// Update a part in a custom service record
router.put("/:recordId/parts/:partId", authenticateUser, updateCustomServicePart);

// Delete a part from a custom service record
router.delete("/:recordId/parts/:partId", authenticateUser, deleteCustomServicePart);

module.exports = router; 