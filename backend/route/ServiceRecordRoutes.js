const express = require("express");
const router = express.Router();
const { authenticateUser } = require("../middleware/AuthMiddleware");
const {
    createServiceRecord,
    getAllServiceRecords,
    getServiceRecordsByVehicle,
    updateServiceRecord,
    deleteServiceRecord,
    addPartsToService
} = require("../controller/ServiceRecordController");

// Create service record (Admin or Technician only)
router.post("/", authenticateUser, createServiceRecord);

// Get all service records (Admin only)
router.get("/", authenticateUser, getAllServiceRecords);

// Get service records by vehicle number (Admin or vehicle owner)
router.get("/vehicle/:vehicleNumber", authenticateUser, getServiceRecordsByVehicle);

// Add parts to service record (Admin or Technician only)
router.post("/:recordId/parts", authenticateUser, addPartsToService);

// Update service record (Admin or Technician only)
router.put("/:recordId", authenticateUser, updateServiceRecord);

// Delete service record (Admin only)
router.delete("/:recordId", authenticateUser, deleteServiceRecord);

module.exports = router; 