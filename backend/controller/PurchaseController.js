require("dotenv").config();

// Create new purchase (Admin only)
exports.createPurchase = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: "Unauthorized: User not found in request" });
        }

        // Check if user is admin
        if (req.user.role !== 'admin') {
            return res.status(403).json({ message: "Forbidden: Only admin can create purchases" });
        }

        const {
            item_id,
            quantity,
            buying_price,
            selling_price,
            purchase_date
        } = req.body;

        const db = req.db;
        
        // Start a transaction
        db.beginTransaction(async (err) => {
            if (err) return res.status(500).json({ message: "Server Error", error: err });

            try {
                // Check if item exists
                const [itemResult] = await db.promise().execute(
                    "SELECT * FROM inventory_item WHERE item_id = ?",
                    [item_id]
                );

                if (itemResult.length === 0) {
                    throw new Error("Item not found");
                }

                // Create purchase record
                const [purchaseResult] = await db.promise().execute(
                    `INSERT INTO purchase (
                        item_id, quantity, buying_price, selling_price, purchase_date
                    ) VALUES (?, ?, ?, ?, ?)`,
                    [item_id, quantity, buying_price, selling_price, purchase_date || new Date()]
                );

                // Create inventory stock record
                await db.promise().execute(
                    `INSERT INTO inventory_stock (
                        item_id, purchase_id, available_qty, buying_price, selling_price, purchase_date
                    ) VALUES (?, ?, ?, ?, ?, ?)`,
                    [item_id, purchaseResult.insertId, quantity, buying_price, selling_price, purchase_date || new Date()]
                );

                // Commit transaction
                await db.promise().commit();
                
                res.status(201).json({
                    message: "✅ Purchase created successfully and inventory updated",
                    purchase_id: purchaseResult.insertId
                });
            } catch (error) {
                // Rollback transaction on error
                await db.promise().rollback();
                throw error;
            }
        });
    } catch (error) {
        console.error("Create Purchase Error:", error);
        res.status(500).json({ message: "Server Error", error: error.message });
    }
};

// Get all purchases
exports.getAllPurchases = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: "Unauthorized: User not found in request" });
        }

        const db = req.db;
        db.execute(
            `SELECT 
                p.*,
                ii.item_name,
                ii.brand,
                ii.category,
                ii.unit
             FROM purchase p
             JOIN inventory_item ii ON p.item_id = ii.item_id
             ORDER BY p.purchase_date DESC`,
            (err, results) => {
                if (err) return res.status(500).json({ message: "Server Error", error: err });
                res.status(200).json(results);
            }
        );
    } catch (error) {
        res.status(500).json({ message: "Server Error", error });
    }
};

// Get purchase by ID
exports.getPurchaseById = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: "Unauthorized: User not found in request" });
        }

        const { purchaseId } = req.params;
        const db = req.db;

        db.execute(
            `SELECT 
                p.*,
                ii.item_name,
                ii.brand,
                ii.category,
                ii.unit
             FROM purchase p
             JOIN inventory_item ii ON p.item_id = ii.item_id
             WHERE p.purchase_id = ?`,
            [purchaseId],
            (err, results) => {
                if (err) return res.status(500).json({ message: "Server Error", error: err });

                if (results.length === 0) {
                    return res.status(404).json({ message: "❌ Purchase not found" });
                }

                res.status(200).json(results[0]);
            }
        );
    } catch (error) {
        res.status(500).json({ message: "Server Error", error });
    }
};

// Get purchases by item ID
exports.getPurchasesByItemId = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: "Unauthorized: User not found in request" });
        }

        const { itemId } = req.params;
        const db = req.db;

        db.execute(
            `SELECT 
                p.*,
                ii.item_name,
                ii.brand,
                ii.category,
                ii.unit
             FROM purchase p
             JOIN inventory_item ii ON p.item_id = ii.item_id
             WHERE p.item_id = ?
             ORDER BY p.purchase_date DESC`,
            [itemId],
            (err, results) => {
                if (err) return res.status(500).json({ message: "Server Error", error: err });
                res.status(200).json(results);
            }
        );
    } catch (error) {
        res.status(500).json({ message: "Server Error", error });
    }
};

// Update purchase (Admin only)
exports.updatePurchase = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: "Unauthorized: User not found in request" });
        }

        // Check if user is admin
        if (req.user.role !== 'admin') {
            return res.status(403).json({ message: "Forbidden: Only admin can update purchases" });
        }

        const { purchaseId } = req.params;
        const {
            quantity,
            buying_price,
            selling_price,
            purchase_date
        } = req.body;

        const db = req.db;

        // Start a transaction
        db.beginTransaction(async (err) => {
            if (err) return res.status(500).json({ message: "Server Error", error: err });

            try {
                // Check if purchase exists
                const [purchaseResult] = await db.promise().execute(
                    "SELECT * FROM purchase WHERE purchase_id = ?",
                    [purchaseId]
                );

                if (purchaseResult.length === 0) {
                    throw new Error("Purchase not found");
                }

                // Update purchase
                await db.promise().execute(
                    `UPDATE purchase 
                     SET quantity = ?, buying_price = ?, selling_price = ?, purchase_date = ?
                     WHERE purchase_id = ?`,
                    [quantity, buying_price, selling_price, purchase_date, purchaseId]
                );

                // Update corresponding inventory stock
                await db.promise().execute(
                    `UPDATE inventory_stock 
                     SET available_qty = ?, buying_price = ?, selling_price = ?, purchase_date = ?
                     WHERE purchase_id = ?`,
                    [quantity, buying_price, selling_price, purchase_date, purchaseId]
                );

                // Commit transaction
                await db.promise().commit();
                
                res.status(200).json({ message: "✅ Purchase updated successfully" });
            } catch (error) {
                // Rollback transaction on error
                await db.promise().rollback();
                throw error;
            }
        });
    } catch (error) {
        console.error("Update Purchase Error:", error);
        res.status(500).json({ message: "Server Error", error: error.message });
    }
};

// Delete purchase (Admin only)
exports.deletePurchase = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: "Unauthorized: User not found in request" });
        }

        // Check if user is admin
        if (req.user.role !== 'admin') {
            return res.status(403).json({ message: "Forbidden: Only admin can delete purchases" });
        }

        const { purchaseId } = req.params;
        const db = req.db;

        // Start a transaction
        db.beginTransaction(async (err) => {
            if (err) return res.status(500).json({ message: "Server Error", error: err });

            try {
                // Check if purchase exists
                const [purchaseResult] = await db.promise().execute(
                    "SELECT * FROM purchase WHERE purchase_id = ?",
                    [purchaseId]
                );

                if (purchaseResult.length === 0) {
                    throw new Error("Purchase not found");
                }

                // Check if corresponding inventory stock has been used
                const [stockResult] = await db.promise().execute(
                    `SELECT is.stock_id, is.available_qty, 
                            (SELECT COUNT(*) FROM service_parts_used WHERE stock_id = is.stock_id) as usage_count
                     FROM inventory_stock is 
                     WHERE is.purchase_id = ?`,
                    [purchaseId]
                );

                if (stockResult.length > 0 && stockResult[0].usage_count > 0) {
                    throw new Error("Cannot delete purchase: Items from this purchase have been used in services");
                }

                // Delete inventory stock record
                await db.promise().execute(
                    "DELETE FROM inventory_stock WHERE purchase_id = ?",
                    [purchaseId]
                );

                // Delete purchase
                await db.promise().execute(
                    "DELETE FROM purchase WHERE purchase_id = ?",
                    [purchaseId]
                );

                // Commit transaction
                await db.promise().commit();
                
                res.status(200).json({ message: "✅ Purchase deleted successfully" });
            } catch (error) {
                // Rollback transaction on error
                await db.promise().rollback();
                throw error;
            }
        });
    } catch (error) {
        console.error("Delete Purchase Error:", error);
        res.status(500).json({ message: "Server Error", error: error.message });
    }
};

// Get inventory stock reports
exports.getInventoryStockReports = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: "Unauthorized: User not found in request" });
        }

        // Get query parameters for filtering
        const { startDate, endDate, category } = req.query;
        
        const db = req.db;
        
        // Build the base query with necessary joins
        let query = `
            SELECT 
                invstock.stock_id,
                invstock.item_id,
                invstock.purchase_id,
                invstock.available_qty,
                invstock.buying_price,
                invstock.selling_price,
                invstock.purchase_date,
                p.quantity as initial_quantity,
                ii.item_name,
                ii.brand,
                ii.category,
                ii.unit
            FROM inventory_stock invstock
            JOIN inventory_item ii ON invstock.item_id = ii.item_id
            JOIN purchase p ON invstock.purchase_id = p.purchase_id
            WHERE 1=1
        `;
        
        // Add filters if provided
        const queryParams = [];
        
        if (startDate && endDate) {
            query += ` AND invstock.purchase_date BETWEEN ? AND ?`;
            queryParams.push(startDate, endDate);
        }
        
        if (category) {
            query += ` AND ii.category = ?`;
            queryParams.push(category);
        }
        
        // Order by date (newest first) and then by stock_id
        query += ` ORDER BY invstock.purchase_date DESC, invstock.stock_id`;
        
        // Execute the query
        db.execute(query, queryParams, (err, results) => {
            if (err) {
                console.error("Error fetching inventory stock reports:", err);
                return res.status(500).json({ message: "Server Error", error: err });
            }
            
            res.status(200).json(results);
        });
    } catch (error) {
        console.error("Get Inventory Stock Reports Error:", error);
        res.status(500).json({ message: "Server Error", error: error.message });
    }
};

// Get all categories for filtering
exports.getInventoryCategories = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: "Unauthorized: User not found in request" });
        }

        const db = req.db;
        
        // Check if using item_category table
        db.execute("SHOW TABLES LIKE 'item_category'", (tableErr, tableResults) => {
            if (tableErr) {
                console.error("Error checking for item_category table:", tableErr);
                return res.status(500).json({ message: "Server Error", error: tableErr });
            }

            if (tableResults && tableResults.length > 0) {
                // Using item_category table
                db.execute(
                    "SELECT category_id, category FROM item_category ORDER BY category",
                    (err, results) => {
                        if (err) {
                            console.error("Error fetching categories:", err);
                            return res.status(500).json({ message: "Server Error", error: err });
                        }
                        res.status(200).json(results);
                    }
                );
            } else {
                // Getting distinct categories from inventory_item
                db.execute(
                    "SELECT DISTINCT category FROM inventory_item ORDER BY category",
                    (err, results) => {
                        if (err) {
                            console.error("Error fetching categories:", err);
                            return res.status(500).json({ message: "Server Error", error: err });
                        }
                        res.status(200).json(results);
                    }
                );
            }
        });
    } catch (error) {
        console.error("Get Categories Error:", error);
        res.status(500).json({ message: "Server Error", error: error.message });
    }
}; 