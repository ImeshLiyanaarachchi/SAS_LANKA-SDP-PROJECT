const express = require("express");
const router = express.Router();
const { authenticateUser } = require("../middleware/AuthMiddleware");
const {
    createVehicleProfile,
    getAllVehicleProfiles,
    getVehicleProfileByNumber,
    getVehicleProfilesByUser,
    updateVehicleProfile,
    deleteVehicleProfile,
    getDetailedVehicleProfiles,
    getVehiclesByType
} = require("../controller/VehicleProfileController");

// Create a new vehicle profile
router.post("/", authenticateUser, createVehicleProfile);

// Get all vehicle profiles (admin sees all, users see only their own)
router.get("/", authenticateUser, getAllVehicleProfiles);

// Get detailed vehicle profiles with full service history
router.get("/detailed", authenticateUser, getDetailedVehicleProfiles);

// Search vehicles by make/model
router.get("/search", authenticateUser, getVehiclesByType);

// Get vehicle profiles by user ID
router.get("/user/:userId", authenticateUser, getVehicleProfilesByUser);

// Get vehicle profile by vehicle number
router.get("/:vehicleNumber", authenticateUser, getVehicleProfileByNumber);

// Update vehicle profile
router.put("/:vehicleNumber", authenticateUser, updateVehicleProfile);

// Delete vehicle profile
router.delete("/:vehicleNumber", authenticateUser, deleteVehicleProfile);

module.exports = router; 