require("dotenv").config();

// Get all invoices
exports.getAllInvoices = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: "Unauthorized: User not found in request" });
        }

        const db = req.db;
        db.execute(
            `SELECT 
                i.*, sr.vehicle_number, sr.service_description, sr.date_ as service_date,
                vp.make, vp.model, vp.owner_ as owner
             FROM invoice i
             JOIN service_record sr ON i.service_id = sr.record_id
             JOIN vehicle_profile vp ON sr.vehicle_number = vp.vehicle_number
             ORDER BY i.created_date DESC`,
            (err, results) => {
                if (err) return res.status(500).json({ message: "Server Error", error: err });
                res.status(200).json(results);
            }
        );
    } catch (error) {
        res.status(500).json({ message: "Server Error", error });
    }
};

// Get invoice by ID
exports.getInvoiceById = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: "Unauthorized: User not found in request" });
        }

        const { invoiceId } = req.params;
        const db = req.db;

        // Get invoice details
        db.execute(
            `SELECT 
                i.*, sr.vehicle_number, sr.service_description, sr.date_ as service_date,
                sr.millage, sr.next_service_date,
                vp.make, vp.model, vp.owner_ as owner
             FROM invoice i
             JOIN service_record sr ON i.service_id = sr.record_id
             JOIN vehicle_profile vp ON sr.vehicle_number = vp.vehicle_number
             WHERE i.invoice_id = ?`,
            [invoiceId],
            async (err, results) => {
                if (err) return res.status(500).json({ message: "Server Error", error: err });

                if (results.length === 0) {
                    return res.status(404).json({ message: "❌ Invoice not found" });
                }

                const invoice = results[0];

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
                        [invoice.service_id]
                    );

                    // Combine all data
                    invoice.parts_used = partsResult;

                    res.status(200).json(invoice);
                } catch (detailErr) {
                    console.error("Error fetching invoice details:", detailErr);
                    res.status(200).json(invoice); // Return basic info if details fetch fails
                }
            }
        );
    } catch (error) {
        res.status(500).json({ message: "Server Error", error });
    }
};

// Generate or update invoice
exports.generateInvoice = async (req, res) => {
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
                const totalPrice = parseFloat(service_charge) + partsTotalPrice;

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
                        [parseFloat(service_charge), partsTotalPrice, totalPrice, invoiceId]
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
                            parseFloat(service_charge), 
                            partsTotalPrice, 
                            totalPrice
                        ]
                    );
                }

                // Commit transaction
                await db.promise().commit();
                
                // Get the full invoice details
                const [newInvoiceResult] = await db.promise().execute(
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

                // Get parts used in this service
                const [newPartsResult] = await db.promise().execute(
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

                const fullInvoice = newInvoiceResult[0];
                fullInvoice.parts_used = newPartsResult;
                
                res.status(200).json({
                    message: "✅ Invoice generated successfully",
                    invoice: fullInvoice
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