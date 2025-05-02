require("dotenv").config();

// Create new inventory release (Admin only)
exports.createRelease = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: "Unauthorized: User not found in request" });
        }

        // Check if user is admin
        if (req.user.role !== 'admin') {
            return res.status(403).json({ message: "Forbidden: Only admin can create inventory releases" });
        }

        const {
            item_id,
            quantity,
            date
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

                // Check available quantity (total)
                const [totalStockResult] = await db.promise().execute(
                    "SELECT SUM(available_qty) as total_available FROM inventory_stock WHERE item_id = ?",
                    [item_id]
                );

                const totalAvailable = totalStockResult[0].total_available || 0;
                if (totalAvailable < quantity) {
                    throw new Error(`Insufficient stock. Only ${totalAvailable} available.`);
                }

                // Get stock entries sorted by FIFO (oldest purchase_date first)
                const [stockEntries] = await db.promise().execute(
                    `SELECT * FROM inventory_stock 
                     WHERE item_id = ? AND available_qty > 0
                     ORDER BY purchase_date ASC, stock_id ASC`,
                    [item_id]
                );

                let remainingQuantityToRelease = quantity;
                const affectedStocks = [];

                // With FIFO, we'll process each stock entry starting from the oldest
                for (const stock of stockEntries) {
                    if (remainingQuantityToRelease <= 0) break;

                    const deductAmount = Math.min(remainingQuantityToRelease, stock.available_qty);
                    const newAvailableQty = stock.available_qty - deductAmount;
                    
                    // Update the stock
                    await db.promise().execute(
                        `UPDATE inventory_stock SET available_qty = ? WHERE stock_id = ?`,
                        [newAvailableQty, stock.stock_id]
                    );

                    // Create release record for this stock
                    await db.promise().execute(
                        `INSERT INTO inventory_release (
                            item_id, stock_id, quantity, date
                        ) VALUES (?, ?, ?, ?)`,
                        [item_id, stock.stock_id, deductAmount, date || new Date()]
                    );

                    affectedStocks.push({
                        stock_id: stock.stock_id,
                        deducted: deductAmount,
                        remaining: newAvailableQty
                    });

                    remainingQuantityToRelease -= deductAmount;
                }

                // Commit transaction
                await db.promise().commit();
                
                res.status(201).json({
                    message: "✅ Inventory release completed successfully",
                    affected_stocks: affectedStocks
                });
            } catch (error) {
                // Rollback transaction on error
                await db.promise().rollback();
                throw error;
            }
        });
    } catch (error) {
        console.error("Inventory Release Error:", error);
        res.status(500).json({ message: "Server Error", error: error.message });
    }
};

// Get all inventory releases
exports.getAllReleases = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: "Unauthorized: User not found in request" });
        }

        const db = req.db;
        db.execute(
            `SELECT 
                ir.release_id, ir.item_id, ir.stock_id, ir.quantity, ir.date,
                ii.item_name, ii.brand, ii.category, ii.unit,
                ist.purchase_date, ist.buying_price, ist.selling_price
             FROM inventory_release ir
             JOIN inventory_item ii ON ir.item_id = ii.item_id
             JOIN inventory_stock ist ON ir.stock_id = ist.stock_id
             ORDER BY ir.date DESC, ir.release_id DESC`,
            (err, results) => {
                if (err) return res.status(500).json({ message: "Server Error", error: err });
                res.status(200).json(results);
            }
        );
    } catch (error) {
        res.status(500).json({ message: "Server Error", error });
    }
};

// Get release by ID
exports.getReleaseById = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: "Unauthorized: User not found in request" });
        }

        const { releaseId } = req.params;
        const db = req.db;

        // Get the release details
        db.execute(
            `SELECT 
                ir.release_id, ir.item_id, ir.stock_id, ir.quantity, ir.date,
                ii.item_name, ii.brand, ii.category, ii.unit,
                ist.purchase_date, ist.buying_price, ist.selling_price, ist.purchase_id
             FROM inventory_release ir
             JOIN inventory_item ii ON ir.item_id = ii.item_id
             JOIN inventory_stock ist ON ir.stock_id = ist.stock_id
             WHERE ir.release_id = ?`,
            [releaseId],
            (err, results) => {
                if (err) return res.status(500).json({ message: "Server Error", error: err });

                if (results.length === 0) {
                    return res.status(404).json({ message: "❌ Release not found" });
                }

                res.status(200).json(results[0]);
            }
        );
    } catch (error) {
        res.status(500).json({ message: "Server Error", error });
    }
};

// Get releases by item ID
exports.getReleasesByItemId = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: "Unauthorized: User not found in request" });
        }

        const { itemId } = req.params;
        const db = req.db;

        db.execute(
            `SELECT 
                ir.release_id, ir.item_id, ir.stock_id, ir.quantity, ir.date,
                ii.item_name, ii.brand, ii.category, ii.unit,
                ist.purchase_date, ist.buying_price, ist.selling_price
             FROM inventory_release ir
             JOIN inventory_item ii ON ir.item_id = ii.item_id
             JOIN inventory_stock ist ON ir.stock_id = ist.stock_id
             WHERE ir.item_id = ?
             ORDER BY ir.date DESC, ir.release_id DESC`,
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

// Get inventory stock status with FIFO details
exports.getItemStockStatus = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: "Unauthorized: User not found in request" });
        }

        const { itemId } = req.params;
        const db = req.db;

        // First check if item exists
        const [itemResult] = await db.promise().execute(
            "SELECT * FROM inventory_item WHERE item_id = ?",
            [itemId]
        );

        if (itemResult.length === 0) {
            return res.status(404).json({ message: "❌ Item not found" });
        }

        // Get stock details sorted by FIFO order
        const [stockResult] = await db.promise().execute(
            `SELECT 
                stock_id, purchase_id, available_qty, buying_price, selling_price, purchase_date
             FROM inventory_stock
             WHERE item_id = ? AND available_qty > 0
             ORDER BY purchase_date ASC, stock_id ASC`,
            [itemId]
        );

        // Get total available quantity
        const [totalResult] = await db.promise().execute(
            "SELECT SUM(available_qty) as total_available FROM inventory_stock WHERE item_id = ?",
            [itemId]
        );

        res.status(200).json({
            item_id: parseInt(itemId),
            item_details: itemResult[0],
            total_available: totalResult[0].total_available || 0,
            stock_entries: stockResult
        });
    } catch (error) {
        console.error("Get Stock Status Error:", error);
        res.status(500).json({ message: "Server Error", error: error.message });
    }
}; 