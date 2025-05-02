const express = require("express");
const router = express.Router();
const { authenticateUser } = require("../middleware/AuthMiddleware");
const {
    createRelease,
    getAllReleases,
    getReleaseById,
    getReleasesByItemId,
    getItemStockStatus
} = require("../controller/InventoryReleaseController");

// Create new inventory release (Admin only)
router.post("/", authenticateUser, createRelease);

// Get all inventory releases
router.get("/", authenticateUser, getAllReleases);

// Get stock status for a specific item (FIFO order)
router.get("/stock-status/:itemId", authenticateUser, getItemStockStatus);

// Get releases by item ID
router.get("/item/:itemId", authenticateUser, getReleasesByItemId);

// Get release by ID
router.get("/:releaseId", authenticateUser, getReleaseById);

module.exports = router; 