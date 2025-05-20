require("dotenv").config();

// Create a new feedback
exports.createFeedback = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: "Unauthorized: User not found in request" });
        }

        const { rating, description } = req.body;
        const user_id = req.user.user_id;
        const db = req.db;

        // Validate required fields
        if (!rating) {
            return res.status(400).json({ message: "Rating is required" });
        }

        // Validate rating range
        if (rating < 1 || rating > 5) {
            return res.status(400).json({ message: "Rating must be between 1 and 5" });
        }

        // Insert the feedback
        const query = `
            INSERT INTO feedback 
            (user_id, rating, description)
            VALUES (?, ?, ?)
        `;
        
        db.execute(
            query,
            [user_id, rating, description || null],
            (err, results) => {
                if (err) {
                    console.error("Error creating feedback:", err);
                    return res.status(500).json({ message: "Server Error", error: err });
                }
                
                res.status(201).json({
                    message: "Feedback submitted successfully",
                    feedback_id: results.insertId
                });
            }
        );
    } catch (error) {
        console.error("General error in createFeedback:", error);
        res.status(500).json({ message: "Server Error", error });
    }
};

// Get all feedback (admin only)
exports.getAllFeedback = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: "Unauthorized: User not found in request" });
        }

        // Check if user is admin
        if (req.user.role !== 'admin') {
            return res.status(403).json({ message: "Forbidden: Admin access required" });
        }

        const db = req.db;
        
        const query = `
            SELECT 
                f.*,
                u.first_name,
                u.last_name,
                u.email
            FROM feedback f
            JOIN user u ON f.user_id = u.user_id
            ORDER BY f.feedback_id DESC
        `;
        
        db.execute(query, (err, results) => {
            if (err) {
                console.error("Error fetching feedback:", err);
                return res.status(500).json({ message: "Server Error", error: err });
            }
            res.status(200).json(results);
        });
    } catch (error) {
        console.error("General error in getAllFeedback:", error);
        res.status(500).json({ message: "Server Error", error });
    }
};

// Get feedback by user ID
exports.getUserFeedback = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: "Unauthorized: User not found in request" });
        }

        const user_id = req.user.user_id;
        const db = req.db;

        const query = `
            SELECT * FROM feedback
            WHERE user_id = ?
            ORDER BY feedback_id DESC
        `;
        
        db.execute(query, [user_id], (err, results) => {
            if (err) {
                console.error("Error fetching user feedback:", err);
                return res.status(500).json({ message: "Server Error", error: err });
            }
            res.status(200).json(results);
        });
    } catch (error) {
        console.error("General error in getUserFeedback:", error);
        res.status(500).json({ message: "Server Error", error });
    }
};

// Get feedback by ID
exports.getFeedbackById = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: "Unauthorized: User not found in request" });
        }

        const { feedbackId } = req.params;
        const db = req.db;

        const query = `
            SELECT 
                f.*,
                u.first_name,
                u.last_name
            FROM feedback f
            JOIN user u ON f.user_id = u.user_id
            WHERE f.feedback_id = ?
        `;
        
        db.execute(query, [feedbackId], (err, results) => {
            if (err) {
                console.error("Error fetching feedback:", err);
                return res.status(500).json({ message: "Server Error", error: err });
            }

            if (results.length === 0) {
                return res.status(404).json({ message: "Feedback not found" });
            }

            // Check if user is admin or the owner of the feedback
            if (req.user.role !== 'admin' && req.user.user_id !== results[0].user_id) {
                return res.status(403).json({ message: "Forbidden: You don't have permission to access this feedback" });
            }

            res.status(200).json(results[0]);
        });
    } catch (error) {
        console.error("General error in getFeedbackById:", error);
        res.status(500).json({ message: "Server Error", error });
    }
};

// Update feedback
exports.updateFeedback = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: "Unauthorized: User not found in request" });
        }

        const { feedbackId } = req.params;
        const { rating, description } = req.body;
        const db = req.db;

        // Check if feedback exists and belongs to the user
        db.execute(
            "SELECT * FROM feedback WHERE feedback_id = ?",
            [feedbackId],
            (feedbackErr, feedbackResults) => {
                if (feedbackErr) {
                    console.error("Error checking feedback:", feedbackErr);
                    return res.status(500).json({ message: "Server Error", error: feedbackErr });
                }

                if (feedbackResults.length === 0) {
                    return res.status(404).json({ message: "Feedback not found" });
                }

                // Check if user is the owner of the feedback
                if (req.user.user_id !== feedbackResults[0].user_id) {
                    return res.status(403).json({ message: "Forbidden: You don't have permission to update this feedback" });
                }

                // Validate rating if provided
                if (rating !== undefined && (rating < 1 || rating > 5)) {
                    return res.status(400).json({ message: "Rating must be between 1 and 5" });
                }

                // Build the update query dynamically based on provided fields
                let updateFields = [];
                let queryParams = [];

                if (rating !== undefined) {
                    updateFields.push("rating = ?");
                    queryParams.push(rating);
                }

                if (description !== undefined) {
                    updateFields.push("description = ?");
                    queryParams.push(description);
                }

                if (updateFields.length === 0) {
                    return res.status(400).json({ message: "No fields to update" });
                }

                // Add feedback_id to query parameters
                queryParams.push(feedbackId);

                const query = `
                    UPDATE feedback
                    SET ${updateFields.join(", ")}
                    WHERE feedback_id = ?
                `;

                db.execute(query, queryParams, (err, results) => {
                    if (err) {
                        console.error("Error updating feedback:", err);
                        return res.status(500).json({ message: "Server Error", error: err });
                    }

                    res.status(200).json({
                        message: "Feedback updated successfully",
                        affectedRows: results.affectedRows
                    });
                });
            }
        );
    } catch (error) {
        console.error("General error in updateFeedback:", error);
        res.status(500).json({ message: "Server Error", error });
    }
};

// Delete feedback
exports.deleteFeedback = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: "Unauthorized: User not found in request" });
        }

        const { feedbackId } = req.params;
        const db = req.db;

        // Check if feedback exists
        db.execute(
            "SELECT * FROM feedback WHERE feedback_id = ?",
            [feedbackId],
            (feedbackErr, feedbackResults) => {
                if (feedbackErr) {
                    console.error("Error checking feedback:", feedbackErr);
                    return res.status(500).json({ message: "Server Error", error: feedbackErr });
                }

                if (feedbackResults.length === 0) {
                    return res.status(404).json({ message: "Feedback not found" });
                }

                // Check if user is admin or the owner of the feedback
                if (req.user.role !== 'admin' && req.user.user_id !== feedbackResults[0].user_id) {
                    return res.status(403).json({ message: "Forbidden: You don't have permission to delete this feedback" });
                }

                // Delete the feedback
                db.execute(
                    "DELETE FROM feedback WHERE feedback_id = ?",
                    [feedbackId],
                    (err, results) => {
                        if (err) {
                            console.error("Error deleting feedback:", err);
                            return res.status(500).json({ message: "Server Error", error: err });
                        }

                        res.status(200).json({
                            message: "Feedback deleted successfully",
                            affectedRows: results.affectedRows
                        });
                    }
                );
            }
        );
    } catch (error) {
        console.error("General error in deleteFeedback:", error);
        res.status(500).json({ message: "Server Error", error });
    }
};

// Get feedback statistics
exports.getFeedbackStats = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: "Unauthorized: User not found in request" });
        }

        // Check if user is admin
        if (req.user.role !== 'admin') {
            return res.status(403).json({ message: "Forbidden: Admin access required" });
        }

        const db = req.db;
        
        const query = `
            SELECT 
                COUNT(*) as total_feedback,
                AVG(rating) as average_rating,
                COUNT(CASE WHEN rating = 5 THEN 1 END) as five_star,
                COUNT(CASE WHEN rating = 4 THEN 1 END) as four_star,
                COUNT(CASE WHEN rating = 3 THEN 1 END) as three_star,
                COUNT(CASE WHEN rating = 2 THEN 1 END) as two_star,
                COUNT(CASE WHEN rating = 1 THEN 1 END) as one_star
            FROM feedback
        `;
        
        db.execute(query, (err, results) => {
            if (err) {
                console.error("Error fetching feedback statistics:", err);
                return res.status(500).json({ message: "Server Error", error: err });
            }
            
            const stats = results[0];
            // Calculate percentages
            const total = parseInt(stats.total_feedback) || 0;
            
            if (total > 0) {
                stats.five_star_percent = (stats.five_star / total * 100).toFixed(1);
                stats.four_star_percent = (stats.four_star / total * 100).toFixed(1);
                stats.three_star_percent = (stats.three_star / total * 100).toFixed(1);
                stats.two_star_percent = (stats.two_star / total * 100).toFixed(1);
                stats.one_star_percent = (stats.one_star / total * 100).toFixed(1);
                stats.average_rating = parseFloat(stats.average_rating).toFixed(1);
            } else {
                stats.five_star_percent = "0.0";
                stats.four_star_percent = "0.0";
                stats.three_star_percent = "0.0";
                stats.two_star_percent = "0.0";
                stats.one_star_percent = "0.0";
                stats.average_rating = "0.0";
            }
            
            res.status(200).json(stats);
        });
    } catch (error) {
        console.error("General error in getFeedbackStats:", error);
        res.status(500).json({ message: "Server Error", error });
    }
}; 