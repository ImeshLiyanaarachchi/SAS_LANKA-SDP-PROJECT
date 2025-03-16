require("dotenv").config();

// Create new inventory item (Admin only)
exports.createItem = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: "Unauthorized: User not found in request" });
        }

        // Check if user is admin
        if (req.user.role !== 'admin') {
            return res.status(403).json({ message: "Forbidden: Only admin can create inventory items" });
        }

        const {
            item_name,
            item_description,
            category,
            brand,
            unit,
            restock_level
        } = req.body;

        const db = req.db;

        // Check if item with same name and brand already exists
        const [existingItem] = await db.promise().execute(
            "SELECT * FROM inventory_item WHERE item_name = ? AND brand = ?",
            [item_name, brand]
        );

        if (existingItem.length > 0) {
            return res.status(400).json({ 
                message: "❌ An item with this name and brand already exists" 
            });
        }

        // Create inventory item
        const [result] = await db.promise().execute(
            `INSERT INTO inventory_item (
                item_name, item_description, category,
                brand, unit, restock_level
            ) VALUES (?, ?, ?, ?, ?, ?)`,
            [item_name, item_description, category, brand, unit, restock_level]
        );

        res.status(201).json({
            message: "✅ Inventory item created successfully",
            item_id: result.insertId
        });
    } catch (error) {
        console.error("Create Item Error:", error);
        res.status(500).json({ message: "Server Error", error: error.message });
    }
};

// Get all inventory items
exports.getAllItems = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: "Unauthorized: User not found in request" });
        }

        const db = req.db;
        db.execute(
            `SELECT 
                ii.*,
                COALESCE(SUM(ist.quantity_available), 0) as total_quantity,
                MAX(ist.selling_price) as current_selling_price
             FROM inventory_item ii
             LEFT JOIN inventory_stock ist ON ii.item_id = ist.item_id
             GROUP BY ii.item_id
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

// Get inventory item by ID
exports.getItemById = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: "Unauthorized: User not found in request" });
        }

        const { itemId } = req.params;
        const db = req.db;

        db.execute(
            `SELECT 
                ii.*,
                COALESCE(SUM(ist.quantity_available), 0) as total_quantity,
                MAX(ist.selling_price) as current_selling_price
             FROM inventory_item ii
             LEFT JOIN inventory_stock ist ON ii.item_id = ist.item_id
             WHERE ii.item_id = ?
             GROUP BY ii.item_id`,
            [itemId],
            (err, results) => {
                if (err) return res.status(500).json({ message: "Server Error", error: err });

                if (results.length === 0) {
                    return res.status(404).json({ message: "❌ Item not found" });
                }

                res.status(200).json(results[0]);
            }
        );
    } catch (error) {
        res.status(500).json({ message: "Server Error", error });
    }
};

// Update inventory item (Admin only)
exports.updateItem = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: "Unauthorized: User not found in request" });
        }

        // Check if user is admin
        if (req.user.role !== 'admin') {
            return res.status(403).json({ message: "Forbidden: Only admin can update inventory items" });
        }

        const { itemId } = req.params;
        const {
            item_name,
            item_description,
            category,
            brand,
            unit,
            restock_level
        } = req.body;

        const db = req.db;

        // Check if item exists
        const [existingItem] = await db.promise().execute(
            "SELECT * FROM inventory_item WHERE item_id = ?",
            [itemId]
        );

        if (existingItem.length === 0) {
            return res.status(404).json({ message: "❌ Item not found" });
        }

        // Check if updated name and brand would conflict with another item
        const [conflictItem] = await db.promise().execute(
            "SELECT * FROM inventory_item WHERE item_name = ? AND brand = ? AND item_id != ?",
            [item_name, brand, itemId]
        );

        if (conflictItem.length > 0) {
            return res.status(400).json({ 
                message: "❌ Another item with this name and brand already exists" 
            });
        }

        // Update item
        await db.promise().execute(
            `UPDATE inventory_item 
             SET item_name = ?, item_description = ?, category = ?,
                 brand = ?, unit = ?, restock_level = ?
             WHERE item_id = ?`,
            [item_name, item_description, category, brand, unit, restock_level, itemId]
        );

        res.status(200).json({ message: "✅ Inventory item updated successfully" });
    } catch (error) {
        console.error("Update Item Error:", error);
        res.status(500).json({ message: "Server Error", error: error.message });
    }
};

// Delete inventory item (Admin only)
exports.deleteItem = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: "Unauthorized: User not found in request" });
        }

        // Check if user is admin
        if (req.user.role !== 'admin') {
            return res.status(403).json({ message: "Forbidden: Only admin can delete inventory items" });
        }

        const { itemId } = req.params;
        const db = req.db;

        // Start a transaction
        db.beginTransaction(async (err) => {
            if (err) return res.status(500).json({ message: "Server Error", error: err });

            try {
                // Check if item exists
                const [itemResult] = await db.promise().execute(
                    "SELECT * FROM inventory_item WHERE item_id = ?",
                    [itemId]
                );

                if (itemResult.length === 0) {
                    throw new Error("Item not found");
                }

                // Check if item has any stock
                const [stockResult] = await db.promise().execute(
                    "SELECT * FROM inventory_stock WHERE item_id = ?",
                    [itemId]
                );

                if (stockResult.length > 0) {
                    throw new Error("Cannot delete item: Stock entries exist for this item");
                }

                // Check if item has been used in any services
                const [usageResult] = await db.promise().execute(
                    `SELECT spu.* 
                     FROM service_parts_used spu
                     JOIN inventory_stock ist ON spu.stock_id = ist.stock_id
                     WHERE ist.item_id = ?`,
                    [itemId]
                );

                if (usageResult.length > 0) {
                    throw new Error("Cannot delete item: Item has been used in services");
                }

                // Delete item
                await db.promise().execute(
                    "DELETE FROM inventory_item WHERE item_id = ?",
                    [itemId]
                );

                // Commit transaction
                await db.promise().commit();
                res.status(200).json({ message: "✅ Inventory item deleted successfully" });
            } catch (error) {
                // Rollback transaction on error
                await db.promise().rollback();
                throw error;
            }
        });
    } catch (error) {
        console.error("Delete Item Error:", error);
        res.status(500).json({ message: "Server Error", error: error.message });
    }
};

// Get items by category
exports.getItemsByCategory = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: "Unauthorized: User not found in request" });
        }

        const { category } = req.params;
        const db = req.db;

        db.execute(
            `SELECT 
                ii.*,
                COALESCE(SUM(ist.quantity_available), 0) as total_quantity,
                MAX(ist.selling_price) as current_selling_price
             FROM inventory_item ii
             LEFT JOIN inventory_stock ist ON ii.item_id = ist.item_id
             WHERE ii.category = ?
             GROUP BY ii.item_id
             ORDER BY ii.item_name`,
            [category],
            (err, results) => {
                if (err) return res.status(500).json({ message: "Server Error", error: err });
                res.status(200).json(results);
            }
        );
    } catch (error) {
        res.status(500).json({ message: "Server Error", error });
    }
};

// Get all categories
exports.getAllCategories = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: "Unauthorized: User not found in request" });
        }

        const db = req.db;
        db.execute(
            `SELECT DISTINCT category 
             FROM inventory_item 
             ORDER BY category`,
            (err, results) => {
                if (err) return res.status(500).json({ message: "Server Error", error: err });
                res.status(200).json(results.map(r => r.category));
            }
        );
    } catch (error) {
        res.status(500).json({ message: "Server Error", error });
    }
}; 