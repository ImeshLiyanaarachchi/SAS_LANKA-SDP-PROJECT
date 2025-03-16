const express = require("express");
const router = express.Router();
const { authenticateUser } = require("../middleware/AuthMiddleware");
const {
    createAppointment,
    getAllAppointments,
    getAppointmentsByUserId,
    updateAppointmentStatus,
    deleteAppointment
} = require("../controller/AppointmentController");

// Create appointment (Customer only)
router.post("/", authenticateUser, createAppointment);

// Get all appointments (Admin only)
router.get("/", authenticateUser, getAllAppointments);

// Get appointments by user ID (Admin or owner)
router.get("/user/:userId", authenticateUser, getAppointmentsByUserId);

// Update appointment status (Technician or Admin only)
router.put("/:appointmentId/status", authenticateUser, updateAppointmentStatus);

// Delete appointment (Admin only)
router.delete("/:appointmentId", authenticateUser, deleteAppointment);

module.exports = router; 