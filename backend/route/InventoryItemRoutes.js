const express = require("express");
const router = express.Router();
const { authenticateUser } = require("../middleware/AuthMiddleware");
const {
    createItem,
    getAllItems,
    getItemById,
    updateItem,
    deleteItem,
    getItemsByCategory,
    getAllCategories
} = require("../controller/InventoryItemController");

// Create new item (Admin only)
router.post("/", authenticateUser, createItem);

// Get all items
router.get("/", authenticateUser, getAllItems);

// Get all categories
router.get("/categories", authenticateUser, getAllCategories);

// Get items by category
router.get("/category/:category", authenticateUser, getItemsByCategory);

// Get item by ID
router.get("/:itemId", authenticateUser, getItemById);

// Update item (Admin only)
router.put("/:itemId", authenticateUser, updateItem);

// Delete item (Admin only)
router.delete("/:itemId", authenticateUser, deleteItem);

module.exports = router; 