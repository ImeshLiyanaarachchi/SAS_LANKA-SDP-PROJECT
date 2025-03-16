const Inquiry = require("../model/Inquiry");
require("dotenv").config();

// Create new inquiry (User only)
exports.createInquiry = async (req, res) => {
    try {
        console.log("🔹 Inside createInquiry function");
        console.log("🔹 Received user from token:", req.user);

        if (!req.user) {
            return res.status(401).json({ message: "Unauthorized: User not found in request" });
        }

        const { inquiry_details } = req.body;
        const user_id = req.user.user_id;
        const db = req.db;

        // Insert inquiry
        db.execute(
            "INSERT INTO Inquiry (User_ID, Inquiry_Details) VALUES (?, ?)",
            [user_id, inquiry_details],
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

// Get all inquiries (admin only)
exports.getAllInquiries = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: "Unauthorized: User not found in request" });
        }

        // Check if user is admin
        if (req.user.role !== 'admin') {
            return res.status(403).json({ message: "Forbidden: Only admin can view all inquiries" });
        }

        const db = req.db;
        db.execute(
            `SELECT i.*, u.first_name, u.last_name, 
                    tw.Status as Technician_Status, tw.Response as Technician_Response,
                    tw.Assigned_Timestamp, tw.Updated_Timestamp,
                    CONCAT(tech.first_name, ' ', tech.last_name) as Technician_Name
             FROM Inquiry i 
             JOIN user u ON i.User_ID = u.user_id
             LEFT JOIN Technician_Work tw ON i.Inquiry_ID = tw.Inquiry_ID
             LEFT JOIN user tech ON tw.ServiceTechnician_ID = tech.user_id
             ORDER BY i.Created_Timestamp DESC`,
            (err, results) => {
                if (err) return res.status(500).json({ message: "Server Error", error: err });
                res.status(200).json(results);
            }
        );
    } catch (error) {
        res.status(500).json({ message: "Server Error", error });
    }
};

// Get inquiry by ID with technician work history
exports.getInquiryById = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: "Unauthorized: User not found in request" });
        }

        const { id } = req.params;
        const db = req.db;
        
        // Get inquiry details
        db.execute(
            `SELECT i.*, u.first_name, u.last_name 
             FROM Inquiry i 
             JOIN user u ON i.User_ID = u.user_id 
             WHERE i.Inquiry_ID = ?`,
            [id],
            async (err, results) => {
                if (err) return res.status(500).json({ message: "Server Error", error: err });
                
                if (results.length === 0) {
                    return res.status(404).json({ message: "❌ Inquiry not found" });
                }

                // Check if user is admin or the inquiry belongs to the user
                if (req.user.role !== 'admin' && results[0].User_ID !== req.user.user_id) {
                    return res.status(403).json({ message: "Forbidden: You can only view your own inquiries" });
                }

                // Get technician work history
                db.execute(
                    `SELECT tw.*, CONCAT(u.first_name, ' ', u.last_name) as Technician_Name
                     FROM Technician_Work tw
                     LEFT JOIN user u ON tw.ServiceTechnician_ID = u.user_id
                     WHERE tw.Inquiry_ID = ?
                     ORDER BY tw.Assigned_Timestamp DESC`,
                    [id],
                    (err, workHistory) => {
                        if (err) return res.status(500).json({ message: "Server Error", error: err });
                        
                        res.status(200).json({
                            ...results[0],
                            work_history: workHistory
                        });
                    }
                );
            }
        );
    } catch (error) {
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
        if (req.user.role !== 'admin' && userId !== req.user.user_id) {
            return res.status(403).json({ message: "Forbidden: You can only view your own inquiries" });
        }

        const db = req.db;
        db.execute(
            `SELECT i.*, u.first_name, u.last_name,
                    tw.Status as Technician_Status, tw.Response as Technician_Response,
                    tw.Assigned_Timestamp, tw.Updated_Timestamp,
                    CONCAT(tech.first_name, ' ', tech.last_name) as Technician_Name
             FROM Inquiry i 
             JOIN user u ON i.User_ID = u.user_id
             LEFT JOIN Technician_Work tw ON i.Inquiry_ID = tw.Inquiry_ID
             LEFT JOIN user tech ON tw.ServiceTechnician_ID = tech.user_id
             WHERE i.User_ID = ?
             ORDER BY i.Created_Timestamp DESC`,
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

// Technician takes an inquiry
exports.takeInquiry = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: "Unauthorized: User not found in request" });
        }

        // Check if user is a technician
        if (req.user.role !== 'technician') {
            return res.status(403).json({ message: "Forbidden: Only technicians can take inquiries" });
        }

        const { id } = req.params;
        const { response } = req.body;
        const technician_id = req.user.user_id; // Using user_id as technician_id
        const db = req.db;

        // Check if inquiry exists and is pending
        db.execute(
            "SELECT * FROM Inquiry WHERE Inquiry_ID = ? AND Status = 'Pending'",
            [id],
            (err, results) => {
                if (err) return res.status(500).json({ message: "Server Error", error: err });

                if (results.length === 0) {
                    return res.status(404).json({ message: "❌ Inquiry not found or already taken" });
                }

                // Create technician work entry
                db.execute(
                    "INSERT INTO Technician_Work (Inquiry_ID, ServiceTechnician_ID, Status, Response) VALUES (?, ?, 'In Progress', ?)",
                    [id, technician_id, response],
                    (err, result) => {
                        if (err) return res.status(500).json({ message: "Server Error", error: err });
                        res.status(201).json({ message: "✅ Inquiry taken successfully" });
                    }
                );
            }
        );
    } catch (error) {
        res.status(500).json({ message: "Server Error", error });
    }
};

// Technician updates inquiry status
exports.updateInquiryStatus = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: "Unauthorized: User not found in request" });
        }

        // Check if user is a technician
        if (req.user.role !== 'technician') {
            return res.status(403).json({ message: "Forbidden: Only technicians can update inquiry status" });
        }

        const { id } = req.params;
        const { status, response } = req.body;
        const technician_id = req.user.user_id; // Using user_id as technician_id
        const db = req.db;

        // Validate status
        const validStatuses = ['In Progress', 'Resolved'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({ message: "Invalid status. Must be one of: In Progress, Resolved" });
        }

        // Check if technician is assigned to this inquiry
        db.execute(
            "SELECT * FROM Technician_Work WHERE Inquiry_ID = ? AND ServiceTechnician_ID = ?",
            [id, technician_id],
            (err, results) => {
                if (err) return res.status(500).json({ message: "Server Error", error: err });

                if (results.length === 0) {
                    return res.status(403).json({ message: "Forbidden: You are not assigned to this inquiry" });
                }

                // Update technician work status
                db.execute(
                    "UPDATE Technician_Work SET Status = ?, Response = ? WHERE Inquiry_ID = ? AND ServiceTechnician_ID = ?",
                    [status, response, id, technician_id],
                    (err, result) => {
                        if (err) return res.status(500).json({ message: "Server Error", error: err });
                        res.status(200).json({ message: "✅ Inquiry status updated successfully" });
                    }
                );
            }
        );
    } catch (error) {
        res.status(500).json({ message: "Server Error", error });
    }
};

// Delete inquiry (admin only)
exports.deleteInquiry = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: "Unauthorized: User not found in request" });
        }

        // Check if user is admin
        if (req.user.role !== 'admin') {
            return res.status(403).json({ message: "Forbidden: Only admin can delete inquiries" });
        }

        const { id } = req.params;
        const db = req.db;

        // Check if inquiry exists
        db.execute("SELECT * FROM Inquiry WHERE Inquiry_ID = ?", [id], (err, results) => {
            if (err) return res.status(500).json({ message: "Server Error", error: err });

            if (results.length === 0) {
                return res.status(404).json({ message: "❌ Inquiry not found" });
            }

            // Delete inquiry (Technician_Work entries will be deleted automatically due to CASCADE)
            db.execute(
                "DELETE FROM Inquiry WHERE Inquiry_ID = ?",
                [id],
                (err, result) => {
                    if (err) return res.status(500).json({ message: "Server Error", error: err });
                    res.status(200).json({ message: "✅ Inquiry deleted successfully" });
                }
            );
        });
    } catch (error) {
        res.status(500).json({ message: "Server Error", error });
    }
}; 