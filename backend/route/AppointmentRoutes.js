const express = require("express");
const router = express.Router();
const { authenticateUser } = require("../middleware/AuthMiddleware");
const {
    createAppointment,
    getAllAppointments,
    getAppointmentsByUserId,
    updateAppointmentStatus,
    deleteAppointment,
    getAvailableTimeSlots,
    updateAppointment
} = require("../controller/AppointmentController");

// Create appointment (Customer only)
router.post("/", authenticateUser, createAppointment);

// Get all appointments (Admin only)
router.get("/", authenticateUser, getAllAppointments);

// Get available time slots for a date
router.get('/available-slots/:date', authenticateUser, getAvailableTimeSlots);

// Get appointments by user ID (Admin or owner)
router.get("/user/:userId", authenticateUser, getAppointmentsByUserId);

// Update entire appointment (Technician or Admin only)
router.patch('/:appointmentId', authenticateUser, updateAppointment);

// Update appointment status (Technician or Admin only)
router.patch("/:appointmentId/status", authenticateUser, updateAppointmentStatus);

// Delete appointment (Admin only)
router.delete("/:appointmentId", authenticateUser, deleteAppointment);

module.exports = router; 