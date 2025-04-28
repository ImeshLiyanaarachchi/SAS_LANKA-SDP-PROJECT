require("dotenv").config();

// Create a new custom service record
exports.createCustomServiceRecord = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: "Unauthorized: User not found in request" });
        }

        const {
            vehicle_number,
            service_date,
            place_of_service,
            description,
            parts
        } = req.body;

        // Validate required fields
        if (!service_date) {
            return res.status(400).json({ message: "Service date is required" });
        }
        
        if (!vehicle_number) {
            return res.status(400).json({ message: "Vehicle number is required" });
        }

        const db = req.db;
        
        // Verify vehicle exists and belongs to user
        const [vehicles] = await db.promise().execute(
            `SELECT * FROM vehicle_profile
             WHERE vehicle_number = ? AND user_id = ?`,
            [vehicle_number, req.user.user_id]
        );

        if (vehicles.length === 0) {
            return res.status(404).json({ message: "❌ Vehicle not found or you don't have permission to add records for it" });
        }
        
        // Start a transaction
        db.beginTransaction(async (err) => {
            if (err) return res.status(500).json({ message: "Server Error", error: err });

            try {
                // 1. Create custom service record
                const [serviceResult] = await db.promise().execute(
                    `INSERT INTO custom_service_record (
                        vehicle_number, service_date, place_of_service, description
                    ) VALUES (?, ?, ?, ?)`,
                    [vehicle_number, service_date, place_of_service || null, description || null]
                );

                const customServiceId = serviceResult.insertId;
                
                // 2. Process parts (if any)
                if (parts && Array.isArray(parts) && parts.length > 0) {
                    for (const part of parts) {
                        const { part_name, brand, quantity, unit_price } = part;
                        
                        if (!part_name) {
                            continue; // Skip invalid entries
                        }

                        // Create custom service part record
                        await db.promise().execute(
                            `INSERT INTO custom_service_part (
                                custom_service_id, part_name, brand, quantity, unit_price
                            ) VALUES (?, ?, ?, ?, ?)`,
                            [customServiceId, part_name, brand || null, quantity || 1, unit_price || 0]
                        );
                    }
                }

                // Commit transaction
                await db.promise().commit();
                
                res.status(201).json({
                    message: "✅ Custom service record created successfully",
                    custom_service_id: customServiceId
                });
            } catch (error) {
                // Rollback transaction on error
                await db.promise().rollback();
                throw error;
            }
        });
    } catch (error) {
        console.error("Create Custom Service Record Error:", error);
        res.status(500).json({ message: "Server Error", error: error.message });
    }
};

// Get all custom service records for a user
exports.getUserCustomServiceRecords = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: "Unauthorized: User not found in request" });
        }

        const db = req.db;
        const userId = req.user.user_id;

        // Get all vehicles that belong to this user
        const [userVehicles] = await db.promise().execute(
            `SELECT vehicle_number FROM vehicle_profile
             WHERE user_id = ?`,
            [userId]
        );

        if (userVehicles.length === 0) {
            return res.status(200).json([]);  // User has no vehicles
        }

        // Create a list of vehicle numbers for the query
        const vehicleNumbers = userVehicles.map(v => v.vehicle_number);
        const placeholders = vehicleNumbers.map(() => '?').join(',');

        // Get all custom service records for vehicles owned by this user
        const [records] = await db.promise().execute(
            `SELECT * FROM custom_service_record
             WHERE vehicle_number IN (${placeholders})
             ORDER BY service_date DESC`,
            vehicleNumbers
        );

        // For each record, get the parts used
        for (let record of records) {
            const [parts] = await db.promise().execute(
                `SELECT * FROM custom_service_part
                 WHERE custom_service_id = ?`,
                [record.custom_service_id]
            );
            
            record.parts = parts;
            
            // Calculate total cost
            record.total_cost = parts.reduce((sum, part) => {
                return sum + (part.quantity * part.unit_price);
            }, 0);
        }

        res.status(200).json(records);
    } catch (error) {
        console.error("Get User Custom Service Records Error:", error);
        res.status(500).json({ message: "Server Error", error: error.message });
    }
};

// Get a specific custom service record
exports.getCustomServiceRecordById = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: "Unauthorized: User not found in request" });
        }

        const { recordId } = req.params;
        const db = req.db;
        const userId = req.user.user_id;

        // Get the custom service record with a join to verify ownership
        const [records] = await db.promise().execute(
            `SELECT csr.*
             FROM custom_service_record csr
             JOIN vehicle_profile vp ON csr.vehicle_number = vp.vehicle_number
             WHERE csr.custom_service_id = ? AND vp.user_id = ?`,
            [recordId, userId]
        );

        if (records.length === 0) {
            return res.status(404).json({ message: "❌ Custom service record not found or you don't have permission to view it" });
        }

        const record = records[0];

        // Get the parts used
        const [parts] = await db.promise().execute(
            `SELECT * FROM custom_service_part
             WHERE custom_service_id = ?`,
            [recordId]
        );
        
        record.parts = parts;
        
        // Calculate total cost
        record.total_cost = parts.reduce((sum, part) => {
            return sum + (part.quantity * part.unit_price);
        }, 0);

        res.status(200).json(record);
    } catch (error) {
        console.error("Get Custom Service Record Error:", error);
        res.status(500).json({ message: "Server Error", error: error.message });
    }
};

// Update a custom service record
exports.updateCustomServiceRecord = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: "Unauthorized: User not found in request" });
        }

        const { recordId } = req.params;
        const {
            service_date,
            place_of_service,
            description
        } = req.body;

        const db = req.db;
        const userId = req.user.user_id;

        // Verify record exists and belongs to user (through vehicle ownership)
        const [records] = await db.promise().execute(
            `SELECT csr.*
             FROM custom_service_record csr
             JOIN vehicle_profile vp ON csr.vehicle_number = vp.vehicle_number
             WHERE csr.custom_service_id = ? AND vp.user_id = ?`,
            [recordId, userId]
        );

        if (records.length === 0) {
            return res.status(404).json({ message: "❌ Custom service record not found or you don't have permission to update it" });
        }

        // Update the record
        await db.promise().execute(
            `UPDATE custom_service_record
             SET service_date = ?, place_of_service = ?, description = ?
             WHERE custom_service_id = ?`,
            [service_date, place_of_service || null, description || null, recordId]
        );

        res.status(200).json({ message: "✅ Custom service record updated successfully" });
    } catch (error) {
        console.error("Update Custom Service Record Error:", error);
        res.status(500).json({ message: "Server Error", error: error.message });
    }
};

// Delete a custom service record
exports.deleteCustomServiceRecord = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: "Unauthorized: User not found in request" });
        }

        const { recordId } = req.params;
        const db = req.db;
        const userId = req.user.user_id;

        // Verify record exists and belongs to user (through vehicle ownership)
        const [records] = await db.promise().execute(
            `SELECT csr.*
             FROM custom_service_record csr
             JOIN vehicle_profile vp ON csr.vehicle_number = vp.vehicle_number
             WHERE csr.custom_service_id = ? AND vp.user_id = ?`,
            [recordId, userId]
        );

        if (records.length === 0) {
            return res.status(404).json({ message: "❌ Custom service record not found or you don't have permission to delete it" });
        }

        // Delete the record (cascade will delete related parts)
        await db.promise().execute(
            `DELETE FROM custom_service_record
             WHERE custom_service_id = ?`,
            [recordId]
        );

        res.status(200).json({ message: "✅ Custom service record deleted successfully" });
    } catch (error) {
        console.error("Delete Custom Service Record Error:", error);
        res.status(500).json({ message: "Server Error", error: error.message });
    }
};

// Add a part to a custom service record
exports.addCustomServicePart = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: "Unauthorized: User not found in request" });
        }

        const { recordId } = req.params;
        const { part_name, brand, quantity, unit_price } = req.body;

        if (!part_name) {
            return res.status(400).json({ message: "Part name is required" });
        }

        const db = req.db;
        const userId = req.user.user_id;

        // Verify record exists and belongs to user (through vehicle ownership)
        const [records] = await db.promise().execute(
            `SELECT csr.*
             FROM custom_service_record csr
             JOIN vehicle_profile vp ON csr.vehicle_number = vp.vehicle_number
             WHERE csr.custom_service_id = ? AND vp.user_id = ?`,
            [recordId, userId]
        );

        if (records.length === 0) {
            return res.status(404).json({ message: "❌ Custom service record not found or you don't have permission to update it" });
        }

        // Add the part
        const [result] = await db.promise().execute(
            `INSERT INTO custom_service_part (custom_service_id, part_name, brand, quantity, unit_price)
             VALUES (?, ?, ?, ?, ?)`,
            [recordId, part_name, brand || null, quantity || 1, unit_price || 0]
        );

        res.status(201).json({
            message: "✅ Part added successfully",
            part_id: result.insertId
        });
    } catch (error) {
        console.error("Add Custom Service Part Error:", error);
        res.status(500).json({ message: "Server Error", error: error.message });
    }
};

// Update a part in a custom service record
exports.updateCustomServicePart = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: "Unauthorized: User not found in request" });
        }

        const { recordId, partId } = req.params;
        const { part_name, brand, quantity, unit_price } = req.body;

        if (!part_name) {
            return res.status(400).json({ message: "Part name is required" });
        }

        const db = req.db;
        const userId = req.user.user_id;

        // Verify record exists and belongs to user (through vehicle ownership)
        const [records] = await db.promise().execute(
            `SELECT csr.*
             FROM custom_service_record csr
             JOIN vehicle_profile vp ON csr.vehicle_number = vp.vehicle_number
             JOIN custom_service_part csp ON csr.custom_service_id = csp.custom_service_id
             WHERE csr.custom_service_id = ? AND vp.user_id = ? AND csp.part_id = ?`,
            [recordId, userId, partId]
        );

        if (records.length === 0) {
            return res.status(404).json({ message: "❌ Record or part not found or you don't have permission to update it" });
        }

        // Update the part
        await db.promise().execute(
            `UPDATE custom_service_part
             SET part_name = ?, brand = ?, quantity = ?, unit_price = ?
             WHERE part_id = ? AND custom_service_id = ?`,
            [part_name, brand || null, quantity || 1, unit_price || 0, partId, recordId]
        );

        res.status(200).json({ message: "✅ Part updated successfully" });
    } catch (error) {
        console.error("Update Custom Service Part Error:", error);
        res.status(500).json({ message: "Server Error", error: error.message });
    }
};

// Delete a part from a custom service record
exports.deleteCustomServicePart = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: "Unauthorized: User not found in request" });
        }

        const { recordId, partId } = req.params;
        const db = req.db;
        const userId = req.user.user_id;

        // Verify record exists and belongs to user (through vehicle ownership)
        const [records] = await db.promise().execute(
            `SELECT csr.*
             FROM custom_service_record csr
             JOIN vehicle_profile vp ON csr.vehicle_number = vp.vehicle_number
             JOIN custom_service_part csp ON csr.custom_service_id = csp.custom_service_id
             WHERE csr.custom_service_id = ? AND vp.user_id = ? AND csp.part_id = ?`,
            [recordId, userId, partId]
        );

        if (records.length === 0) {
            return res.status(404).json({ message: "❌ Record or part not found or you don't have permission to delete it" });
        }

        // Delete the part
        await db.promise().execute(
            `DELETE FROM custom_service_part
             WHERE part_id = ? AND custom_service_id = ?`,
            [partId, recordId]
        );

        res.status(200).json({ message: "✅ Part deleted successfully" });
    } catch (error) {
        console.error("Delete Custom Service Part Error:", error);
        res.status(500).json({ message: "Server Error", error: error.message });
    }
};

// Get custom service records for a specific vehicle
exports.getVehicleCustomServiceRecords = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: "Unauthorized: User not found in request" });
        }

        const { vehicleNumber } = req.params;
        const db = req.db;
        const userId = req.user.user_id;

        // First verify the vehicle belongs to the user
        const [vehicles] = await db.promise().execute(
            `SELECT * FROM vehicle_profile
             WHERE vehicle_number = ? AND user_id = ?`,
            [vehicleNumber, userId]
        );

        if (vehicles.length === 0) {
            return res.status(404).json({ message: "❌ Vehicle not found or you don't have permission to view its records" });
        }

        // Get custom service records for this vehicle
        const [records] = await db.promise().execute(
            `SELECT * FROM custom_service_record
             WHERE vehicle_number = ?
             ORDER BY service_date DESC`,
            [vehicleNumber]
        );

        // For each record, get the parts used
        for (let record of records) {
            const [parts] = await db.promise().execute(
                `SELECT * FROM custom_service_part
                 WHERE custom_service_id = ?`,
                [record.custom_service_id]
            );
            
            record.parts = parts;
            
            // Calculate total cost
            record.total_cost = parts.reduce((sum, part) => {
                return sum + (part.quantity * part.unit_price);
            }, 0);
        }

        res.status(200).json(records);
    } catch (error) {
        console.error("Get Vehicle Custom Service Records Error:", error);
        res.status(500).json({ message: "Server Error", error: error.message });
    }
}; 