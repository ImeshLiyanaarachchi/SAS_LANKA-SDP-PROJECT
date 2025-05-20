const express = require("express");
const router = express.Router();
const { authenticateUser } = require("../middleware/AuthMiddleware");
const {
    createService,
    getAllServices,
    getServiceById,
    updateService,
    deleteService,
    deactivateService,
    getAllMotorVehicles,
    getServicesWithPromotions
} = require("../controller/ServicesController");

// Service routes
router.post("/", authenticateUser, createService);
router.get("/", authenticateUser, getAllServices);
router.get("/with-promotions", getServicesWithPromotions); // Public route - no auth required
router.get("/:serviceId", authenticateUser, getServiceById);
router.put("/:serviceId", authenticateUser, updateService);
router.delete("/:serviceId", authenticateUser, deleteService);
router.put("/:serviceId/deactivate", authenticateUser, deactivateService);

// Motor vehicle routes
router.get("/vehicles/all", authenticateUser, getAllMotorVehicles);

module.exports = router; 