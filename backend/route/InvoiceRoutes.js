const express = require("express");
const router = express.Router();
const { authenticateUser } = require("../middleware/AuthMiddleware");
const {
    getAllInvoices,
    getInvoiceById,
    generateInvoice
} = require("../controller/InvoiceController");

// Get all invoices
router.get("/", authenticateUser, getAllInvoices);

// Get invoice by ID
router.get("/:invoiceId", authenticateUser, getInvoiceById);

// Generate/update invoice for a service record
router.post("/generate/:serviceId", authenticateUser, generateInvoice);

module.exports = router; 