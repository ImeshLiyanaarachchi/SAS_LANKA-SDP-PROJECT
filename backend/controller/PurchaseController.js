require("dotenv").config();

// Create a new purchase (Admin only)
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
            purchase_date,
            quantity,
            buying_price,
            supplier,
            selling_price // For inventory_stock table
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
                        item_id, purchase_date, quanity, 
                        buying_price, supplier
                    ) VALUES (?, ?, ?, ?, ?)`,
                    [item_id, purchase_date, quantity, buying_price, supplier]
                );

                const purchase_id = purchaseResult.insertId;

                // Create inventory stock record
                await db.promise().execute(
                    `INSERT INTO inventory_stock (
                        purchase_id, item_id, quantity_available, 
                        selling_price
                    ) VALUES (?, ?, ?, ?)`,
                    [purchase_id, item_id, quantity, selling_price]
                );

                // Commit transaction
                await db.promise().commit();

                res.status(201).json({
                    message: "✅ Purchase record created successfully",
                    purchase_id: purchase_id
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

// Get all purchases (Admin only)
exports.getAllPurchases = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: "Unauthorized: User not found in request" });
        }

        // Check if user is admin
        if (req.user.role !== 'admin') {
            return res.status(403).json({ message: "Forbidden: Only admin can view purchases" });
        }

        const db = req.db;
        db.execute(
            `SELECT 
                p.*,
                ii.item_name,
                ii.category,
                ii.brand,
                ist.quantity_available,
                ist.selling_price
             FROM purchase p
             JOIN inventory_item ii ON p.item_id = ii.item_id
             LEFT JOIN inventory_stock ist ON p.purchase_id = ist.purchase_id
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

// Get purchase by ID (Admin only)
exports.getPurchaseById = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: "Unauthorized: User not found in request" });
        }

        // Check if user is admin
        if (req.user.role !== 'admin') {
            return res.status(403).json({ message: "Forbidden: Only admin can view purchases" });
        }

        const { purchaseId } = req.params;
        const db = req.db;

        db.execute(
            `SELECT 
                p.*,
                ii.item_name,
                ii.category,
                ii.brand,
                ist.quantity_available,
                ist.selling_price
             FROM purchase p
             JOIN inventory_item ii ON p.item_id = ii.item_id
             LEFT JOIN inventory_stock ist ON p.purchase_id = ist.purchase_id
             WHERE p.purchase_id = ?`,
            [purchaseId],
            (err, results) => {
                if (err) return res.status(500).json({ message: "Server Error", error: err });

                if (results.length === 0) {
                    return res.status(404).json({ message: "❌ Purchase record not found" });
                }

                res.status(200).json(results[0]);
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
            purchase_date,
            quantity,
            buying_price,
            supplier,
            selling_price // For inventory_stock table
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
                    throw new Error("Purchase record not found");
                }

                // Update purchase record
                await db.promise().execute(
                    `UPDATE purchase 
                     SET purchase_date = ?, quanity = ?, 
                         buying_price = ?, supplier = ?
                     WHERE purchase_id = ?`,
                    [purchase_date, quantity, buying_price, supplier, purchaseId]
                );

                // Update inventory stock record
                await db.promise().execute(
                    `UPDATE inventory_stock 
                     SET quantity_available = ?, selling_price = ?
                     WHERE purchase_id = ?`,
                    [quantity, selling_price, purchaseId]
                );

                // Commit transaction
                await db.promise().commit();
                res.status(200).json({ message: "✅ Purchase record updated successfully" });
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
                    throw new Error("Purchase record not found");
                }

                // Check if the stock has been used in any service
                const [usedStock] = await db.promise().execute(
                    `SELECT spu.* 
                     FROM service_parts_used spu
                     JOIN inventory_stock ist ON spu.stock_id = ist.stock_id
                     WHERE ist.purchase_id = ?`,
                    [purchaseId]
                );

                if (usedStock.length > 0) {
                    throw new Error("Cannot delete purchase: Stock has been used in services");
                }

                // Delete purchase (cascade will handle inventory_stock deletion)
                await db.promise().execute(
                    "DELETE FROM purchase WHERE purchase_id = ?",
                    [purchaseId]
                );

                // Commit transaction
                await db.promise().commit();
                res.status(200).json({ message: "✅ Purchase record deleted successfully" });
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