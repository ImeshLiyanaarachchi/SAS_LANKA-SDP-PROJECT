require("dotenv").config();

// Get all stock items (Admin only)
exports.getAllStock = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: "Unauthorized: User not found in request" });
        }

        // Check if user is admin
        if (req.user.role !== 'admin') {
            return res.status(403).json({ message: "Forbidden: Only admin can view all stock" });
        }

        const db = req.db;
        db.execute(
            `SELECT 
                ist.stock_id,
                ist.quantity_available,
                ist.selling_price,
                ii.item_id,
                ii.item_name,
                ii.item_description,
                ii.category,
                ii.brand,
                ii.unit,
                ii.restock_level,
                p.purchase_date,
                p.buying_price,
                p.supplier
             FROM inventory_stock ist
             JOIN inventory_item ii ON ist.item_id = ii.item_id
             JOIN purchase p ON ist.purchase_id = p.purchase_id
             ORDER BY ii.category, ii.item_name`,
            (err, results) => {
                if (err) return res.status(500).json({ message: "Server Error", error: err });
                res.status(200).json(results);
            }
        );
    } catch (error) {
        res.status(500).json({ message: "Server Error", error });
    }
};

// Get stock by ID (Admin only)
exports.getStockById = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: "Unauthorized: User not found in request" });
        }

        // Check if user is admin
        if (req.user.role !== 'admin') {
            return res.status(403).json({ message: "Forbidden: Only admin can view stock details" });
        }

        const { stockId } = req.params;
        const db = req.db;

        db.execute(
            `SELECT 
                ist.stock_id,
                ist.quantity_available,
                ist.selling_price,
                ii.item_id,
                ii.item_name,
                ii.item_description,
                ii.category,
                ii.brand,
                ii.unit,
                ii.restock_level,
                p.purchase_date,
                p.buying_price,
                p.supplier
             FROM inventory_stock ist
             JOIN inventory_item ii ON ist.item_id = ii.item_id
             JOIN purchase p ON ist.purchase_id = p.purchase_id
             WHERE ist.stock_id = ?`,
            [stockId],
            (err, results) => {
                if (err) return res.status(500).json({ message: "Server Error", error: err });

                if (results.length === 0) {
                    return res.status(404).json({ message: "❌ Stock not found" });
                }

                res.status(200).json(results[0]);
            }
        );
    } catch (error) {
        res.status(500).json({ message: "Server Error", error });
    }
};

// Get stock by item ID (Admin only)
exports.getStockByItemId = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: "Unauthorized: User not found in request" });
        }

        // Check if user is admin
        if (req.user.role !== 'admin') {
            return res.status(403).json({ message: "Forbidden: Only admin can view stock details" });
        }

        const { itemId } = req.params;
        const db = req.db;

        db.execute(
            `SELECT 
                ist.stock_id,
                ist.quantity_available,
                ist.selling_price,
                ii.item_id,
                ii.item_name,
                ii.item_description,
                ii.category,
                ii.brand,
                ii.unit,
                ii.restock_level,
                p.purchase_date,
                p.buying_price,
                p.supplier
             FROM inventory_stock ist
             JOIN inventory_item ii ON ist.item_id = ii.item_id
             JOIN purchase p ON ist.purchase_id = p.purchase_id
             WHERE ii.item_id = ?
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

// Update stock (Admin only)
exports.updateStock = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: "Unauthorized: User not found in request" });
        }

        // Check if user is admin
        if (req.user.role !== 'admin') {
            return res.status(403).json({ message: "Forbidden: Only admin can update stock" });
        }

        const { stockId } = req.params;
        const { quantity_available, selling_price } = req.body;

        const db = req.db;

        // Start a transaction
        db.beginTransaction(async (err) => {
            if (err) return res.status(500).json({ message: "Server Error", error: err });

            try {
                // Check if stock exists
                const [stockResult] = await db.promise().execute(
                    "SELECT * FROM inventory_stock WHERE stock_id = ?",
                    [stockId]
                );

                if (stockResult.length === 0) {
                    throw new Error("Stock not found");
                }

                // Update stock
                await db.promise().execute(
                    `UPDATE inventory_stock 
                     SET quantity_available = ?, selling_price = ?
                     WHERE stock_id = ?`,
                    [quantity_available, selling_price, stockId]
                );

                // Commit transaction
                await db.promise().commit();
                res.status(200).json({ message: "✅ Stock updated successfully" });
            } catch (error) {
                // Rollback transaction on error
                await db.promise().rollback();
                throw error;
            }
        });
    } catch (error) {
        console.error("Update Stock Error:", error);
        res.status(500).json({ message: "Server Error", error: error.message });
    }
};

// Get low stock items (Admin only)
exports.getLowStockItems = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: "Unauthorized: User not found in request" });
        }

        // Check if user is admin
        if (req.user.role !== 'admin') {
            return res.status(403).json({ message: "Forbidden: Only admin can view low stock items" });
        }

        const db = req.db;
        db.execute(
            `SELECT 
                ii.item_id,
                ii.item_name,
                ii.category,
                ii.brand,
                ii.unit,
                ii.restock_level,
                SUM(ist.quantity_available) as total_quantity
             FROM inventory_item ii
             LEFT JOIN inventory_stock ist ON ii.item_id = ist.item_id
             GROUP BY ii.item_id
             HAVING total_quantity <= ii.restock_level OR total_quantity IS NULL
             ORDER BY ii.category, ii.item_name`,
            (err, results) => {
                if (err) return res.status(500).json({ message: "Server Error", error: err });
                res.status(200).json(results);
            }
        );
    } catch (error) {
        res.status(500).json({ message: "Server Error", error });
    }
};

// Get stock usage history (Admin only)
exports.getStockUsageHistory = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: "Unauthorized: User not found in request" });
        }

        // Check if user is admin
        if (req.user.role !== 'admin') {
            return res.status(403).json({ message: "Forbidden: Only admin can view stock usage history" });
        }

        const { stockId } = req.params;
        const db = req.db;

        db.execute(
            `SELECT 
                spu.service_id,
                spu.quantity_used,
                sr.date_ as service_date,
                sr.service_description,
                sr.vehicle_number,
                vp.make,
                vp.model
             FROM service_parts_used spu
             JOIN service_record sr ON spu.service_id = sr.record_id
             JOIN vehicle_profile vp ON sr.vehicle_number = vp.vehicle_number
             WHERE spu.stock_id = ?
             ORDER BY sr.date_ DESC`,
            [stockId],
            (err, results) => {
                if (err) return res.status(500).json({ message: "Server Error", error: err });
                res.status(200).json(results);
            }
        );
    } catch (error) {
        res.status(500).json({ message: "Server Error", error });
    }
};

// Add new stock (Admin only)
exports.addStock = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: "Unauthorized: User not found in request" });
        }

        // Check if user is admin
        if (req.user.role !== 'admin') {
            return res.status(403).json({ message: "Forbidden: Only admin can add stock" });
        }

        const {
            item_id,
            quantity_available,
            selling_price,
            purchase_id // Optional: Link to an existing purchase
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

                // If purchase_id is provided, verify it exists
                if (purchase_id) {
                    const [purchaseResult] = await db.promise().execute(
                        "SELECT * FROM purchase WHERE purchase_id = ?",
                        [purchase_id]
                    );

                    if (purchaseResult.length === 0) {
                        throw new Error("Purchase record not found");
                    }

                    // Verify the purchase is for the same item
                    if (purchaseResult[0].item_id !== item_id) {
                        throw new Error("Purchase record does not match the item");
                    }
                }

                // Create inventory stock record
                const [stockResult] = await db.promise().execute(
                    `INSERT INTO inventory_stock (
                        item_id, quantity_available, selling_price,
                        purchase_id
                    ) VALUES (?, ?, ?, ?)`,
                    [item_id, quantity_available, selling_price, purchase_id || null]
                );

                // Commit transaction
                await db.promise().commit();

                // Get the complete stock details
                const [newStock] = await db.promise().execute(
                    `SELECT 
                        ist.stock_id,
                        ist.quantity_available,
                        ist.selling_price,
                        ii.item_name,
                        ii.category,
                        ii.brand,
                        ii.unit,
                        p.purchase_date,
                        p.buying_price,
                        p.supplier
                     FROM inventory_stock ist
                     JOIN inventory_item ii ON ist.item_id = ii.item_id
                     LEFT JOIN purchase p ON ist.purchase_id = p.purchase_id
                     WHERE ist.stock_id = ?`,
                    [stockResult.insertId]
                );

                res.status(201).json({
                    message: "✅ Stock added successfully",
                    stock: newStock[0]
                });
            } catch (error) {
                // Rollback transaction on error
                await db.promise().rollback();
                throw error;
            }
        });
    } catch (error) {
        console.error("Add Stock Error:", error);
        res.status(500).json({ message: "Server Error", error: error.message });
    }
}; 