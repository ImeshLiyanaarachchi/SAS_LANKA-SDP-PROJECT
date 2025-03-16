const express = require("express");
const router = express.Router();
const { authenticateUser } = require("../middleware/AuthMiddleware");
const {
    getAllStock,
    getStockById,
    getStockByItemId,
    updateStock,
    getLowStockItems,
    getStockUsageHistory,
    addStock
} = require("../controller/StockController");

// Add new stock (Admin only)
router.post("/", authenticateUser, addStock);

// Get all stock (Admin only)
router.get("/", authenticateUser, getAllStock);

// Get low stock items (Admin only)
router.get("/low-stock", authenticateUser, getLowStockItems);

// Get stock by ID (Admin only)
router.get("/:stockId", authenticateUser, getStockById);

// Get stock by item ID (Admin only)
router.get("/item/:itemId", authenticateUser, getStockByItemId);

// Get stock usage history (Admin only)
router.get("/:stockId/usage-history", authenticateUser, getStockUsageHistory);

// Update stock (Admin only)
router.put("/:stockId", authenticateUser, updateStock);

module.exports = router; 