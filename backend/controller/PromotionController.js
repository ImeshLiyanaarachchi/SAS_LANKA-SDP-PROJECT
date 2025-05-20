require("dotenv").config();

// Create a new promotion
exports.createPromotion = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: "Unauthorized: User not found in request" });
        }

        const { service_id, discount_percentage, start_date, end_date } = req.body;
        const db = req.db;

        // Validate required fields
        if (!service_id || !discount_percentage || !start_date || !end_date) {
            return res.status(400).json({ message: "Service ID, discount percentage, start date and end date are required" });
        }

        // Check if service exists
        db.execute(
            "SELECT * FROM services WHERE service_id = ?",
            [service_id],
            (serviceErr, serviceResults) => {
                if (serviceErr) {
                    console.error("Error checking service:", serviceErr);
                    return res.status(500).json({ message: "Server Error", error: serviceErr });
                }

                if (serviceResults.length === 0) {
                    return res.status(404).json({ message: "Service not found" });
                }

                // Validate discount percentage
                if (discount_percentage < 0 || discount_percentage > 100) {
                    return res.status(400).json({ message: "Discount percentage must be between 0 and 100" });
                }

                // Validate dates
                const startDateObj = new Date(start_date);
                const endDateObj = new Date(end_date);
                
                if (isNaN(startDateObj.getTime()) || isNaN(endDateObj.getTime())) {
                    return res.status(400).json({ message: "Invalid date format" });
                }
                
                if (endDateObj < startDateObj) {
                    return res.status(400).json({ message: "End date must be after start date" });
                }

                // Check for overlapping promotions for the same service
                // An overlap occurs when:
                // 1. The new start date is between an existing promotion's start and end dates, OR
                // 2. The new end date is between an existing promotion's start and end dates, OR
                // 3. The new promotion completely encompasses an existing promotion
                const overlapQuery = `
                    SELECT * FROM promotions 
                    WHERE service_id = ? 
                    AND is_active = TRUE
                    AND (
                        (? BETWEEN start_date AND end_date) OR
                        (? BETWEEN start_date AND end_date) OR
                        (? <= start_date AND ? >= end_date)
                    )
                `;
                
                db.execute(
                    overlapQuery,
                    [service_id, start_date, end_date, start_date, end_date],
                    (overlapErr, overlapResults) => {
                        if (overlapErr) {
                            console.error("Error checking for overlapping promotions:", overlapErr);
                            return res.status(500).json({ message: "Server Error", error: overlapErr });
                        }

                        if (overlapResults.length > 0) {
                            const overlappingPromotion = overlapResults[0];
                            return res.status(409).json({
                                message: "An active promotion already exists for this service during the specified date range",
                                existing_promotion: {
                                    promotion_id: overlappingPromotion.promotion_id,
                                    service_id: overlappingPromotion.service_id,
                                    start_date: overlappingPromotion.start_date,
                                    end_date: overlappingPromotion.end_date,
                                    discount_percentage: overlappingPromotion.discount_percentage
                                }
                            });
                        }

                        // Insert the promotion
                        const query = `
                            INSERT INTO promotions 
                            (service_id, discount_percentage, start_date, end_date, is_active)
                            VALUES (?, ?, ?, ?, TRUE)
                        `;
                        
                        db.execute(
                            query,
                            [service_id, discount_percentage, start_date, end_date],
                            (err, results) => {
                                if (err) {
                                    console.error("Error creating promotion:", err);
                                    return res.status(500).json({ message: "Server Error", error: err });
                                }
                                
                                res.status(201).json({
                                    message: "Promotion created successfully",
                                    promotion_id: results.insertId
                                });
                            }
                        );
                    }
                );
            }
        );
    } catch (error) {
        console.error("General error in createPromotion:", error);
        res.status(500).json({ message: "Server Error", error });
    }
};

// Get all promotions
exports.getAllPromotions = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: "Unauthorized: User not found in request" });
        }

        const db = req.db;
        
        const query = `
            SELECT 
                p.*,
                s.name as service_name,
                s.price as service_price,
                mv.vehicle_type
            FROM promotions p
            JOIN services s ON p.service_id = s.service_id
            JOIN motor_vehicles mv ON s.motor_vehicle_id = mv.motor_vehicle_id
            ORDER BY p.end_date DESC
        `;
        
        db.execute(query, (err, results) => {
            if (err) {
                console.error("Error fetching promotions:", err);
                return res.status(500).json({ message: "Server Error", error: err });
            }
            res.status(200).json(results);
        });
    } catch (error) {
        console.error("General error in getAllPromotions:", error);
        res.status(500).json({ message: "Server Error", error });
    }
};

// Get promotions by service ID
exports.getPromotionsByServiceId = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: "Unauthorized: User not found in request" });
        }

        const { serviceId } = req.params;
        const db = req.db;

        const query = `
            SELECT 
                p.*,
                s.name as service_name,
                s.price as service_price
            FROM promotions p
            JOIN services s ON p.service_id = s.service_id
            WHERE p.service_id = ?
            ORDER BY p.end_date DESC
        `;
        
        db.execute(query, [serviceId], (err, results) => {
            if (err) {
                console.error("Error fetching promotions:", err);
                return res.status(500).json({ message: "Server Error", error: err });
            }
            res.status(200).json(results);
        });
    } catch (error) {
        console.error("General error in getPromotionsByServiceId:", error);
        res.status(500).json({ message: "Server Error", error });
    }
};

// Update promotion
exports.updatePromotion = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: "Unauthorized: User not found in request" });
        }

        const { promotionId } = req.params;
        const { discount_percentage, start_date, end_date, is_active } = req.body;
        const db = req.db;

        // Check if promotion exists
        db.execute(
            "SELECT * FROM promotions WHERE promotion_id = ?",
            [promotionId],
            (promotionErr, promotionResults) => {
                if (promotionErr) {
                    console.error("Error checking promotion:", promotionErr);
                    return res.status(500).json({ message: "Server Error", error: promotionErr });
                }

                if (promotionResults.length === 0) {
                    return res.status(404).json({ message: "Promotion not found" });
                }

                const currentPromotion = promotionResults[0];
                const newStartDate = start_date !== undefined ? start_date : currentPromotion.start_date;
                const newEndDate = end_date !== undefined ? end_date : currentPromotion.end_date;
                
                // Validate dates if provided
                if (start_date !== undefined || end_date !== undefined) {
                    const startDateObj = new Date(newStartDate);
                    const endDateObj = new Date(newEndDate);
                    
                    if (isNaN(startDateObj.getTime()) || isNaN(endDateObj.getTime())) {
                        return res.status(400).json({ message: "Invalid date format" });
                    }
                    
                    if (endDateObj < startDateObj) {
                        return res.status(400).json({ message: "End date must be after start date" });
                    }

                    // Check for overlapping promotions if dates are changing
                    const overlapQuery = `
                        SELECT * FROM promotions 
                        WHERE service_id = ? 
                        AND promotion_id != ?
                        AND is_active = TRUE
                        AND (
                            (? BETWEEN start_date AND end_date) OR
                            (? BETWEEN start_date AND end_date) OR
                            (? <= start_date AND ? >= end_date)
                        )
                    `;
                    
                    db.execute(
                        overlapQuery,
                        [currentPromotion.service_id, promotionId, newStartDate, newEndDate, newStartDate, newEndDate],
                        (overlapErr, overlapResults) => {
                            if (overlapErr) {
                                console.error("Error checking for overlapping promotions:", overlapErr);
                                return res.status(500).json({ message: "Server Error", error: overlapErr });
                            }

                            if (overlapResults.length > 0) {
                                const overlappingPromotion = overlapResults[0];
                                return res.status(409).json({
                                    message: "Another active promotion already exists for this service during the specified date range",
                                    existing_promotion: {
                                        promotion_id: overlappingPromotion.promotion_id,
                                        service_id: overlappingPromotion.service_id,
                                        start_date: overlappingPromotion.start_date,
                                        end_date: overlappingPromotion.end_date,
                                        discount_percentage: overlappingPromotion.discount_percentage
                                    }
                                });
                            }

                            // Proceed with update
                            performUpdate();
                        }
                    );
                } else {
                    // No date changes, proceed with update
                    performUpdate();
                }

                function performUpdate() {
                    // Build the update query dynamically based on provided fields
                    let updateFields = [];
                    let queryParams = [];

                    if (discount_percentage !== undefined) {
                        // Validate discount percentage
                        if (discount_percentage < 0 || discount_percentage > 100) {
                            return res.status(400).json({ message: "Discount percentage must be between 0 and 100" });
                        }
                        updateFields.push("discount_percentage = ?");
                        queryParams.push(discount_percentage);
                    }

                    if (start_date !== undefined) {
                        updateFields.push("start_date = ?");
                        queryParams.push(start_date);
                    }

                    if (end_date !== undefined) {
                        updateFields.push("end_date = ?");
                        queryParams.push(end_date);
                    }

                    if (is_active !== undefined) {
                        updateFields.push("is_active = ?");
                        queryParams.push(is_active);
                    }

                    if (updateFields.length === 0) {
                        return res.status(400).json({ message: "No fields to update" });
                    }

                    // Add promotion_id to query parameters
                    queryParams.push(promotionId);

                    const query = `
                        UPDATE promotions
                        SET ${updateFields.join(", ")}
                        WHERE promotion_id = ?
                    `;

                    db.execute(query, queryParams, (err, results) => {
                        if (err) {
                            console.error("Error updating promotion:", err);
                            return res.status(500).json({ message: "Server Error", error: err });
                        }

                        res.status(200).json({
                            message: "Promotion updated successfully",
                            affectedRows: results.affectedRows
                        });
                    });
                }
            }
        );
    } catch (error) {
        console.error("General error in updatePromotion:", error);
        res.status(500).json({ message: "Server Error", error });
    }
};

// Delete promotion
exports.deletePromotion = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: "Unauthorized: User not found in request" });
        }

        const { promotionId } = req.params;
        const db = req.db;

        // Check if promotion exists
        db.execute(
            "SELECT * FROM promotions WHERE promotion_id = ?",
            [promotionId],
            (promotionErr, promotionResults) => {
                if (promotionErr) {
                    console.error("Error checking promotion:", promotionErr);
                    return res.status(500).json({ message: "Server Error", error: promotionErr });
                }

                if (promotionResults.length === 0) {
                    return res.status(404).json({ message: "Promotion not found" });
                }

                // Delete the promotion
                db.execute(
                    "DELETE FROM promotions WHERE promotion_id = ?",
                    [promotionId],
                    (err, results) => {
                        if (err) {
                            console.error("Error deleting promotion:", err);
                            return res.status(500).json({ message: "Server Error", error: err });
                        }

                        res.status(200).json({
                            message: "Promotion deleted successfully",
                            affectedRows: results.affectedRows
                        });
                    }
                );
            }
        );
    } catch (error) {
        console.error("General error in deletePromotion:", error);
        res.status(500).json({ message: "Server Error", error });
    }
}; 