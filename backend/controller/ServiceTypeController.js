require("dotenv").config();

// Create a new service type (Admin only)
exports.createServiceType = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: "Unauthorized: User not found in request" });
        }

        // Check if user is an admin
        if (req.user.role !== 'admin') {
            return res.status(403).json({ message: "Forbidden: Only admin can create service types" });
        }

        const { type_name, description } = req.body;
        
        if (!type_name) {
            return res.status(400).json({ message: "Service type name is required" });
        }

        const db = req.db;

        // Check if service type already exists
        db.execute(
            "SELECT * FROM service_type WHERE type_name = ?",
            [type_name],
            (err, results) => {
                if (err) return res.status(500).json({ message: "Server Error", error: err });

                if (results.length > 0) {
                    return res.status(400).json({ message: "Service type already exists" });
                }

                // Create new service type
                db.execute(
                    "INSERT INTO service_type (type_name, description) VALUES (?, ?)",
                    [type_name, description || null],
                    (err, result) => {
                        if (err) return res.status(500).json({ message: "Server Error", error: err });

                        res.status(201).json({
                            message: "✅ Service type created successfully",
                            service_type_id: result.insertId
                        });
                    }
                );
            }
        );
    } catch (error) {
        console.error("Create Service Type Error:", error);
        res.status(500).json({ message: "Server Error", error });
    }
};

// Get all service types (Public)
exports.getAllServiceTypes = async (req, res) => {
    try {
        const db = req.db;
        
        db.execute(
            "SELECT * FROM service_type ORDER BY type_name",
            (err, results) => {
                if (err) return res.status(500).json({ message: "Server Error", error: err });
                
                res.status(200).json(results);
            }
        );
    } catch (error) {
        console.error("Get Service Types Error:", error);
        res.status(500).json({ message: "Server Error", error });
    }
};

// Get service type by ID
exports.getServiceTypeById = async (req, res) => {
    try {
        const { id } = req.params;
        const db = req.db;
        
        db.execute(
            "SELECT * FROM service_type WHERE service_type_id = ?",
            [id],
            (err, results) => {
                if (err) return res.status(500).json({ message: "Server Error", error: err });
                
                if (results.length === 0) {
                    return res.status(404).json({ message: "Service type not found" });
                }
                
                res.status(200).json(results[0]);
            }
        );
    } catch (error) {
        console.error("Get Service Type Error:", error);
        res.status(500).json({ message: "Server Error", error });
    }
};

// Update service type (Admin only)
exports.updateServiceType = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: "Unauthorized: User not found in request" });
        }

        // Check if user is an admin
        if (req.user.role !== 'admin') {
            return res.status(403).json({ message: "Forbidden: Only admin can update service types" });
        }

        const { id } = req.params;
        const { type_name, description } = req.body;
        
        if (!type_name) {
            return res.status(400).json({ message: "Service type name is required" });
        }

        const db = req.db;

        // Check if service type exists
        db.execute(
            "SELECT * FROM service_type WHERE service_type_id = ?",
            [id],
            (err, results) => {
                if (err) return res.status(500).json({ message: "Server Error", error: err });

                if (results.length === 0) {
                    return res.status(404).json({ message: "Service type not found" });
                }

                // Update service type
                db.execute(
                    "UPDATE service_type SET type_name = ?, description = ? WHERE service_type_id = ?",
                    [type_name, description || null, id],
                    (err, result) => {
                        if (err) return res.status(500).json({ message: "Server Error", error: err });

                        res.status(200).json({
                            message: "✅ Service type updated successfully"
                        });
                    }
                );
            }
        );
    } catch (error) {
        console.error("Update Service Type Error:", error);
        res.status(500).json({ message: "Server Error", error });
    }
};

// Delete service type (Admin only)
exports.deleteServiceType = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: "Unauthorized: User not found in request" });
        }

        // Check if user is an admin
        if (req.user.role !== 'admin') {
            return res.status(403).json({ message: "Forbidden: Only admin can delete service types" });
        }

        const { id } = req.params;
        const db = req.db;

        // Check if service type exists
        db.execute(
            "SELECT * FROM service_type WHERE service_type_id = ?",
            [id],
            (err, results) => {
                if (err) return res.status(500).json({ message: "Server Error", error: err });

                if (results.length === 0) {
                    return res.status(404).json({ message: "Service type not found" });
                }

                // Check if service type is in use in appointments
                db.execute(
                    "SELECT COUNT(*) as count FROM appointment WHERE service_type = ?",
                    [results[0].type_name],
                    (err, appointmentResults) => {
                        if (err) return res.status(500).json({ message: "Server Error", error: err });

                        if (appointmentResults[0].count > 0) {
                            return res.status(400).json({ 
                                message: "Cannot delete service type that is in use in appointments" 
                            });
                        }

                        // Delete service type
                        db.execute(
                            "DELETE FROM service_type WHERE service_type_id = ?",
                            [id],
                            (err, result) => {
                                if (err) return res.status(500).json({ message: "Server Error", error: err });

                                res.status(200).json({
                                    message: "✅ Service type deleted successfully"
                                });
                            }
                        );
                    }
                );
            }
        );
    } catch (error) {
        console.error("Delete Service Type Error:", error);
        res.status(500).json({ message: "Server Error", error });
    }
}; 