require("dotenv").config();

// Create service record (Admin or Technician only)
exports.createServiceRecord = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: "Unauthorized: User not found in request" });
        }

        // Check if user is admin or technician
        if (req.user.role !== 'admin' && req.user.role !== 'technician') {
            return res.status(403).json({ message: "Forbidden: Only admin and technicians can create service records" });
        }

        const {
            vehicle_number,
            service_description,
            date_,
            next_service_date,
            millage,
            parts_used // New field for parts used in service
        } = req.body;

        const db = req.db;

        // Check if vehicle exists
        db.execute("SELECT * FROM vehicle_profile WHERE vehicle_number = ?", [vehicle_number], async (err, results) => {
            if (err) return res.status(500).json({ message: "Server Error", error: err });

            if (results.length === 0) {
                return res.status(404).json({ message: "❌ Vehicle not found" });
            }

            // Start a transaction
            db.beginTransaction(async (err) => {
                if (err) return res.status(500).json({ message: "Server Error", error: err });

                try {
                    // Insert service record
                    const [serviceResult] = await db.promise().execute(
                        `INSERT INTO service_record (
                            vehicle_number, service_description, date_, 
                            next_service_date, millage
                        ) VALUES (?, ?, ?, ?, ?)`,
                        [vehicle_number, service_description, date_, next_service_date, millage]
                    );

                    const service_id = serviceResult.insertId;

                    // If parts were used in the service
                    if (parts_used && parts_used.length > 0) {
                        for (const part of parts_used) {
                            // Check if enough stock is available
                            const [stockResult] = await db.promise().execute(
                                "SELECT quantity_available FROM inventory_stock WHERE stock_id = ?",
                                [part.stock_id]
                            );

                            if (stockResult.length === 0) {
                                throw new Error(`Stock with ID ${part.stock_id} not found`);
                            }

                            if (stockResult[0].quantity_available < part.quantity_used) {
                                throw new Error(`Insufficient stock available for stock ID ${part.stock_id}`);
                            }

                            // Insert into service_parts_used
                            await db.promise().execute(
                                "INSERT INTO service_parts_used (service_id, stock_id, quantity_used) VALUES (?, ?, ?)",
                                [service_id, part.stock_id, part.quantity_used]
                            );

                            // Update inventory stock
                            await db.promise().execute(
                                "UPDATE inventory_stock SET quantity_available = quantity_available - ? WHERE stock_id = ?",
                                [part.quantity_used, part.stock_id]
                            );
                        }
                    }

                    // Commit transaction
                    await db.promise().commit();

                    res.status(201).json({ 
                        message: "✅ Service record created successfully",
                        record_id: service_id
                    });
                } catch (error) {
                    // Rollback transaction on error
                    await db.promise().rollback();
                    throw error;
                }
            });
        });
    } catch (error) {
        console.error("Create Service Record Error:", error);
        res.status(500).json({ message: "Server Error", error: error.message });
    }
};

// Get all service records (Admin only)
exports.getAllServiceRecords = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: "Unauthorized: User not found in request" });
        }

        // Check if user is admin
        if (req.user.role !== 'admin') {
            return res.status(403).json({ message: "Forbidden: Only admin can view all service records" });
        }

        const db = req.db;
        db.execute(
            `SELECT 
                sr.*,
                vp.make,
                vp.model,
                u.first_name,
                u.last_name,
                GROUP_CONCAT(
                    CONCAT(
                        ii.item_name,
                        ' (Qty: ',
                        spu.quantity_used,
                        ')'
                    )
                ) as parts_used
             FROM service_record sr
             JOIN vehicle_profile vp ON sr.vehicle_number = vp.vehicle_number
             JOIN user u ON vp.user_id = u.user_id
             LEFT JOIN service_parts_used spu ON sr.record_id = spu.service_id
             LEFT JOIN inventory_stock ist ON spu.stock_id = ist.stock_id
             LEFT JOIN inventory_item ii ON ist.item_id = ii.item_id
             GROUP BY sr.record_id
             ORDER BY sr.date_ DESC`,
            (err, results) => {
                if (err) return res.status(500).json({ message: "Server Error", error: err });
                res.status(200).json(results);
            }
        );
    } catch (error) {
        res.status(500).json({ message: "Server Error", error });
    }
};

// Get service records by vehicle number
exports.getServiceRecordsByVehicle = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: "Unauthorized: User not found in request" });
        }

        const { vehicleNumber } = req.params;
        const db = req.db;

        // Check if vehicle exists and user has access
        db.execute(
            `SELECT vp.*, u.user_id 
             FROM vehicle_profile vp
             JOIN user u ON vp.user_id = u.user_id
             WHERE vp.vehicle_number = ?`,
            [vehicleNumber],
            (err, results) => {
                if (err) return res.status(500).json({ message: "Server Error", error: err });

                if (results.length === 0) {
                    return res.status(404).json({ message: "❌ Vehicle not found" });
                }

                // Check if user is admin or the vehicle belongs to the user
                if (req.user.role !== 'admin' && results[0].user_id !== req.user.user_id) {
                    return res.status(403).json({ message: "Forbidden: You can only view service records for your own vehicles" });
                }

                // Get service records for the vehicle with parts used
                db.execute(
                    `SELECT 
                        sr.*,
                        vp.make,
                        vp.model,
                        GROUP_CONCAT(
                            CONCAT(
                                ii.item_name,
                                ' (Qty: ',
                                spu.quantity_used,
                                ')'
                            )
                        ) as parts_used
                     FROM service_record sr
                     JOIN vehicle_profile vp ON sr.vehicle_number = vp.vehicle_number
                     LEFT JOIN service_parts_used spu ON sr.record_id = spu.service_id
                     LEFT JOIN inventory_stock ist ON spu.stock_id = ist.stock_id
                     LEFT JOIN inventory_item ii ON ist.item_id = ii.item_id
                     WHERE sr.vehicle_number = ?
                     GROUP BY sr.record_id
                     ORDER BY sr.date_ DESC`,
                    [vehicleNumber],
                    (err, records) => {
                        if (err) return res.status(500).json({ message: "Server Error", error: err });
                        res.status(200).json(records);
                    }
                );
            }
        );
    } catch (error) {
        res.status(500).json({ message: "Server Error", error });
    }
};

// Update service record (Admin or Technician only)
exports.updateServiceRecord = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: "Unauthorized: User not found in request" });
        }

        // Check if user is admin or technician
        if (req.user.role !== 'admin' && req.user.role !== 'technician') {
            return res.status(403).json({ message: "Forbidden: Only admin and technicians can update service records" });
        }

        const { recordId } = req.params;
        const {
            service_description,
            date_,
            next_service_date,
            millage,
            parts_used // New field for parts used in service
        } = req.body;

        const db = req.db;

        // Start a transaction
        db.beginTransaction(async (err) => {
            if (err) return res.status(500).json({ message: "Server Error", error: err });

            try {
                // Check if service record exists
                const [recordResult] = await db.promise().execute(
                    "SELECT * FROM service_record WHERE record_id = ?",
                    [recordId]
                );

                if (recordResult.length === 0) {
                    throw new Error("Service record not found");
                }

                // Update service record
                await db.promise().execute(
                    `UPDATE service_record 
                     SET service_description = ?, date_ = ?, 
                         next_service_date = ?, millage = ?
                     WHERE record_id = ?`,
                    [service_description, date_, next_service_date, millage, recordId]
                );

                // If parts_used is provided, update the parts used
                if (parts_used) {
                    // First, get current parts used to restore stock
                    const [currentParts] = await db.promise().execute(
                        "SELECT stock_id, quantity_used FROM service_parts_used WHERE service_id = ?",
                        [recordId]
                    );

                    // Restore stock quantities
                    for (const part of currentParts) {
                        await db.promise().execute(
                            "UPDATE inventory_stock SET quantity_available = quantity_available + ? WHERE stock_id = ?",
                            [part.quantity_used, part.stock_id]
                        );
                    }

                    // Delete existing parts used entries
                    await db.promise().execute(
                        "DELETE FROM service_parts_used WHERE service_id = ?",
                        [recordId]
                    );

                    // Add new parts used entries
                    for (const part of parts_used) {
                        // Check if enough stock is available
                        const [stockResult] = await db.promise().execute(
                            "SELECT quantity_available FROM inventory_stock WHERE stock_id = ?",
                            [part.stock_id]
                        );

                        if (stockResult.length === 0) {
                            throw new Error(`Stock with ID ${part.stock_id} not found`);
                        }

                        if (stockResult[0].quantity_available < part.quantity_used) {
                            throw new Error(`Insufficient stock available for stock ID ${part.stock_id}`);
                        }

                        // Insert new service_parts_used entry
                        await db.promise().execute(
                            "INSERT INTO service_parts_used (service_id, stock_id, quantity_used) VALUES (?, ?, ?)",
                            [recordId, part.stock_id, part.quantity_used]
                        );

                        // Update inventory stock
                        await db.promise().execute(
                            "UPDATE inventory_stock SET quantity_available = quantity_available - ? WHERE stock_id = ?",
                            [part.quantity_used, part.stock_id]
                        );
                    }
                }

                // Commit transaction
                await db.promise().commit();
                res.status(200).json({ message: "✅ Service record updated successfully" });
            } catch (error) {
                // Rollback transaction on error
                await db.promise().rollback();
                throw error;
            }
        });
    } catch (error) {
        console.error("Update Service Record Error:", error);
        res.status(500).json({ message: "Server Error", error: error.message });
    }
};

// Delete service record (Admin only)
exports.deleteServiceRecord = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: "Unauthorized: User not found in request" });
        }

        // Check if user is admin
        if (req.user.role !== 'admin') {
            return res.status(403).json({ message: "Forbidden: Only admin can delete service records" });
        }

        const { recordId } = req.params;
        const db = req.db;

        // Start a transaction
        db.beginTransaction(async (err) => {
            if (err) return res.status(500).json({ message: "Server Error", error: err });

            try {
                // Get current parts used to restore stock
                const [currentParts] = await db.promise().execute(
                    "SELECT stock_id, quantity_used FROM service_parts_used WHERE service_id = ?",
                    [recordId]
                );

                // Restore stock quantities
                for (const part of currentParts) {
                    await db.promise().execute(
                        "UPDATE inventory_stock SET quantity_available = quantity_available + ? WHERE stock_id = ?",
                        [part.quantity_used, part.stock_id]
                    );
                }

                // Delete service record (cascade will handle service_parts_used deletion)
                await db.promise().execute(
                    "DELETE FROM service_record WHERE record_id = ?",
                    [recordId]
                );

                // Commit transaction
                await db.promise().commit();
                res.status(200).json({ message: "✅ Service record deleted successfully" });
            } catch (error) {
                // Rollback transaction on error
                await db.promise().rollback();
                throw error;
            }
        });
    } catch (error) {
        console.error("Delete Service Record Error:", error);
        res.status(500).json({ message: "Server Error", error: error.message });
    }
};

// Add parts to service record (Admin or Technician only)
exports.addPartsToService = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: "Unauthorized: User not found in request" });
        }

        // Check if user is admin or technician
        if (req.user.role !== 'admin' && req.user.role !== 'technician') {
            return res.status(403).json({ message: "Forbidden: Only admin and technicians can add parts to service records" });
        }

        const { recordId } = req.params;
        const { parts } = req.body;
        const db = req.db;

        // Start a transaction
        db.beginTransaction(async (err) => {
            if (err) return res.status(500).json({ message: "Server Error", error: err });

            try {
                // Check if service record exists
                const [recordResult] = await db.promise().execute(
                    "SELECT * FROM service_record WHERE record_id = ?",
                    [recordId]
                );

                if (recordResult.length === 0) {
                    throw new Error("Service record not found");
                }

                // Add new parts
                for (const part of parts) {
                    // Check if enough stock is available
                    const [stockResult] = await db.promise().execute(
                        "SELECT quantity_available FROM inventory_stock WHERE stock_id = ?",
                        [part.stock_id]
                    );

                    if (stockResult.length === 0) {
                        throw new Error(`Stock with ID ${part.stock_id} not found`);
                    }

                    if (stockResult[0].quantity_available < part.quantity_used) {
                        throw new Error(`Insufficient stock available for stock ID ${part.stock_id}`);
                    }

                    // Check if part is already used in this service
                    const [existingPart] = await db.promise().execute(
                        "SELECT * FROM service_parts_used WHERE service_id = ? AND stock_id = ?",
                        [recordId, part.stock_id]
                    );

                    if (existingPart.length > 0) {
                        // Update existing part quantity
                        const newQuantity = existingPart[0].quantity_used + part.quantity_used;
                        
                        // Check if new total quantity is available
                        if (stockResult[0].quantity_available < part.quantity_used) {
                            throw new Error(`Insufficient stock available for stock ID ${part.stock_id}`);
                        }

                        await db.promise().execute(
                            "UPDATE service_parts_used SET quantity_used = ? WHERE service_id = ? AND stock_id = ?",
                            [newQuantity, recordId, part.stock_id]
                        );
                    } else {
                        // Insert new service_parts_used entry
                        await db.promise().execute(
                            "INSERT INTO service_parts_used (service_id, stock_id, quantity_used) VALUES (?, ?, ?)",
                            [recordId, part.stock_id, part.quantity_used]
                        );
                    }

                    // Update inventory stock
                    await db.promise().execute(
                        "UPDATE inventory_stock SET quantity_available = quantity_available - ? WHERE stock_id = ?",
                        [part.quantity_used, part.stock_id]
                    );
                }

                // Commit transaction
                await db.promise().commit();
                res.status(200).json({ message: "✅ Parts added to service record successfully" });
            } catch (error) {
                // Rollback transaction on error
                await db.promise().rollback();
                throw error;
            }
        });
    } catch (error) {
        console.error("Add Parts to Service Error:", error);
        res.status(500).json({ message: "Server Error", error: error.message });
    }
};