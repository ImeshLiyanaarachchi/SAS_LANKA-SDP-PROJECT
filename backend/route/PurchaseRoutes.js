const express = require("express");
const router = express.Router();
const { authenticateUser } = require("../middleware/AuthMiddleware");
const {
    createPurchase,
    getAllPurchases,
    getPurchaseById,
    updatePurchase,
    deletePurchase
} = require("../controller/PurchaseController");

// Create purchase (Admin only)
router.post("/", authenticateUser, createPurchase);

// Get all purchases (Admin only)
router.get("/", authenticateUser, getAllPurchases);

// Get purchase by ID (Admin only)
router.get("/:purchaseId", authenticateUser, getPurchaseById);

// Update purchase (Admin only)
router.put("/:purchaseId", authenticateUser, updatePurchase);

// Delete purchase (Admin only)
router.delete("/:purchaseId", authenticateUser, deletePurchase);

module.exports = router; 