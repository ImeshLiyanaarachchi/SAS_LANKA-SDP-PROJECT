require("dotenv").config();

// Create inquiry (Any authenticated user)
exports.createInquiry = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: "Unauthorized: User not found in request" });
        }

        // Check if req.body exists
        if (!req.body) {
            return res.status(400).json({ message: "Request body is missing" });
        }

        const description = req.body.description;

        if (!description) {
            return res.status(400).json({ message: "Description is required" });
        }

        const db = req.db;

        // Create the inquiry
        db.execute(
            `INSERT INTO inquiries (
                user_id, description, status
            ) VALUES (?, ?, ?)`,
            [
                req.user.user_id,
                description,
                'pending' // Default status
            ],
            (err, result) => {
                if (err) return res.status(500).json({ message: "Server Error", error: err });
                res.status(201).json({ 
                    message: "✅ Inquiry submitted successfully",
                    inquiry_id: result.insertId
                });
            }
        );
    } catch (error) {
        console.error("Create Inquiry Error:", error);
        res.status(500).json({ message: "Server Error", error });
    }
};

// Get all inquiries (Admin only)
exports.getAllInquiries = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: "Unauthorized: User not found in request" });
        }

        // Check if user is admin
        if (req.user.role !== 'admin' && req.user.role !== 'technician') {
            return res.status(403).json({ message: "Forbidden: Only admin can view all inquiries" });
        }

        const db = req.db;
        db.execute(
            `SELECT 
                i.inquiry_id,
                i.description,
                i.response,
                i.status,
                i.created_at,
                i.responded_at,
                CONCAT(u.first_name, ' ', u.last_name) as user_name,
                u.email as user_email,
                u.phone_number as user_phone
             FROM inquiries i
             JOIN user u ON i.user_id = u.user_id
             ORDER BY i.created_at DESC`,
            (err, results) => {
                if (err) {
                    console.error("SQL Error:", err);
                    return res.status(500).json({ message: "Server Error", error: err });
                }
                
                res.status(200).json(results);
            }
        );
    } catch (error) {
        console.error("Error in getAllInquiries:", error);
        res.status(500).json({ message: "Server Error", error });
    }
};

// Get inquiries by user ID
exports.getInquiriesByUserId = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: "Unauthorized: User not found in request" });
        }

        const { userId } = req.params;
        
        // Check if user is admin or requesting their own inquiries
        if (req.user.role !== 'admin' && req.user.role !== 'technician' && parseInt(userId) !== req.user.user_id) {
            return res.status(403).json({ message: "Forbidden: You can only view your own inquiries" });
        }

        const db = req.db;
        db.execute(
            `SELECT * FROM inquiries WHERE user_id = ? ORDER BY created_at DESC`,
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

// Get a specific inquiry
exports.getInquiryById = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: "Unauthorized: User not found in request" });
        }

        const { inquiryId } = req.params;
        
        const db = req.db;
        db.execute(
            `SELECT 
                i.*,
                CONCAT(u.first_name, ' ', u.last_name) as user_name,
                u.email as user_email
             FROM inquiries i
             JOIN user u ON i.user_id = u.user_id
             WHERE i.inquiry_id = ?`,
            [inquiryId],
            (err, results) => {
                if (err) return res.status(500).json({ message: "Server Error", error: err });
                
                if (results.length === 0) {
                    return res.status(404).json({ message: "Inquiry not found" });
                }
                
                // Check if user is admin or the owner of the inquiry
                if (req.user.role !== 'admin' && req.user.role !== 'technician' && results[0].user_id !== req.user.user_id) {
                    return res.status(403).json({ message: "Forbidden: You can only view your own inquiries" });
                }
                
                res.status(200).json(results[0]);
            }
        );
    } catch (error) {
        res.status(500).json({ message: "Server Error", error });
    }
};

// Respond to inquiry (Admin only)
exports.respondToInquiry = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: "Unauthorized: User not found in request" });
        }

        // Check if user is admin
        if (req.user.role !== 'admin' && req.user.role !== 'technician') {
            return res.status(403).json({ message: "Forbidden: Only admin can respond to inquiries" });
        }

        const { inquiryId } = req.params;
        const { response, status = 'resolved' } = req.body;
        
        if (!response) {
            return res.status(400).json({ message: "Response is required" });
        }

        // Validate status value
        const validStatuses = ['pending', 'resolved', 'closed'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({ 
                message: `Invalid status value. Valid values are: ${validStatuses.join(', ')}` 
            });
        }

        const db = req.db;

        // First, check if inquiry exists
        db.execute(
            "SELECT * FROM inquiries WHERE inquiry_id = ?",
            [inquiryId],
            (err, results) => {
                if (err) {
                    console.error("DB Error when checking inquiry existence:", err);
                    return res.status(500).json({ message: "Server Error", error: err.message });
                }

                if (results.length === 0) {
                    return res.status(404).json({ message: "❌ Inquiry not found" });
                }

                // Update inquiry with response
                db.execute(
                    `UPDATE inquiries 
                     SET response = ?, status = ?, responded_at = CURRENT_TIMESTAMP
                     WHERE inquiry_id = ?`,
                    [response, status, inquiryId],
                    (err, result) => {
                        if (err) {
                            console.error("DB Error when updating inquiry:", err);
                            return res.status(500).json({ message: "Server Error", error: err.message });
                        }

                        res.status(200).json({
                            message: "✅ Response submitted successfully",
                            status: status
                        });
                    }
                );
            }
        );
    } catch (error) {
        console.error("Respond to Inquiry Error:", error);
        res.status(500).json({ message: "Server Error", error: error.message });
    }
};

// Update inquiry status (Admin only)
exports.updateInquiryStatus = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: "Unauthorized: User not found in request" });
        }

        // Check if user is admin
        if (req.user.role !== 'admin' && req.user.role !== 'technician') {
            return res.status(403).json({ message: "Forbidden: Only admin can update inquiry status" });
        }

        const { inquiryId } = req.params;
        const { status } = req.body;
        
        if (!status) {
            return res.status(400).json({ message: "Status is required" });
        }

        // Validate status value
        const validStatuses = ['pending', 'resolved', 'closed'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({ 
                message: `Invalid status value. Valid values are: ${validStatuses.join(', ')}` 
            });
        }

        const db = req.db;

        // Update inquiry status
        db.execute(
            `UPDATE inquiries SET status = ? WHERE inquiry_id = ?`,
            [status, inquiryId],
            (err, result) => {
                if (err) return res.status(500).json({ message: "Server Error", error: err });
                
                if (result.affectedRows === 0) {
                    return res.status(404).json({ message: "❌ Inquiry not found" });
                }
                
                res.status(200).json({ 
                    message: "✅ Inquiry status updated successfully",
                    status: status
                });
            }
        );
    } catch (error) {
        console.error("Update Inquiry Status Error:", error);
        res.status(500).json({ message: "Server Error", error });
    }
};

// Delete inquiry (Admin only)
exports.deleteInquiry = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: "Unauthorized: User not found in request" });
        }

        // Check if user is admin
        if (req.user.role !== 'admin' && req.user.role !== 'technician') {
            return res.status(403).json({ message: "Forbidden: Only admin can delete inquiries" });
        }

        const { inquiryId } = req.params;
        
        const db = req.db;
        db.execute(
            `DELETE FROM inquiries WHERE inquiry_id = ?`,
            [inquiryId],
            (err, result) => {
                if (err) return res.status(500).json({ message: "Server Error", error: err });
                
                if (result.affectedRows === 0) {
                    return res.status(404).json({ message: "❌ Inquiry not found" });
                }
                
                res.status(200).json({ message: "✅ Inquiry deleted successfully" });
            }
        );
    } catch (error) {
        console.error("Delete Inquiry Error:", error);
        res.status(500).json({ message: "Server Error", error });
    }
}; 