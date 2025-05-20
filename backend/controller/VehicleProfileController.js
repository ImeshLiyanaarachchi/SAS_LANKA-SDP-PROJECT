require("dotenv").config();

// Create a new vehicle profile
exports.createVehicleProfile = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: "Unauthorized: User not found in request" });
        }

        const {
            vehicle_number,
            user_id,
            make,
            model,
            year_of_manuf,
            engine_details,
            transmission_details,
            vehicle_colour,
            vehicle_features,
            condition_,
            owner_
        } = req.body;

        // Validate required fields
        if (!vehicle_number || !make || !model) {
            return res.status(400).json({ 
                message: "Vehicle number, make, and model are required fields" 
            });
        }

        const db = req.db;

        // Check if vehicle_number already exists
        db.execute(
            "SELECT * FROM vehicle_profile WHERE vehicle_number = ?",
            [vehicle_number],
            (err, results) => {
                if (err) return res.status(500).json({ message: "Server Error", error: err });
                
                if (results.length > 0) {
                    return res.status(400).json({ 
                        message: "❌ Vehicle with this number already exists" 
                    });
                }

                // Insert the new vehicle profile
                db.execute(
                    `INSERT INTO vehicle_profile (
                        vehicle_number, user_id, make, model, year_of_manuf,
                        engine_details, transmission_details, vehicle_colour,
                        vehicle_features, condition_, owner_
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                    [
                        vehicle_number,
                        user_id || req.user.user_id,
                        make,
                        model,
                        year_of_manuf || null,
                        engine_details || null,
                        transmission_details || null,
                        vehicle_colour || null,
                        vehicle_features || null,
                        condition_ || null,
                        owner_ || null
                    ],
                    (err, result) => {
                        if (err) return res.status(500).json({ message: "Server Error", error: err });
                        
                        res.status(201).json({
                            message: "✅ Vehicle profile created successfully",
                            vehicle_number: vehicle_number
                        });
                    }
                );
            }
        );
    } catch (error) {
        console.error("Create Vehicle Profile Error:", error);
        res.status(500).json({ message: "Server Error", error: error.message });
    }
};

// Get all vehicle profiles
exports.getAllVehicleProfiles = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: "Unauthorized: User not found in request" });
        }

        const db = req.db;
        
        // If user is admin, show all vehicles; otherwise, show only user's vehicles
        const query = req.user.role === 'admin' || req.user.role === 'technician'
            ? "SELECT * FROM vehicle_profile ORDER BY make, model"
            : "SELECT * FROM vehicle_profile WHERE user_id = ? ORDER BY make, model";
        
        const params = req.user.role === 'admin' ? [] : [req.user.user_id];
        
        db.execute(query, params, (err, results) => {
            if (err) return res.status(500).json({ message: "Server Error", error: err });
            
            res.status(200).json(results);
        });
    } catch (error) {
        console.error("Get Vehicle Profiles Error:", error);
        res.status(500).json({ message: "Server Error", error: error.message });
    }
};

// Get vehicle profile by vehicle number
exports.getVehicleProfileByNumber = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: "Unauthorized: User not found in request" });
        }

        const { vehicleNumber } = req.params;
        const db = req.db;
        
        // If user is admin, allow access to any vehicle; otherwise, restrict to user's vehicles
        const query = req.user.role === 'admin' || req.user.role === 'technician'
            ? "SELECT * FROM vehicle_profile WHERE vehicle_number = ?"
            : "SELECT * FROM vehicle_profile WHERE vehicle_number = ? AND user_id = ?";
        
        const params = req.user.role === 'admin' || req.user.role === 'technician'
            ? [vehicleNumber] 
            : [vehicleNumber, req.user.user_id];
        
        db.execute(query, params, async (err, results) => {
            if (err) return res.status(500).json({ message: "Server Error", error: err });
            
            if (results.length === 0) {
                return res.status(404).json({ 
                    message: "❌ Vehicle profile not found" 
                });
            }
            
            const vehicleProfile = results[0];
            
            // Get service history for this vehicle
            try {
                const [serviceHistory] = await db.promise().execute(
                    `SELECT 
                        sr.record_id, sr.service_description, sr.date_, sr.next_service_date, sr.millage,
                        (SELECT invoice_id FROM invoice WHERE service_id = sr.record_id) as invoice_id
                     FROM service_record sr
                     WHERE sr.vehicle_number = ?
                     ORDER BY sr.date_ DESC`,
                    [vehicleNumber]
                );
                
                vehicleProfile.service_history = serviceHistory;
                
                res.status(200).json(vehicleProfile);
            } catch (historyErr) {
                console.error("Error fetching service history:", historyErr);
                // Still return vehicle profile even if service history fetch fails
                res.status(200).json(vehicleProfile);
            }
        });
    } catch (error) {
        console.error("Get Vehicle Profile Error:", error);
        res.status(500).json({ message: "Server Error", error: error.message });
    }
};

// Get vehicle profiles by user ID
exports.getVehicleProfilesByUser = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: "Unauthorized: User not found in request" });
        }

        const { userId } = req.params;
        const db = req.db;
        
        // If user is admin or requesting their own vehicles, proceed
        if (req.user.role !== 'admin' && req.user.role !== 'technician' && parseInt(userId) !== req.user.user_id) {
            return res.status(403).json({ 
                message: "Forbidden: You can only view your own vehicles" 
            });
        }
        
        db.execute(
            "SELECT * FROM vehicle_profile WHERE user_id = ? ORDER BY make, model",
            [userId],
            (err, results) => {
                if (err) return res.status(500).json({ message: "Server Error", error: err });
                
                res.status(200).json(results);
            }
        );
    } catch (error) {
        console.error("Get User Vehicles Error:", error);
        res.status(500).json({ message: "Server Error", error: error.message });
    }
};

// Update vehicle profile
exports.updateVehicleProfile = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: "Unauthorized: User not found in request" });
        }

        const { vehicleNumber } = req.params;
        const {
            make,
            model,
            year_of_manuf,
            engine_details,
            transmission_details,
            vehicle_colour,
            vehicle_features,
            condition_,
            owner_,
            user_id
        } = req.body;

        const db = req.db;
        
        // Check if vehicle exists and user has permission to update it
        const query = req.user.role === 'admin' || req.user.role === 'technician'
            ? "SELECT * FROM vehicle_profile WHERE vehicle_number = ?"
            : "SELECT * FROM vehicle_profile WHERE vehicle_number = ? AND user_id = ?";
        
        const params = req.user.role === 'admin' || req.user.role === 'technician'
            ? [vehicleNumber] 
            : [vehicleNumber, req.user.user_id];
        
        db.execute(query, params, (err, results) => {
            if (err) return res.status(500).json({ message: "Server Error", error: err });
            
            if (results.length === 0) {
                return res.status(404).json({ 
                    message: "❌ Vehicle profile not found or you don't have permission to update it" 
                });
            }
            
            // Only admin can change user_id
            const newUserId = req.user.role === 'admin' && user_id 
                ? user_id 
                : results[0].user_id;
            
            // Update the vehicle profile
            db.execute(
                `UPDATE vehicle_profile SET
                    make = ?,
                    model = ?,
                    year_of_manuf = ?,
                    engine_details = ?,
                    transmission_details = ?,
                    vehicle_colour = ?,
                    vehicle_features = ?,
                    condition_ = ?,
                    owner_ = ?,
                    user_id = ?
                 WHERE vehicle_number = ?`,
                [
                    make || results[0].make,
                    model || results[0].model,
                    year_of_manuf || results[0].year_of_manuf,
                    engine_details || results[0].engine_details,
                    transmission_details || results[0].transmission_details,
                    vehicle_colour || results[0].vehicle_colour,
                    vehicle_features || results[0].vehicle_features,
                    condition_ || results[0].condition_,
                    owner_ || results[0].owner_,
                    newUserId,
                    vehicleNumber
                ],
                (err, result) => {
                    if (err) return res.status(500).json({ message: "Server Error", error: err });
                    
                    res.status(200).json({
                        message: "✅ Vehicle profile updated successfully",
                        vehicle_number: vehicleNumber
                    });
                }
            );
        });
    } catch (error) {
        console.error("Update Vehicle Profile Error:", error);
        res.status(500).json({ message: "Server Error", error: error.message });
    }
};

// Delete vehicle profile
exports.deleteVehicleProfile = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: "Unauthorized: User not found in request" });
        }

        const { vehicleNumber } = req.params;
        const db = req.db;
        
        // Check if vehicle exists and user has permission to delete it
        const query = req.user.role === 'admin' || req.user.role === 'technician'
            ? "SELECT * FROM vehicle_profile WHERE vehicle_number = ?"
            : "SELECT * FROM vehicle_profile WHERE vehicle_number = ? AND user_id = ?";
        
        const params = req.user.role === 'admin' || req.user.role === 'technician'
            ? [vehicleNumber] 
            : [vehicleNumber, req.user.user_id];
        
        db.execute(query, params, async (err, results) => {
            if (err) return res.status(500).json({ message: "Server Error", error: err });
            
            if (results.length === 0) {
                return res.status(404).json({ 
                    message: "❌ Vehicle profile not found or you don't have permission to delete it" 
                });
            }
            
            // Check if vehicle has service records
            try {
                const [serviceRecords] = await db.promise().execute(
                    "SELECT COUNT(*) as count FROM service_record WHERE vehicle_number = ?",
                    [vehicleNumber]
                );
                
                if (serviceRecords[0].count > 0) {
                    return res.status(400).json({ 
                        message: "❌ Cannot delete vehicle: It has service records associated with it" 
                    });
                }
                
                // Delete the vehicle profile
                db.execute(
                    "DELETE FROM vehicle_profile WHERE vehicle_number = ?",
                    [vehicleNumber],
                    (err, result) => {
                        if (err) return res.status(500).json({ message: "Server Error", error: err });
                        
                        res.status(200).json({
                            message: "✅ Vehicle profile deleted successfully"
                        });
                    }
                );
            } catch (checkErr) {
                console.error("Error checking service records:", checkErr);
                return res.status(500).json({ message: "Server Error", error: checkErr });
            }
        });
    } catch (error) {
        console.error("Delete Vehicle Profile Error:", error);
        res.status(500).json({ message: "Server Error", error: error.message });
    }
};

// Get detailed vehicle profiles with full service history
exports.getDetailedVehicleProfiles = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: "Unauthorized: User not found in request" });
        }

        const db = req.db;
        
        // If user is admin, show all vehicles; otherwise, show only user's vehicles
        const query = req.user.role === 'admin' || req.user.role === 'technician'
            ? "SELECT * FROM vehicle_profile ORDER BY make, model"
            : "SELECT * FROM vehicle_profile WHERE user_id = ? ORDER BY make, model";
        
        const params = req.user.role === 'admin' ? [] : [req.user.user_id];
        
        db.execute(query, params, async (err, results) => {
            if (err) return res.status(500).json({ message: "Server Error", error: err });
            
            // For each vehicle, fetch its complete service history
            const detailedVehicles = [];
            
            for (const vehicle of results) {
                try {
                    // Get service history for this vehicle
                    const [serviceHistory] = await db.promise().execute(
                        `SELECT 
                            sr.record_id, sr.service_description, sr.date_, sr.next_service_date, sr.millage,
                            (SELECT invoice_id FROM invoice WHERE service_id = sr.record_id) as invoice_id
                         FROM service_record sr
                         WHERE sr.vehicle_number = ?
                         ORDER BY sr.date_ DESC`,
                        [vehicle.vehicle_number]
                    );
                    
                    // Get parts used in each service
                    for (let service of serviceHistory) {
                        const [partsUsed] = await db.promise().execute(
                            `SELECT 
                                spu.item_id, ii.item_name, spu.quantity_used,
                                ist.selling_price, ii.brand, ii.category
                             FROM service_parts_used spu
                             JOIN inventory_item ii ON spu.item_id = ii.item_id
                             JOIN inventory_stock ist ON spu.stock_id = ist.stock_id
                             WHERE spu.service_id = ?`,
                            [service.record_id]
                        );
                        
                        service.parts_used = partsUsed;
                    }
                    
                    vehicle.service_history = serviceHistory;
                    detailedVehicles.push(vehicle);
                } catch (error) {
                    console.error(`Error fetching history for vehicle ${vehicle.vehicle_number}:`, error);
                    vehicle.service_history = [];
                    detailedVehicles.push(vehicle);
                }
            }
            
            res.status(200).json(detailedVehicles);
        });
    } catch (error) {
        console.error("Get Detailed Vehicle Profiles Error:", error);
        res.status(500).json({ message: "Server Error", error: error.message });
    }
};

// Get vehicles by type (make/model search)
exports.getVehiclesByType = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: "Unauthorized: User not found in request" });
        }

        const { searchTerm } = req.query;
        
        if (!searchTerm) {
            return res.status(400).json({ message: "Search term is required" });
        }

        const db = req.db;
        
        // Search query that looks for partial matches in make and model
        const query = req.user.role === 'admin' || req.user.role === 'technician'
            ? `SELECT * FROM vehicle_profile 
               WHERE make LIKE ? OR model LIKE ? 
               ORDER BY make, model`
            : `SELECT * FROM vehicle_profile 
               WHERE (make LIKE ? OR model LIKE ?) AND user_id = ? 
               ORDER BY make, model`;
        
        const searchPattern = `%${searchTerm}%`;
        const params = req.user.role === 'admin' || req.user.role === 'technician'
            ? [searchPattern, searchPattern]
            : [searchPattern, searchPattern, req.user.user_id];
        
        db.execute(query, params, async (err, results) => {
            if (err) return res.status(500).json({ message: "Server Error", error: err });
            
            // For each vehicle, fetch its complete service history
            const detailedVehicles = [];
            
            for (const vehicle of results) {
                try {
                    // Get service history for this vehicle
                    const [serviceHistory] = await db.promise().execute(
                        `SELECT 
                            sr.record_id, sr.service_description, sr.date_, sr.next_service_date, sr.millage,
                            (SELECT invoice_id FROM invoice WHERE service_id = sr.record_id) as invoice_id
                         FROM service_record sr
                         WHERE sr.vehicle_number = ?
                         ORDER BY sr.date_ DESC`,
                        [vehicle.vehicle_number]
                    );
                    
                    // Get parts used in each service
                    for (let service of serviceHistory) {
                        const [partsUsed] = await db.promise().execute(
                            `SELECT 
                                spu.item_id, ii.item_name, spu.quantity_used,
                                ist.selling_price, ii.brand, ii.category
                             FROM service_parts_used spu
                             JOIN inventory_item ii ON spu.item_id = ii.item_id
                             JOIN inventory_stock ist ON spu.stock_id = ist.stock_id
                             WHERE spu.service_id = ?`,
                            [service.record_id]
                        );
                        
                        service.parts_used = partsUsed;
                    }
                    
                    vehicle.service_history = serviceHistory;
                    detailedVehicles.push(vehicle);
                } catch (error) {
                    console.error(`Error fetching history for vehicle ${vehicle.vehicle_number}:`, error);
                    vehicle.service_history = [];
                    detailedVehicles.push(vehicle);
                }
            }
            
            res.status(200).json(detailedVehicles);
        });
    } catch (error) {
        console.error("Get Vehicles By Type Error:", error);
        res.status(500).json({ message: "Server Error", error: error.message });
    }
}; 