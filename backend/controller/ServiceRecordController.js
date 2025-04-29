require("dotenv").config();

// Create new service record with parts usage and invoice generation
exports.createServiceRecord = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: "Unauthorized: User not found in request" });
        }

        // Extract service record data from request
        const {
            vehicle_number,
            service_description,
            millage,
            next_service_date,
            parts_used,
            service_charge
        } = req.body;

        // Validate required fields
        if (!vehicle_number || !service_description) {
            return res.status(400).json({ message: "Vehicle number and service description are required" });
        }

        const db = req.db;
        
        // Start a transaction
        db.beginTransaction(async (err) => {
            if (err) return res.status(500).json({ message: "Server Error", error: err });

            try {
                // 1. Create service record
                const [serviceResult] = await db.promise().execute(
                    `INSERT INTO service_record (
                        vehicle_number, service_description, date_, next_service_date, millage
                    ) VALUES (?, ?, CURDATE(), ?, ?)`,
                    [vehicle_number, service_description, next_service_date || null, millage || 0]
                );

                const serviceId = serviceResult.insertId;
                let partsUsed = [];
                let partsTotalPrice = 0;

                // 2. Process parts used (if any)
                if (parts_used && Array.isArray(parts_used) && parts_used.length > 0) {
                    for (const part of parts_used) {
                        const { item_id, quantity } = part;
                        
                        if (!item_id || !quantity || quantity <= 0) {
                            continue; // Skip invalid entries
                        }

                        // Check if item exists
                        const [itemResult] = await db.promise().execute(
                            "SELECT * FROM inventory_item WHERE item_id = ?",
                            [item_id]
                        );

                        if (itemResult.length === 0) {
                            throw new Error(`Item with ID ${item_id} not found`);
                        }

                        // Check available quantity
                        const [totalStockResult] = await db.promise().execute(
                            "SELECT SUM(available_qty) as total_available FROM inventory_stock WHERE item_id = ?",
                            [item_id]
                        );

                        const totalAvailable = totalStockResult[0].total_available || 0;
                        if (totalAvailable < quantity) {
                            throw new Error(`Insufficient stock for item ${itemResult[0].item_name}. Only ${totalAvailable} available.`);
                        }

                        // Get stock entries sorted by FIFO (oldest first)
                        const [stockEntries] = await db.promise().execute(
                            `SELECT * FROM inventory_stock 
                             WHERE item_id = ? AND available_qty > 0
                             ORDER BY purchase_date ASC, stock_id ASC`,
                            [item_id]
                        );

                        let remainingQuantity = quantity;
                        const usedStocks = [];

                        // Process each stock entry using FIFO
                        for (const stock of stockEntries) {
                            if (remainingQuantity <= 0) break;

                            const deductAmount = Math.min(remainingQuantity, stock.available_qty);
                            const newAvailableQty = stock.available_qty - deductAmount;
                            
                            // Update inventory stock
                            await db.promise().execute(
                                `UPDATE inventory_stock SET available_qty = ? WHERE stock_id = ?`,
                                [newAvailableQty, stock.stock_id]
                            );

                            // Create service_parts_used record
                            await db.promise().execute(
                                `INSERT INTO service_parts_used (
                                    service_id, item_id, stock_id, quantity_used
                                ) VALUES (?, ?, ?, ?)`,
                                [serviceId, item_id, stock.stock_id, deductAmount]
                            );

                            // Create inventory_release record
                            await db.promise().execute(
                                `INSERT INTO inventory_release (
                                    service_id, item_id, stock_id, quantity, date
                                ) VALUES (?, ?, ?, ?, CURDATE())`,
                                [serviceId, item_id, stock.stock_id, deductAmount]
                            );

                            // Calculate price for this batch using selling_price instead of unit_price
                            const batchPrice = deductAmount * stock.selling_price;
                            partsTotalPrice += batchPrice;

                            usedStocks.push({
                                stock_id: stock.stock_id,
                                quantity: deductAmount,
                                buying_price: stock.buying_price,
                                selling_price: stock.selling_price,
                                batch_price: batchPrice
                            });

                            remainingQuantity -= deductAmount;
                        }

                        partsUsed.push({
                            item_id,
                            item_name: itemResult[0].item_name,
                            total_quantity: quantity,
                            stocks_used: usedStocks
                        });
                    }
                }

                // 3. Calculate total price
                const totalPrice = (service_charge || 0) + partsTotalPrice;

                // 4. Generate invoice ID (format: INV + service_id padded to 6 digits)
                const invoiceId = `INV${String(serviceId).padStart(6, '0')}`;

                // 5. Create invoice
                await db.promise().execute(
                    `INSERT INTO invoice (
                        invoice_id, user_id, service_id, description,
                        service_charge, parts_total_price, total_price, created_date
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, CURDATE())`,
                    [invoiceId, req.user.user_id, serviceId, service_description, 
                     service_charge || 0, partsTotalPrice, totalPrice]
                );

                // Commit transaction
                await db.promise().commit();
                
                res.status(201).json({
                    message: "✅ Service record created successfully",
                    service_id: serviceId,
                    invoice_id: invoiceId,
                    parts_used: partsUsed,
                    service_charge: service_charge || 0,
                    parts_total_price: partsTotalPrice,
                    total_price: totalPrice
                });
            } catch (error) {
                // Rollback transaction on error
                await db.promise().rollback();
                throw error;
            }
        });
    } catch (error) {
        console.error("Create Service Record Error:", error);
        res.status(500).json({ message: "Server Error", error: error.message });
    }
};

// Get all service records
exports.getAllServiceRecords = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: "Unauthorized: User not found in request" });
        }

        const db = req.db;
        db.execute(
            `SELECT 
                sr.*, vp.make, vp.model, vp.year_of_manuf,
                (SELECT COUNT(*) FROM service_parts_used WHERE service_id = sr.record_id) as parts_count,
                (SELECT invoice_id FROM invoice WHERE service_id = sr.record_id) as invoice_id
             FROM service_record sr
             JOIN vehicle_profile vp ON sr.vehicle_number = vp.vehicle_number
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

// Get service record by ID
exports.getServiceRecordById = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: "Unauthorized: User not found in request" });
        }

        const { serviceId } = req.params;
        const db = req.db;

        // Get service record details
        db.execute(
            `SELECT 
                sr.*, vp.make, vp.model, vp.year_of_manuf, vp.owner_
             FROM service_record sr
             JOIN vehicle_profile vp ON sr.vehicle_number = vp.vehicle_number
             WHERE sr.record_id = ?`,
            [serviceId],
            async (err, results) => {
                if (err) return res.status(500).json({ message: "Server Error", error: err });

                if (results.length === 0) {
                    return res.status(404).json({ message: "❌ Service record not found" });
                }

                const serviceRecord = results[0];

                try {
                    // Get parts used in this service
                    const [partsResult] = await db.promise().execute(
                        `SELECT 
                            spu.stock_id, spu.quantity_used, spu.item_id,
                            ii.item_name, ii.brand, ii.category, ii.unit,
                            ist.buying_price, ist.selling_price
                         FROM service_parts_used spu
                         JOIN inventory_item ii ON spu.item_id = ii.item_id
                         JOIN inventory_stock ist ON spu.stock_id = ist.stock_id
                         WHERE spu.service_id = ?`,
                        [serviceId]
                    );

                    // Get invoice details
                    const [invoiceResult] = await db.promise().execute(
                        `SELECT * FROM invoice WHERE service_id = ?`,
                        [serviceId]
                    );

                    // Combine all data
                    serviceRecord.parts_used = partsResult;
                    serviceRecord.invoice = invoiceResult.length > 0 ? invoiceResult[0] : null;

                    res.status(200).json(serviceRecord);
                } catch (detailErr) {
                    console.error("Error fetching service details:", detailErr);
                    res.status(200).json(serviceRecord); // Return basic info if details fetch fails
                }
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

        db.execute(
            `SELECT 
                sr.*, 
                (SELECT COUNT(*) FROM service_parts_used WHERE service_id = sr.record_id) as parts_count,
                (SELECT invoice_id FROM invoice WHERE service_id = sr.record_id) as invoice_id
             FROM service_record sr
             WHERE sr.vehicle_number = ?
             ORDER BY sr.date_ DESC`,
            [vehicleNumber],
            (err, results) => {
                if (err) return res.status(500).json({ message: "Server Error", error: err });
                res.status(200).json(results);
            }
        );
    } catch (error) {
        res.status(500).json({ message: "Server Error", error });
    }
};

// Get service records by date range
exports.getServiceRecordsByDateRange = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: "Unauthorized: User not found in request" });
        }

        const { startDate, endDate } = req.query;
        
        if (!startDate || !endDate) {
            return res.status(400).json({ message: "Start date and end date are required" });
        }

        const db = req.db;

        db.execute(
            `SELECT 
                sr.*, vp.make, vp.model,
                (SELECT COUNT(*) FROM service_parts_used WHERE service_id = sr.record_id) as parts_count,
                (SELECT invoice_id FROM invoice WHERE service_id = sr.record_id) as invoice_id
             FROM service_record sr
             JOIN vehicle_profile vp ON sr.vehicle_number = vp.vehicle_number
             WHERE sr.date_ BETWEEN ? AND ?
             ORDER BY sr.date_ DESC`,
            [startDate, endDate],
            (err, results) => {
                if (err) return res.status(500).json({ message: "Server Error", error: err });
                res.status(200).json(results);
            }
        );
    } catch (error) {
        res.status(500).json({ message: "Server Error", error });
    }
};

// Add parts to an existing service record
exports.addPartsToServiceRecord = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: "Unauthorized: User not found in request" });
        }

        const { serviceId } = req.params;
        const { parts_used } = req.body;

        if (!parts_used || !Array.isArray(parts_used) || parts_used.length === 0) {
            return res.status(400).json({ message: "At least one part is required" });
        }

        const db = req.db;

        // Start a transaction
        db.beginTransaction(async (err) => {
            if (err) return res.status(500).json({ message: "Server Error", error: err });

            try {
                // Check if service record exists
                const [serviceResult] = await db.promise().execute(
                    "SELECT * FROM service_record WHERE record_id = ?",
                    [serviceId]
                );

                if (serviceResult.length === 0) {
                    throw new Error("Service record not found");
                }

                let partsTotalPrice = 0;
                let partsUsed = [];

                // Process each part
                for (const part of parts_used) {
                    const { item_id, stock_id, quantity } = part;
                    
                    if (!item_id || !quantity || quantity <= 0) {
                        continue; // Skip invalid entries
                    }

                    // If stock_id is provided, use specific stock batch
                    if (stock_id) {
                        // Check if stock exists and has enough quantity
                        const [stockResult] = await db.promise().execute(
                            "SELECT * FROM inventory_stock WHERE stock_id = ? AND item_id = ?",
                            [stock_id, item_id]
                        );

                        if (stockResult.length === 0) {
                            throw new Error(`Stock batch #${stock_id} not found for item ${item_id}`);
                        }

                        const stock = stockResult[0];
                        if (stock.available_qty < quantity) {
                            throw new Error(`Insufficient quantity in batch #${stock_id}. Only ${stock.available_qty} available.`);
                        }

                        // Update inventory stock
                        const newAvailableQty = stock.available_qty - quantity;
                        await db.promise().execute(
                            `UPDATE inventory_stock SET available_qty = ? WHERE stock_id = ?`,
                            [newAvailableQty, stock_id]
                        );

                        // Check if this part (service_id, item_id, stock_id combination) already exists
                        const [existingPart] = await db.promise().execute(
                            `SELECT * FROM service_parts_used 
                             WHERE service_id = ? AND item_id = ? AND stock_id = ?`,
                            [serviceId, item_id, stock_id]
                        );

                        if (existingPart.length > 0) {
                            // Update existing record with additional quantity
                            const newQuantity = existingPart[0].quantity_used + quantity;
                            await db.promise().execute(
                                `UPDATE service_parts_used 
                                 SET quantity_used = ? 
                                 WHERE service_id = ? AND item_id = ? AND stock_id = ?`,
                                [newQuantity, serviceId, item_id, stock_id]
                            );
                        } else {
                            // Create new service_parts_used record
                            await db.promise().execute(
                                `INSERT INTO service_parts_used (
                                    service_id, item_id, stock_id, quantity_used
                                ) VALUES (?, ?, ?, ?)`,
                                [serviceId, item_id, stock_id, quantity]
                            );
                        }

                        // Create inventory_release record
                        await db.promise().execute(
                            `INSERT INTO inventory_release (
                                service_id, item_id, stock_id, quantity, date
                            ) VALUES (?, ?, ?, ?, CURDATE())`,
                            [serviceId, item_id, stock_id, quantity]
                        );

                        // Calculate price for this batch (for reporting purposes only)
                        const batchPrice = quantity * stock.selling_price;
                        partsTotalPrice += batchPrice;

                        // Get item details
                        const [itemResult] = await db.promise().execute(
                            "SELECT * FROM inventory_item WHERE item_id = ?",
                            [item_id]
                        );

                        partsUsed.push({
                            item_id,
                            item_name: itemResult[0]?.item_name || `Item #${item_id}`,
                            stock_id,
                            quantity,
                            buying_price: stock.buying_price,
                            selling_price: stock.selling_price,
                            total_price: batchPrice
                        });
                    } else {
                        // FIFO approach when no specific stock is selected
                        // Get stock entries sorted by FIFO (oldest first)
                        const [stockEntries] = await db.promise().execute(
                            `SELECT * FROM inventory_stock 
                             WHERE item_id = ? AND available_qty > 0
                             ORDER BY purchase_date ASC, stock_id ASC`,
                            [item_id]
                        );

                        let remainingQuantity = quantity;
                        const usedStocks = [];

                        // Check if there's enough total stock
                        const totalAvailable = stockEntries.reduce((sum, entry) => sum + entry.available_qty, 0);
                        if (totalAvailable < quantity) {
                            throw new Error(`Insufficient stock for item ${item_id}. Only ${totalAvailable} available.`);
                        }

                        // Process each stock entry using FIFO
                        for (const stock of stockEntries) {
                            if (remainingQuantity <= 0) break;

                            const deductAmount = Math.min(remainingQuantity, stock.available_qty);
                            const newAvailableQty = stock.available_qty - deductAmount;
                            
                            // Update inventory stock
                            await db.promise().execute(
                                `UPDATE inventory_stock SET available_qty = ? WHERE stock_id = ?`,
                                [newAvailableQty, stock.stock_id]
                            );

                            // Check if this part (service_id, item_id, stock_id combination) already exists
                            const [existingPart] = await db.promise().execute(
                                `SELECT * FROM service_parts_used 
                                 WHERE service_id = ? AND item_id = ? AND stock_id = ?`,
                                [serviceId, item_id, stock.stock_id]
                            );

                            if (existingPart.length > 0) {
                                // Update existing record with additional quantity
                                const newQuantity = existingPart[0].quantity_used + deductAmount;
                                await db.promise().execute(
                                    `UPDATE service_parts_used 
                                     SET quantity_used = ? 
                                     WHERE service_id = ? AND item_id = ? AND stock_id = ?`,
                                    [newQuantity, serviceId, item_id, stock.stock_id]
                                );
                            } else {
                                // Create new service_parts_used record
                                await db.promise().execute(
                                    `INSERT INTO service_parts_used (
                                        service_id, item_id, stock_id, quantity_used
                                    ) VALUES (?, ?, ?, ?)`,
                                    [serviceId, item_id, stock.stock_id, deductAmount]
                                );
                            }

                            // Create inventory_release record
                            await db.promise().execute(
                                `INSERT INTO inventory_release (
                                    service_id, item_id, stock_id, quantity, date
                                ) VALUES (?, ?, ?, ?, CURDATE())`,
                                [serviceId, item_id, stock.stock_id, deductAmount]
                            );

                            // Calculate price for this batch
                            const batchPrice = deductAmount * stock.selling_price;
                            partsTotalPrice += batchPrice;

                            usedStocks.push({
                                stock_id: stock.stock_id,
                                quantity: deductAmount,
                                buying_price: stock.buying_price,
                                selling_price: stock.selling_price,
                                batch_price: batchPrice
                            });

                            remainingQuantity -= deductAmount;
                        }

                        // Get item details
                        const [itemResult] = await db.promise().execute(
                            "SELECT * FROM inventory_item WHERE item_id = ?",
                            [item_id]
                        );

                        partsUsed.push({
                            item_id,
                            item_name: itemResult[0]?.item_name || `Item #${item_id}`,
                            quantity,
                            stocks_used: usedStocks
                        });
                    }
                }

                // Commit transaction
                await db.promise().commit();
                
                res.status(200).json({
                    message: "✅ Parts added successfully",
                    parts_used: partsUsed,
                    parts_total_price: partsTotalPrice
                });
            } catch (error) {
                // Rollback transaction on error
                await db.promise().rollback();
                console.error("Add Parts Error:", error);
                res.status(500).json({ message: error.message || "Server Error" });
            }
        });
    } catch (error) {
        console.error("Add Parts Error:", error);
        res.status(500).json({ message: "Server Error", error: error.message });
    }
};

// Delete a part from a service record
exports.deleteServicePart = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: "Unauthorized: User not found in request" });
        }

        // Check if user is admin
        if (req.user.role !== 'admin') {
            return res.status(403).json({ message: "Forbidden: Only admin can delete service parts" });
        }

        const { serviceId, stockId, itemId } = req.params;
        const db = req.db;

        // Start a transaction
        db.beginTransaction(async (err) => {
            if (err) return res.status(500).json({ message: "Server Error", error: err });

            try {
                // 1. Check if the service record exists
                const [serviceResult] = await db.promise().execute(
                    "SELECT * FROM service_record WHERE record_id = ?",
                    [serviceId]
                );

                if (serviceResult.length === 0) {
                    throw new Error("Service record not found");
                }

                // 2. Get the part being deleted to know the quantity
                const [partResult] = await db.promise().execute(
                    `SELECT * FROM service_parts_used 
                     WHERE service_id = ? AND stock_id = ? AND item_id = ?`,
                    [serviceId, stockId, itemId]
                );

                if (partResult.length === 0) {
                    throw new Error("Service part not found");
                }

                const { quantity_used } = partResult[0];

                // 3. Delete the service_parts_used record
                await db.promise().execute(
                    `DELETE FROM service_parts_used 
                     WHERE service_id = ? AND stock_id = ? AND item_id = ?`,
                    [serviceId, stockId, itemId]
                );

                // 4. Delete the corresponding inventory_release records
                await db.promise().execute(
                    `DELETE FROM inventory_release 
                     WHERE service_id = ? AND stock_id = ? AND item_id = ?`,
                    [serviceId, stockId, itemId]
                );

                // 5. Restore the quantity to inventory_stock
                await db.promise().execute(
                    `UPDATE inventory_stock 
                     SET available_qty = available_qty + ? 
                     WHERE stock_id = ?`,
                    [quantity_used, stockId]
                );

                // 6. Update the invoice
                const [partsResult] = await db.promise().execute(
                    `SELECT 
                        spu.stock_id, spu.quantity_used,
                        ist.selling_price
                     FROM service_parts_used spu
                     JOIN inventory_stock ist ON spu.stock_id = ist.stock_id
                     WHERE spu.service_id = ?`,
                    [serviceId]
                );

                // Calculate new parts total
                let partsTotalPrice = 0;
                for (const part of partsResult) {
                    partsTotalPrice += part.quantity_used * part.selling_price;
                }

                // Get the invoice
                const [invoiceResult] = await db.promise().execute(
                    "SELECT * FROM invoice WHERE service_id = ?",
                    [serviceId]
                );

                if (invoiceResult.length > 0) {
                    const invoice = invoiceResult[0];
                    const serviceCharge = parseFloat(invoice.service_charge) || 0;
                    const totalPrice = serviceCharge + partsTotalPrice;

                    // Update the invoice
                    await db.promise().execute(
                        `UPDATE invoice 
                         SET parts_total_price = ?, total_price = ?
                         WHERE invoice_id = ?`,
                        [partsTotalPrice, totalPrice, invoice.invoice_id]
                    );
                }

                // Commit transaction
                await db.promise().commit();
                
                res.status(200).json({
                    message: "✅ Part removed successfully",
                    parts_total_price: partsTotalPrice
                });
            } catch (error) {
                // Rollback transaction on error
                await db.promise().rollback();
                console.error("Delete Part Error:", error);
                res.status(500).json({ message: error.message || "Server Error" });
            }
        });
    } catch (error) {
        console.error("Delete Part Error:", error);
        res.status(500).json({ message: "Server Error", error: error.message });
    }
};

// Generate or update invoice for a service record
exports.generateServiceInvoice = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: "Unauthorized: User not found in request" });
        }

        const { serviceId } = req.params;
        const { service_charge } = req.body;

        if (service_charge === undefined) {
            return res.status(400).json({ message: "Service charge is required" });
        }

        const db = req.db;

        // Start a transaction
        db.beginTransaction(async (err) => {
            if (err) return res.status(500).json({ message: "Server Error", error: err });

            try {
                // Check if service record exists
                const [serviceResult] = await db.promise().execute(
                    "SELECT * FROM service_record WHERE record_id = ?",
                    [serviceId]
                );

                if (serviceResult.length === 0) {
                    throw new Error("Service record not found");
                }

                // Calculate parts total price
                const [partsResult] = await db.promise().execute(
                    `SELECT 
                        spu.stock_id, spu.quantity_used,
                        ist.selling_price
                     FROM service_parts_used spu
                     JOIN inventory_stock ist ON spu.stock_id = ist.stock_id
                     WHERE spu.service_id = ?`,
                    [serviceId]
                );

                let partsTotalPrice = 0;
                for (const part of partsResult) {
                    partsTotalPrice += part.quantity_used * part.selling_price;
                }

                // Calculate total price
                const parsedServiceCharge = parseFloat(service_charge) || 0;
                const totalPrice = parsedServiceCharge + partsTotalPrice;

                // Check if invoice already exists
                const [invoiceCheck] = await db.promise().execute(
                    "SELECT * FROM invoice WHERE service_id = ?",
                    [serviceId]
                );

                let invoiceId;
                if (invoiceCheck.length > 0) {
                    // Update existing invoice
                    invoiceId = invoiceCheck[0].invoice_id;
                    await db.promise().execute(
                        `UPDATE invoice 
                         SET service_charge = ?, parts_total_price = ?, total_price = ?
                         WHERE invoice_id = ?`,
                        [parsedServiceCharge, partsTotalPrice, totalPrice, invoiceId]
                    );
                } else {
                    // Generate invoice ID (format: INV + service_id padded to 6 digits)
                    invoiceId = `INV${String(serviceId).padStart(6, '0')}`;

                    // Create new invoice
                    await db.promise().execute(
                        `INSERT INTO invoice (
                            invoice_id, user_id, service_id, description,
                            service_charge, parts_total_price, total_price, created_date
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, CURDATE())`,
                        [
                            invoiceId, 
                            req.user.user_id, 
                            serviceId, 
                            serviceResult[0].service_description, 
                            parsedServiceCharge, 
                            partsTotalPrice, 
                            totalPrice
                        ]
                    );
                }

                // Get the updated invoice details with parts used
                const [fullInvoice] = await db.promise().execute(
                    `SELECT 
                        i.*, sr.vehicle_number, sr.service_description, sr.date_ as service_date,
                        sr.millage, sr.next_service_date,
                        vp.make, vp.model, vp.owner_ as owner
                     FROM invoice i
                     JOIN service_record sr ON i.service_id = sr.record_id
                     JOIN vehicle_profile vp ON sr.vehicle_number = vp.vehicle_number
                     WHERE i.invoice_id = ?`,
                    [invoiceId]
                );

                const [partsUsed] = await db.promise().execute(
                    `SELECT 
                        spu.stock_id, spu.quantity_used, spu.item_id,
                        ii.item_name, ii.brand, ii.category, ii.unit,
                        ist.buying_price, ist.selling_price
                     FROM service_parts_used spu
                     JOIN inventory_item ii ON spu.item_id = ii.item_id
                     JOIN inventory_stock ist ON spu.stock_id = ist.stock_id
                     WHERE spu.service_id = ?`,
                    [serviceId]
                );

                // Commit transaction
                await db.promise().commit();

                // Combine data for response
                const invoiceData = fullInvoice[0];
                invoiceData.parts_used = partsUsed;
                
                res.status(200).json({
                    message: "✅ Invoice generated successfully",
                    invoice: invoiceData
                });
            } catch (error) {
                // Rollback transaction on error
                await db.promise().rollback();
                console.error("Generate Invoice Error:", error);
                res.status(500).json({ message: error.message || "Server Error" });
            }
        });
    } catch (error) {
        console.error("Generate Invoice Error:", error);
        res.status(500).json({ message: "Server Error", error: error.message });
    }
};

// Generate service reports by vehicle type (make/model)
exports.getVehicleTypeServiceReport = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: "Unauthorized: User not found in request" });
        }

        const { make, model } = req.query;
        
        if (!make && !model) {
            return res.status(400).json({ message: "At least one search parameter (make or model) is required" });
        }

        const db = req.db;
        
        // Build the WHERE clause based on provided parameters
        let whereClause = "";
        const params = [];
        
        if (make && model) {
            whereClause = "WHERE vp.make LIKE ? AND vp.model LIKE ?";
            params.push(`%${make}%`, `%${model}%`);
        } else if (make) {
            whereClause = "WHERE vp.make LIKE ?";
            params.push(`%${make}%`);
        } else if (model) {
            whereClause = "WHERE vp.model LIKE ?";
            params.push(`%${model}%`);
        }
        
        // First get matching vehicles
        const [vehicles] = await db.promise().execute(
            `SELECT * FROM vehicle_profile vp ${whereClause} ORDER BY vp.make, vp.model`,
            params
        );
        
        if (vehicles.length === 0) {
            return res.status(404).json({ message: "No vehicles found matching the criteria" });
        }
        
        // For each vehicle, get service records with parts used
        const vehicleReports = [];
        
        for (const vehicle of vehicles) {
            // Get all service records for this vehicle
            const [serviceRecords] = await db.promise().execute(
                `SELECT 
                    sr.record_id, sr.service_description, sr.date_, sr.next_service_date, sr.millage,
                    (SELECT invoice_id FROM invoice WHERE service_id = sr.record_id) as invoice_id,
                    (SELECT service_charge FROM invoice WHERE service_id = sr.record_id) as service_charge,
                    (SELECT parts_total_price FROM invoice WHERE service_id = sr.record_id) as parts_cost,
                    (SELECT total_price FROM invoice WHERE service_id = sr.record_id) as total_cost
                 FROM service_record sr
                 WHERE sr.vehicle_number = ?
                 ORDER BY sr.date_ DESC`,
                [vehicle.vehicle_number]
            );
            
            // For each service record, get parts used
            for (let service of serviceRecords) {
                const [partsUsed] = await db.promise().execute(
                    `SELECT 
                        spu.item_id, spu.quantity_used, spu.stock_id,
                        ii.item_name, ii.brand, ii.category,
                        ist.selling_price,
                        (spu.quantity_used * ist.selling_price) as part_total_cost
                     FROM service_parts_used spu
                     JOIN inventory_item ii ON spu.item_id = ii.item_id
                     JOIN inventory_stock ist ON spu.stock_id = ist.stock_id
                     WHERE spu.service_id = ?`,
                    [service.record_id]
                );
                
                service.parts_used = partsUsed;
            }
            
            vehicleReports.push({
                vehicle_details: vehicle,
                service_records: serviceRecords
            });
        }
        
        // Calculate summary statistics
        const totalVehicles = vehicleReports.length;
        const totalServices = vehicleReports.reduce((sum, vehicle) => 
            sum + vehicle.service_records.length, 0);
        const totalServiceCost = vehicleReports.reduce((sum, vehicle) => 
            sum + vehicle.service_records.reduce((sSum, service) => 
                sSum + (parseFloat(service.total_cost) || 0), 0), 0);
            
        // Most common service by counting service descriptions
        const serviceDescriptionCounter = {};
        vehicleReports.forEach(vehicle => {
            vehicle.service_records.forEach(service => {
                const desc = service.service_description;
                serviceDescriptionCounter[desc] = (serviceDescriptionCounter[desc] || 0) + 1;
            });
        });
        
        let mostCommonService = { description: 'None', count: 0 };
        for (const [desc, count] of Object.entries(serviceDescriptionCounter)) {
            if (count > mostCommonService.count) {
                mostCommonService = { description: desc, count };
            }
        }
        
        // Most used part
        const partCounter = {};
        vehicleReports.forEach(vehicle => {
            vehicle.service_records.forEach(service => {
                (service.parts_used || []).forEach(part => {
                    const partName = part.item_name;
                    partCounter[partName] = (partCounter[partName] || 0) + part.quantity_used;
                });
            });
        });
        
        let mostUsedPart = { name: 'None', count: 0 };
        for (const [name, count] of Object.entries(partCounter)) {
            if (count > mostUsedPart.count) {
                mostUsedPart = { name, count };
            }
        }
        
        res.status(200).json({
            search_criteria: { make, model },
            summary: {
                total_vehicles: totalVehicles,
                total_services: totalServices,
                total_service_cost: totalServiceCost,
                most_common_service: mostCommonService,
                most_used_part: mostUsedPart
            },
            reports: vehicleReports
        });
    } catch (error) {
        console.error("Vehicle Type Service Report Error:", error);
        res.status(500).json({ message: "Server Error", error: error.message });
    }
}; 