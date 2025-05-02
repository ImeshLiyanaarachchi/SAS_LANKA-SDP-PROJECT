const express = require("express");
const router = express.Router();
const { authenticateUser } = require("../middleware/AuthMiddleware");
const {
    createPurchase,
    getAllPurchases,
    getPurchaseById,
    updatePurchase,
    deletePurchase,
    getPurchasesByItemId,
    getInventoryStockReports,
    getInventoryCategories
} = require("../controller/PurchaseController");

// Create new purchase (Admin only)
router.post("/", authenticateUser, createPurchase);

// Get all purchases
router.get("/", authenticateUser, getAllPurchases);

// Get inventory stock reports
router.get("/stock-reports", authenticateUser, getInventoryStockReports);

// Get all categories for filtering
router.get("/categories", authenticateUser, getInventoryCategories);

// Get purchases by item ID
router.get("/item/:itemId", authenticateUser, getPurchasesByItemId);

// Get purchase by ID
router.get("/:purchaseId", authenticateUser, getPurchaseById);

// Update purchase (Admin only)
router.put("/:purchaseId", authenticateUser, updatePurchase);

// Delete purchase (Admin only)
router.delete("/:purchaseId", authenticateUser, deletePurchase);

module.exports = router; 