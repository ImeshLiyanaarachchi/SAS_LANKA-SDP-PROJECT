const express = require("express");
const router = express.Router();
const { authenticateUser } = require("../middleware/AuthMiddleware");
const {
    createVehicleProfile,
    getAllVehicleProfiles,
    getVehicleProfileByNumber,
    getVehicleProfilesByUserId,
    updateVehicleProfile,
    deleteVehicleProfile
} = require("../controller/VehicleProfileController");

// Create vehicle profile (Technician only)
router.post("/", authenticateUser, createVehicleProfile);

// Get all vehicle profiles (Admin only)
router.get("/", authenticateUser, getAllVehicleProfiles);

// Get vehicle profile by number (Admin or owner)
router.get("/:vehicleNumber", authenticateUser, getVehicleProfileByNumber);

// Get vehicle profiles by user ID (Admin or owner)
router.get("/user/:userId", authenticateUser, getVehicleProfilesByUserId);

// Update vehicle profile (Admin or owner)
router.put("/:vehicleNumber", authenticateUser, updateVehicleProfile);

// Delete vehicle profile (Admin or owner)
router.delete("/:vehicleNumber", authenticateUser, deleteVehicleProfile);

module.exports = router; 