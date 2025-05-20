require("dotenv").config();

// Create item
exports.createItem = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: "Unauthorized: User not found in request" });
        }

        const { item_name, item_description, category, brand, unit, restock_level } = req.body;
        const adminId = req.user.id;
        const db = req.db;

        // Check if we're using the new schema with item_category table
        db.execute("SHOW TABLES LIKE 'item_category'", (tableErr, tableResults) => {
            if (tableErr) {
                console.error("Error checking for item_category table:", tableErr);
                return res.status(500).json({ message: "Server Error", error: tableErr });
            }

            if (tableResults && tableResults.length > 0) {
                // The item_category table exists, check if the category exists
                db.execute(
                    "SELECT category_id FROM item_category WHERE category = ?",
                    [category],
                    (categoryErr, categoryResults) => {
                        if (categoryErr) {
                            console.error("Error checking category:", categoryErr);
                            return res.status(500).json({ message: "Server Error", error: categoryErr });
                        }

                        let categoryId;
                        
                        if (categoryResults.length === 0) {
                            // Create new category
                            db.execute(
                                "INSERT INTO item_category (category) VALUES (?)",
                                [category],
                                (insertCategoryErr, insertCategoryResults) => {
                                    if (insertCategoryErr) {
                                        console.error("Error creating category:", insertCategoryErr);
                                        return res.status(500).json({ message: "Server Error", error: insertCategoryErr });
                                    }
                                    
                                    categoryId = insertCategoryResults.insertId;
                                    createItem(categoryId);
                                }
                            );
                        } else {
                            categoryId = categoryResults[0].category_id;
                            createItem(categoryId);
                        }

                        function createItem(categoryId) {
                            // Insert the item using the new schema with category_id reference
                            const query = `
                                INSERT INTO inventory_item 
                                (item_name, item_description, category, brand, unit, restock_level)
                                VALUES (?, ?, ?, ?, ?, ?)
                            `;
                            
                            db.execute(
                                query,
                                [item_name, item_description, category, brand, unit, restock_level],
                                (err, results) => {
                                    if (err) {
                                        console.error("Error inserting item:", err);
                                        return res.status(500).json({ message: "Server Error", error: err });
                                    }
                                    
                                    res.status(201).json({
                                        message: "Inventory item created successfully",
                                        item_id: results.insertId
                                    });
                                }
                            );
                        }
                    }
                );
            } else {
                // If item_category table doesn't exist, use the direct category approach
                const query = `
                    INSERT INTO inventory_item 
                    (item_name, item_description, category, brand, unit, restock_level)
                    VALUES (?, ?, ?, ?, ?, ?)
                `;
                
                db.execute(
                    query,
                    [item_name, item_description, category, brand, unit, restock_level],
                    (err, results) => {
                        if (err) {
                            console.error("Error inserting item:", err);
                            return res.status(500).json({ message: "Server Error", error: err });
                        }
                        
                        res.status(201).json({
                            message: "Inventory item created successfully",
                            item_id: results.insertId
                        });
                    }
                );
            }
        });
    } catch (error) {
        console.error("General error in createItem:", error);
        res.status(500).json({ message: "Server Error", error });
    }
};

// Get all inventory items
exports.getAllItems = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: "Unauthorized: User not found in request" });
        }

        const db = req.db;
        
        // First check if the item_category table exists
        db.execute("SHOW TABLES LIKE 'item_category'", (tableErr, tableResults) => {
            if (tableErr) {
                console.error("Error checking for item_category table:", tableErr);
                return res.status(500).json({ message: "Server Error", error: tableErr });
            }

            // If the item_category table exists, use the new query with JOIN
            if (tableResults && tableResults.length > 0) {
                // Check if category_id column exists in inventory_item
                db.execute("SHOW COLUMNS FROM inventory_item LIKE 'category_id'", (columnErr, columnResults) => {
                    if (columnErr) {
                        console.error("Error checking for category_id column:", columnErr);
                        return res.status(500).json({ message: "Server Error", error: columnErr });
                    }

                    if (columnResults && columnResults.length > 0) {
                        // Both item_category table and category_id column exist, use new query
                        const query = `
                            SELECT 
                                ii.*,
                                ic.category,
                                COALESCE(SUM(ist.available_qty), 0) as total_quantity
                            FROM inventory_item ii
                            LEFT JOIN item_category ic ON ii.category_id = ic.category_id
                            LEFT JOIN inventory_stock ist ON ii.item_id = ist.item_id
                            GROUP BY ii.item_id
                            ORDER BY ic.category, ii.item_name
                        `;

                        db.execute(query, (err, results) => {
                            if (err) {
                                console.error("Error executing new query:", err);
                                return res.status(500).json({ message: "Server Error", error: err });
                            }
                            res.status(200).json(results);
                        });
                    } else {
                        // category_id doesn't exist, use original query
                        fallbackToOriginalQuery(db, res);
                    }
                });
            } else {
                // item_category doesn't exist, use original query
                fallbackToOriginalQuery(db, res);
            }
        });
    } catch (error) {
        console.error("General error in getAllItems:", error);
        res.status(500).json({ message: "Server Error", error });
    }
};

// Fallback to original query for backward compatibility
function fallbackToOriginalQuery(db, res) {
    
    const query = `
        SELECT 
            ii.*,
            COALESCE(SUM(ist.available_qty), 0) as total_quantity
        FROM inventory_item ii
        LEFT JOIN inventory_stock ist ON ii.item_id = ist.item_id
        GROUP BY ii.item_id
        ORDER BY ii.category, ii.item_name
    `;
    
    db.execute(query, (err, results) => {
        if (err) {
            console.error("Error executing original query:", err);
            return res.status(500).json({ message: "Server Error", error: err });
        }
        res.status(200).json(results);
    });
}

// Get inventory item by ID
exports.getItemById = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: "Unauthorized: User not found in request" });
        }

        const { itemId } = req.params;
        const db = req.db;

        // First check if the item_category table exists
        db.execute("SHOW TABLES LIKE 'item_category'", (tableErr, tableResults) => {
            if (tableErr) {
                console.error("Error checking for item_category table:", tableErr);
                return res.status(500).json({ message: "Server Error", error: tableErr });
            }

            // If the item_category table exists, use the new query with JOIN
            if (tableResults && tableResults.length > 0) {
                // Check if category_id column exists in inventory_item
                db.execute("SHOW COLUMNS FROM inventory_item LIKE 'category_id'", (columnErr, columnResults) => {
                    if (columnErr) {
                        console.error("Error checking for category_id column:", columnErr);
                        return res.status(500).json({ message: "Server Error", error: columnErr });
                    }

                    if (columnResults && columnResults.length > 0) {
                        // Both item_category table and category_id column exist, use new query
                        const query = `
                            SELECT 
                                ii.*,
                                ic.category,
                                COALESCE(SUM(ist.available_qty), 0) as total_quantity
                            FROM inventory_item ii
                            LEFT JOIN item_category ic ON ii.category_id = ic.category_id
                            LEFT JOIN inventory_stock ist ON ii.item_id = ist.item_id
                            WHERE ii.item_id = ?
                            GROUP BY ii.item_id
                        `;

                        db.execute(query, [itemId], (err, results) => {
                            if (err) {
                                console.error("Error executing new query:", err);
                                return res.status(500).json({ message: "Server Error", error: err });
                            }

                            if (results.length === 0) {
                                return res.status(404).json({ message: "❌ Item not found" });
                            }

                            res.status(200).json(results[0]);
                        });
                    } else {
                        // category_id doesn't exist, use original query
                        fallbackToOriginalGetItemById(db, res, itemId);
                    }
                });
            } else {
                // item_category doesn't exist, use original query
                fallbackToOriginalGetItemById(db, res, itemId);
            }
        });
    } catch (error) {
        console.error("General error in getItemById:", error);
        res.status(500).json({ message: "Server Error", error });
    }
};

// Fallback to original query for getItemById
function fallbackToOriginalGetItemById(db, res, itemId) {
    console.log("Falling back to original query for GetItemById (without category table)");
    
    const query = `
        SELECT 
            ii.*,
            COALESCE(SUM(ist.available_qty), 0) as total_quantity
        FROM inventory_item ii
        LEFT JOIN inventory_stock ist ON ii.item_id = ist.item_id
        WHERE ii.item_id = ?
        GROUP BY ii.item_id
    `;
    
    db.execute(query, [itemId], (err, results) => {
        if (err) {
            console.error("Error executing original query:", err);
            return res.status(500).json({ message: "Server Error", error: err });
        }

        if (results.length === 0) {
            return res.status(404).json({ message: "❌ Item not found" });
        }

        res.status(200).json(results[0]);
    });
}

// Update inventory item
exports.updateItem = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: "Unauthorized: User not found in request" });
        }

        const itemId = req.body.item_id;
        console.log("Updating item ID:", itemId);
        
        if (!itemId) {
            return res.status(400).json({ message: "Item ID is required" });
        }

        // Extract values from request body with default values
        const {
            item_name = "",
            item_description = "",
            category = "",
            brand = "",
            unit = "",
            restock_level = 0,
        } = req.body;

        // Validate required fields
        if (!item_name) {
            return res.status(400).json({ message: "Item name is required" });
        }

        const db = req.db;

        // Direct update query
        let query = `
            UPDATE inventory_item 
            SET item_name = ?, 
                item_description = ?, 
                category = ?, 
                brand = ?, 
                unit = ?, 
                restock_level = ?
            WHERE item_id = ?
        `;
        
        const params = [
            item_name,
            item_description,
            category,
            brand,
            unit,
            restock_level,
            itemId
        ];
        
        db.execute(query, params, (err, results) => {
            if (err) {
                console.error("Error updating item:", err);
                return res.status(500).json({ message: "Server Error", error: err });
            }
            
            if (results.affectedRows === 0) {
                return res.status(404).json({ message: "Item not found" });
            }
            
            res.status(200).json({
                message: "Inventory item updated successfully"
            });
        });
    } catch (error) {
        console.error("General error in updateItem:", error);
        res.status(500).json({ message: "Server Error", error });
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

        const { categoryId } = req.params;
        const db = req.db;

        // First check if the item_category table exists
        db.execute("SHOW TABLES LIKE 'item_category'", (tableErr, tableResults) => {
            if (tableErr) {
                console.error("Error checking for item_category table:", tableErr);
                return res.status(500).json({ message: "Server Error", error: tableErr });
            }

            // If the item_category table exists, use the new query with JOIN
            if (tableResults && tableResults.length > 0) {
                // Check if category_id column exists in inventory_item
                db.execute("SHOW COLUMNS FROM inventory_item LIKE 'category_id'", (columnErr, columnResults) => {
                    if (columnErr) {
                        console.error("Error checking for category_id column:", columnErr);
                        return res.status(500).json({ message: "Server Error", error: columnErr });
                    }

                    if (columnResults && columnResults.length > 0) {
                        // Both item_category table and category_id column exist, use new query
                        const query = `
                            SELECT 
                                ii.*,
                                ic.category,
                                COALESCE(SUM(ist.available_qty), 0) as total_quantity
                            FROM inventory_item ii
                            LEFT JOIN item_category ic ON ii.category_id = ic.category_id
                            LEFT JOIN inventory_stock ist ON ii.item_id = ist.item_id
                            WHERE ii.category_id = ?
                            GROUP BY ii.item_id
                            ORDER BY ii.item_name
                        `;

                        db.execute(query, [categoryId], (err, results) => {
                            if (err) {
                                console.error("Error executing new query:", err);
                                return res.status(500).json({ message: "Server Error", error: err });
                            }
                            res.status(200).json(results);
                        });
                    } 
                });
            } 
        });
    } catch (error) {
        console.error("General error in getItemsByCategory:", error);
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
        
        // First check if the item_category table exists
        db.execute("SHOW TABLES LIKE 'item_category'", (tableErr, tableResults) => {
            if (tableErr) {
                console.error("Error checking for item_category table:", tableErr);
                return res.status(500).json({ message: "Server Error", error: tableErr });
            }

            // If the item_category table exists, use the new query
            if (tableResults && tableResults.length > 0) {
                db.execute(
                    `SELECT category_id, category FROM item_category ORDER BY category`,
                    (err, results) => {
                        if (err) {
                            console.error("Error fetching categories from new table:", err);
                            return res.status(500).json({ message: "Server Error", error: err });
                        }
                        res.status(200).json(results);
                    }
                );
            } else {
                // Fall back to the original method of getting categories from inventory_item
                db.execute(
                    `SELECT DISTINCT category FROM inventory_item ORDER BY category`,
                    (err, results) => {
                        if (err) {
                            console.error("Error fetching categories from original table:", err);
                            return res.status(500).json({ message: "Server Error", error: err });
                        }
                        // Transform to match expected format
                        const transformedResults = results.map((row, index) => ({
                            category_id: index + 1, // Assign dummy IDs
                            category: row.category
                        }));
                        res.status(200).json(transformedResults);
                    }
                );
            }
        });
    } catch (error) {
        console.error("General error in getAllCategories:", error);
        res.status(500).json({ message: "Server Error", error });
    }
};

// Create new category (Admin only)
exports.createCategory = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: "Unauthorized: User not found in request" });
        }

        // Check if user is admin
        if (req.user.role !== 'admin') {
            return res.status(403).json({ message: "Forbidden: Only admin can create categories" });
        }

        const { category } = req.body;

        if (!category) {
            return res.status(400).json({ message: "Category name is required" });
        }

        const db = req.db;

        // Check if category already exists
        const [existingCategory] = await db.promise().execute(
            "SELECT * FROM item_category WHERE category = ?",
            [category]
        );

        if (existingCategory.length > 0) {
            return res.status(400).json({ 
                message: "❌ Category already exists" 
            });
        }

        // Create the new category in the dedicated table
        const [result] = await db.promise().execute(
            `INSERT INTO item_category (category) VALUES (?)`,
            [category]
        );

        res.status(201).json({
            message: "✅ Category created successfully",
            category_id: result.insertId,
            category
        });
    } catch (error) {
        console.error("Create Category Error:", error);
        res.status(500).json({ message: "Server Error", error: error.message });
    }
}; 