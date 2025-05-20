const express = require("express");
const router = express.Router();
const { authenticateUser } = require("../middleware/AuthMiddleware");
const {
    createServiceRecord,
    getAllServiceRecords,
    getServiceRecordById,
    getServiceRecordsByVehicle,
    getServiceRecordsByDateRange,
    addPartsToServiceRecord,
    deleteServicePart,
    generateServiceInvoice,
    getVehicleTypeServiceReport,
    updateServiceRecord
} = require("../controller/ServiceRecordController");

// Create new service record (with parts, inventory management, and invoice)
router.post("/", authenticateUser, createServiceRecord);

// Add parts to an existing service record (without invoice generation)
router.post("/:serviceId/add-parts", authenticateUser, addPartsToServiceRecord);

// Generate or update an invoice for a service record
router.post("/:serviceId/generate-invoice", authenticateUser, generateServiceInvoice);

// Delete a part from a service record
router.delete("/:serviceId/parts/:itemId/:stockId", authenticateUser, deleteServicePart);

// Get all service records
router.get("/", authenticateUser, getAllServiceRecords);

// Get service records by date range
router.get("/date-range", authenticateUser, getServiceRecordsByDateRange);

// Get service reports by vehicle type (make/model)
router.get("/reports/vehicle-type", authenticateUser, getVehicleTypeServiceReport);

// Get service records by vehicle number
router.get("/vehicle/:vehicleNumber", authenticateUser, getServiceRecordsByVehicle);

// Get service record by ID
router.get("/:serviceId", authenticateUser, getServiceRecordById);

// Update service record
router.put("/:serviceId", authenticateUser, updateServiceRecord);

module.exports = router; 