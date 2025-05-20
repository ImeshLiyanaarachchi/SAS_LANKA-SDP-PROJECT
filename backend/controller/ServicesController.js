require("dotenv").config();

// Create a new service
exports.createService = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: "Unauthorized: User not found in request" });
        }

        const { name, description, motor_vehicle_id, price } = req.body;
        const db = req.db;

        // Validate required fields
        if (!name || !motor_vehicle_id || !price) {
            return res.status(400).json({ message: "Name, motor vehicle ID, and price are required" });
        }

        // Check if motor vehicle exists
        db.execute(
            "SELECT * FROM motor_vehicles WHERE motor_vehicle_id = ?",
            [motor_vehicle_id],
            (vehicleErr, vehicleResults) => {
                if (vehicleErr) {
                    console.error("Error checking motor vehicle:", vehicleErr);
                    return res.status(500).json({ message: "Server Error", error: vehicleErr });
                }

                if (vehicleResults.length === 0) {
                    return res.status(404).json({ message: "Motor vehicle not found" });
                }

                // Check if a service with the same name and motor_vehicle_id already exists
                db.execute(
                    "SELECT * FROM services WHERE name = ? AND motor_vehicle_id = ?",
                    [name, motor_vehicle_id],
                    (duplicateErr, duplicateResults) => {
                        if (duplicateErr) {
                            console.error("Error checking for duplicate service:", duplicateErr);
                            return res.status(500).json({ message: "Server Error", error: duplicateErr });
                        }

                        if (duplicateResults.length > 0) {
                            return res.status(409).json({ 
                                message: "Service already exists for this vehicle type",
                                existing_service: {
                                    service_id: duplicateResults[0].service_id,
                                    name: duplicateResults[0].name,
                                    vehicle_type: vehicleResults[0].vehicle_type
                                }
                            });
                        }

                        // Insert the service
                        const query = `
                            INSERT INTO services 
                            (name, description, motor_vehicle_id, price, is_active)
                            VALUES (?, ?, ?, ?, TRUE)
                        `;
                        
                        db.execute(
                            query,
                            [name, description, motor_vehicle_id, price],
                            (err, results) => {
                                if (err) {
                                    console.error("Error creating service:", err);
                                    return res.status(500).json({ message: "Server Error", error: err });
                                }
                                
                                res.status(201).json({
                                    message: "Service created successfully",
                                    service_id: results.insertId
                                });
                            }
                        );
                    }
                );
            }
        );
    } catch (error) {
        console.error("General error in createService:", error);
        res.status(500).json({ message: "Server Error", error });
    }
};

// Get all services
exports.getAllServices = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: "Unauthorized: User not found in request" });
        }

        const db = req.db;
        
        const query = `
            SELECT 
                s.*,
                mv.vehicle_type
            FROM services s
            JOIN motor_vehicles mv ON s.motor_vehicle_id = mv.motor_vehicle_id
            ORDER BY s.name
        `;
        
        db.execute(query, (err, results) => {
            if (err) {
                console.error("Error fetching services:", err);
                return res.status(500).json({ message: "Server Error", error: err });
            }
            res.status(200).json(results);
        });
    } catch (error) {
        console.error("General error in getAllServices:", error);
        res.status(500).json({ message: "Server Error", error });
    }
};

// Get service by ID
exports.getServiceById = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: "Unauthorized: User not found in request" });
        }

        const { serviceId } = req.params;
        const db = req.db;

        const query = `
            SELECT 
                s.*,
                mv.vehicle_type
            FROM services s
            JOIN motor_vehicles mv ON s.motor_vehicle_id = mv.motor_vehicle_id
            WHERE s.service_id = ?
        `;
        
        db.execute(query, [serviceId], (err, results) => {
            if (err) {
                console.error("Error fetching service:", err);
                return res.status(500).json({ message: "Server Error", error: err });
            }

            if (results.length === 0) {
                return res.status(404).json({ message: "Service not found" });
            }

            res.status(200).json(results[0]);
        });
    } catch (error) {
        console.error("General error in getServiceById:", error);
        res.status(500).json({ message: "Server Error", error });
    }
};

// Update service
exports.updateService = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: "Unauthorized: User not found in request" });
        }

        const { serviceId } = req.params;
        const { name, description, motor_vehicle_id, price, is_active } = req.body;
        const db = req.db;

        // Check if service exists
        db.execute(
            "SELECT * FROM services WHERE service_id = ?",
            [serviceId],
            (serviceErr, serviceResults) => {
                if (serviceErr) {
                    console.error("Error checking service:", serviceErr);
                    return res.status(500).json({ message: "Server Error", error: serviceErr });
                }

                if (serviceResults.length === 0) {
                    return res.status(404).json({ message: "Service not found" });
                }

                const currentService = serviceResults[0];
                const newName = name !== undefined ? name : currentService.name;
                const newMotorVehicleId = motor_vehicle_id !== undefined ? motor_vehicle_id : currentService.motor_vehicle_id;

                // If name or motor_vehicle_id is changing, check for duplicates
                if (name !== undefined || motor_vehicle_id !== undefined) {
                    db.execute(
                        "SELECT * FROM services WHERE name = ? AND motor_vehicle_id = ? AND service_id != ?",
                        [newName, newMotorVehicleId, serviceId],
                        (duplicateErr, duplicateResults) => {
                            if (duplicateErr) {
                                console.error("Error checking for duplicate service:", duplicateErr);
                                return res.status(500).json({ message: "Server Error", error: duplicateErr });
                            }

                            if (duplicateResults.length > 0) {
                                return res.status(409).json({ 
                                    message: "Another service with this name already exists for this vehicle type",
                                    existing_service: {
                                        service_id: duplicateResults[0].service_id,
                                        name: duplicateResults[0].name
                                    }
                                });
                            }

                            // Continue with motor vehicle check if needed
                            if (motor_vehicle_id !== undefined) {
                                checkMotorVehicle();
                            } else {
                                updateServiceRecord();
                            }
                        }
                    );
                } else {
                    // If motor_vehicle_id is provided, check if it exists
                    if (motor_vehicle_id !== undefined) {
                        checkMotorVehicle();
                    } else {
                        updateServiceRecord();
                    }
                }

                function checkMotorVehicle() {
                    db.execute(
                        "SELECT * FROM motor_vehicles WHERE motor_vehicle_id = ?",
                        [motor_vehicle_id],
                        (vehicleErr, vehicleResults) => {
                            if (vehicleErr) {
                                console.error("Error checking motor vehicle:", vehicleErr);
                                return res.status(500).json({ message: "Server Error", error: vehicleErr });
                            }

                            if (vehicleResults.length === 0) {
                                return res.status(404).json({ message: "Motor vehicle not found" });
                            }

                            updateServiceRecord();
                        }
                    );
                }

                function updateServiceRecord() {
                    // Build the update query dynamically based on provided fields
                    let updateFields = [];
                    let queryParams = [];

                    if (name !== undefined) {
                        updateFields.push("name = ?");
                        queryParams.push(name);
                    }

                    if (description !== undefined) {
                        updateFields.push("description = ?");
                        queryParams.push(description);
                    }

                    if (motor_vehicle_id !== undefined) {
                        updateFields.push("motor_vehicle_id = ?");
                        queryParams.push(motor_vehicle_id);
                    }

                    if (price !== undefined) {
                        updateFields.push("price = ?");
                        queryParams.push(price);
                    }

                    if (is_active !== undefined) {
                        updateFields.push("is_active = ?");
                        queryParams.push(is_active);
                    }

                    if (updateFields.length === 0) {
                        return res.status(400).json({ message: "No fields to update" });
                    }

                    // Add service_id to query parameters
                    queryParams.push(serviceId);

                    const query = `
                        UPDATE services
                        SET ${updateFields.join(", ")}
                        WHERE service_id = ?
                    `;

                    db.execute(query, queryParams, (err, results) => {
                        if (err) {
                            console.error("Error updating service:", err);
                            return res.status(500).json({ message: "Server Error", error: err });
                        }

                        res.status(200).json({
                            message: "Service updated successfully",
                            affectedRows: results.affectedRows
                        });
                    });
                }
            }
        );
    } catch (error) {
        console.error("General error in updateService:", error);
        res.status(500).json({ message: "Server Error", error });
    }
};

// Delete service
exports.deleteService = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: "Unauthorized: User not found in request" });
        }

        const { serviceId } = req.params;
        const db = req.db;

        // Check if service exists
        db.execute(
            "SELECT * FROM services WHERE service_id = ?",
            [serviceId],
            (serviceErr, serviceResults) => {
                if (serviceErr) {
                    console.error("Error checking service:", serviceErr);
                    return res.status(500).json({ message: "Server Error", error: serviceErr });
                }

                if (serviceResults.length === 0) {
                    return res.status(404).json({ message: "Service not found" });
                }

                // Delete the service
                db.execute(
                    "DELETE FROM services WHERE service_id = ?",
                    [serviceId],
                    (err, results) => {
                        if (err) {
                            console.error("Error deleting service:", err);
                            return res.status(500).json({ message: "Server Error", error: err });
                        }

                        res.status(200).json({
                            message: "Service deleted successfully",
                            affectedRows: results.affectedRows
                        });
                    }
                );
            }
        );
    } catch (error) {
        console.error("General error in deleteService:", error);
        res.status(500).json({ message: "Server Error", error });
    }
};

// Deactivate service
exports.deactivateService = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: "Unauthorized: User not found in request" });
        }

        const { serviceId } = req.params;
        const db = req.db;

        // Check if service exists
        db.execute(
            "SELECT * FROM services WHERE service_id = ?",
            [serviceId],
            (serviceErr, serviceResults) => {
                if (serviceErr) {
                    console.error("Error checking service:", serviceErr);
                    return res.status(500).json({ message: "Server Error", error: serviceErr });
                }

                if (serviceResults.length === 0) {
                    return res.status(404).json({ message: "Service not found" });
                }

                // Deactivate the service
                db.execute(
                    "UPDATE services SET is_active = FALSE WHERE service_id = ?",
                    [serviceId],
                    (err, results) => {
                        if (err) {
                            console.error("Error deactivating service:", err);
                            return res.status(500).json({ message: "Server Error", error: err });
                        }

                        res.status(200).json({
                            message: "Service deactivated successfully",
                            affectedRows: results.affectedRows
                        });
                    }
                );
            }
        );
    } catch (error) {
        console.error("General error in deactivateService:", error);
        res.status(500).json({ message: "Server Error", error });
    }
};

// Get all motor vehicles
exports.getAllMotorVehicles = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: "Unauthorized: User not found in request" });
        }

        const db = req.db;
        
        const query = "SELECT * FROM motor_vehicles ORDER BY vehicle_type";
        
        db.execute(query, (err, results) => {
            if (err) {
                console.error("Error fetching motor vehicles:", err);
                return res.status(500).json({ message: "Server Error", error: err });
            }
            res.status(200).json(results);
        });
    } catch (error) {
        console.error("General error in getAllMotorVehicles:", error);
        res.status(500).json({ message: "Server Error", error });
    }
};

// Get services with active promotions
exports.getServicesWithPromotions = async (req, res) => {
  try {
    const db = req.db;
    
    // First get all services with vehicle types
    const servicesQuery = `
      SELECT 
        s.*,
        mv.vehicle_type
      FROM services s
      JOIN motor_vehicles mv ON s.motor_vehicle_id = mv.motor_vehicle_id
      WHERE s.is_active = TRUE
      ORDER BY s.name
    `;
    
    db.execute(servicesQuery, async (err, services) => {
      if (err) {
        console.error("Error fetching services:", err);
        return res.status(500).json({ message: "Server Error", error: err });
      }

      // For each service, get its promotions (active, upcoming, and expired)
      const today = new Date().toISOString().split('T')[0]; // Format as YYYY-MM-DD
      
      const servicesWithPromotions = await Promise.all(services.map(async (service) => {
        return new Promise((resolve) => {
          const promotionsQuery = `
            SELECT * 
            FROM promotions 
            WHERE service_id = ? 
            AND is_active = TRUE
            ORDER BY 
              CASE 
                WHEN start_date <= ? AND end_date >= ? THEN 1 -- Active promotions first
                WHEN start_date > ? THEN 2 -- Upcoming promotions next
                ELSE 3 -- Expired promotions last
              END,
              start_date ASC
          `;
          
          db.execute(promotionsQuery, [service.service_id, today, today, today], (err, promotions) => {
            if (err) {
              console.error(`Error fetching promotions for service ${service.service_id}:`, err);
              resolve({...service, promotions: []});
            } else {
              resolve({...service, promotions});
            }
          });
        });
      }));
      
      res.status(200).json(servicesWithPromotions);
    });
  } catch (error) {
    console.error("General error in getServicesWithPromotions:", error);
    res.status(500).json({ message: "Server Error", error });
  }
}; 