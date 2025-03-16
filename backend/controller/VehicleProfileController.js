require("dotenv").config();

// Create vehicle profile (Technician only)
exports.createVehicleProfile = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: "Unauthorized: User not found in request" });
        }

        // Check if user is a technician
        if (req.user.role !== 'technician') {
            return res.status(403).json({ message: "Forbidden: Only technicians can create vehicle profiles" });
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

        const db = req.db;

        // Check if vehicle number already exists
        db.execute("SELECT * FROM vehicle_profile WHERE vehicle_number = ?", [vehicle_number], (err, results) => {
            if (err) return res.status(500).json({ message: "Server Error", error: err });

            if (results.length > 0) {
                return res.status(400).json({ message: "🚨 Vehicle number already exists!" });
            }

            // Insert vehicle profile
            db.execute(
                `INSERT INTO vehicle_profile (
                    vehicle_number, user_id, make, model, 
                    year_of_manuf, engine_details, transmission_details, 
                    vehicle_colour, vehicle_features, condition_, owner_
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    vehicle_number, user_id, make, model,
                    year_of_manuf, engine_details, transmission_details,
                    vehicle_colour, vehicle_features, condition_, owner_
                ],
                (err, result) => {
                    if (err) return res.status(500).json({ message: "Server Error", error: err });
                    res.status(201).json({ 
                        message: "✅ Vehicle profile created successfully",
                        vehicle_number: vehicle_number
                    });
                }
            );
        });
    } catch (error) {
        console.error("Create Vehicle Profile Error:", error);
        res.status(500).json({ message: "Server Error", error });
    }
};

// Get all vehicle profiles (Admin only)
exports.getAllVehicleProfiles = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: "Unauthorized: User not found in request" });
        }

        // Check if user is admin
        if (req.user.role !== 'admin') {
            return res.status(403).json({ message: "Forbidden: Only admin can view all vehicle profiles" });
        }

        const db = req.db;
        db.execute(
            `SELECT vp.*, u.first_name, u.last_name, t.first_name as tech_first_name, t.last_name as tech_last_name
             FROM vehicle_profile vp
             JOIN user u ON vp.user_id = u.user_id
             LEFT JOIN user t ON vp.technitian_id = t.user_id
             ORDER BY vp.vehicle_number`,
            (err, results) => {
                if (err) return res.status(500).json({ message: "Server Error", error: err });
                res.status(200).json(results);
            }
        );
    } catch (error) {
        res.status(500).json({ message: "Server Error", error });
    }
};

// Get vehicle profile by number
exports.getVehicleProfileByNumber = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: "Unauthorized: User not found in request" });
        }

        const { vehicleNumber } = req.params;
        const db = req.db;

        db.execute(
            `SELECT vp.*, u.first_name, u.last_name
             FROM vehicle_profile vp
             JOIN user u ON vp.user_id = u.user_id
             WHERE vp.vehicle_number = ?`,
            [vehicleNumber],
            (err, results) => {
                if (err) return res.status(500).json({ message: "Server Error", error: err });

                if (results.length === 0) {
                    return res.status(404).json({ message: "❌ Vehicle profile not found" });
                }

                // Check if user is admin or the vehicle belongs to the user
                if (req.user.role !== 'admin' && results[0].user_id !== req.user.user_id) {
                    return res.status(403).json({ message: "Forbidden: You can only view your own vehicle profiles" });
                }

                res.status(200).json(results[0]);
            }
        );
    } catch (error) {
        res.status(500).json({ message: "Server Error", error });
    }
};

// Get vehicle profiles by user ID
exports.getVehicleProfilesByUserId = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: "Unauthorized: User not found in request" });
        }

        const { userId } = req.params;
        
        // Check if user is admin or requesting their own profiles
        if (req.user.role !== 'admin' && userId !== req.user.user_id) {
            return res.status(403).json({ message: "Forbidden: You can only view your own vehicle profiles" });
        }

        const db = req.db;
        db.execute(
            `SELECT vp.*, u.first_name, u.last_name
             FROM vehicle_profile vp
             JOIN user u ON vp.user_id = u.user_id
             WHERE vp.user_id = ?
             ORDER BY vp.vehicle_number`,
            [userId],
            (err, results) => {
                if (err) return res.status(500).json({ message: "Server Error", error: err });
                res.status(200).json(results);
            }
        );
    } catch (error) {
        res.status(500).json({ message: "Server Error", error });
    }
};

// Update vehicle profile (Customer can update their own profiles)
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
            owner_
        } = req.body;

        const db = req.db;

        // Check if vehicle profile exists
        db.execute("SELECT * FROM vehicle_profile WHERE vehicle_number = ?", [vehicleNumber], (err, results) => {
            if (err) return res.status(500).json({ message: "Server Error", error: err });

            if (results.length === 0) {
                return res.status(404).json({ message: "❌ Vehicle profile not found" });
            }

            // Check if user is admin or the vehicle belongs to the user
            if (req.user.role !== 'admin' && results[0].user_id !== req.user.user_id) {
                return res.status(403).json({ message: "Forbidden: You can only update your own vehicle profiles" });
            }

            // Update vehicle profile
            db.execute(
                `UPDATE vehicle_profile 
                 SET make = ?, model = ?, year_of_manuf = ?, engine_details = ?,
                     transmission_details = ?, vehicle_colour = ?, vehicle_features = ?,
                     condition_ = ?, owner_ = ?
                 WHERE vehicle_number = ?`,
                [
                    make, model, year_of_manuf, engine_details,
                    transmission_details, vehicle_colour, vehicle_features,
                    condition_, owner_, vehicleNumber
                ],
                (err, result) => {
                    if (err) return res.status(500).json({ message: "Server Error", error: err });
                    res.status(200).json({ message: "✅ Vehicle profile updated successfully" });
                }
            );
        });
    } catch (error) {
        res.status(500).json({ message: "Server Error", error });
    }
};

// Delete vehicle profile (Customer can delete their own profiles)
exports.deleteVehicleProfile = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: "Unauthorized: User not found in request" });
        }

        const { vehicleNumber } = req.params;
        const db = req.db;

        // Check if vehicle profile exists
        db.execute("SELECT * FROM vehicle_profile WHERE vehicle_number = ?", [vehicleNumber], (err, results) => {
            if (err) return res.status(500).json({ message: "Server Error", error: err });

            if (results.length === 0) {
                return res.status(404).json({ message: "❌ Vehicle profile not found" });
            }

            // Check if user is admin or the vehicle belongs to the user
            if (req.user.role !== 'admin' && results[0].user_id !== req.user.user_id) {
                return res.status(403).json({ message: "Forbidden: You can only delete your own vehicle profiles" });
            }

            // Delete vehicle profile
            db.execute(
                "DELETE FROM vehicle_profile WHERE vehicle_number = ?",
                [vehicleNumber],
                (err, result) => {
                    if (err) return res.status(500).json({ message: "Server Error", error: err });
                    res.status(200).json({ message: "✅ Vehicle profile deleted successfully" });
                }
            );
        });
    } catch (error) {
        res.status(500).json({ message: "Server Error", error });
    }
}; 