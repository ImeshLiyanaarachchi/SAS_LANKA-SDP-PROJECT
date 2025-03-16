const Feedback = require("../model/Feedback");
require("dotenv").config();

// ✅ Create new feedback (Auto-Increment `feedback_id`)
exports.createFeedback = async (req, res) => {
    try {
        console.log("🔹 Inside createFeedback function");
        console.log("🔹 Received user from token:", req.user);

        if (!req.user) {
            return res.status(401).json({ message: "Unauthorized: User not found in request" });
        }

        const { comment_, star_rating } = req.body;  // ✅ Removed `feedback_id`
        const user_id = req.user.user_id;
        const db = req.db;

        // Validate star rating
        if (star_rating < 1 || star_rating > 5) {
            return res.status(400).json({ message: "Star rating must be between 1 and 5" });
        }

        // ✅ Insert feedback WITHOUT `feedback_id`
        db.execute(
            "INSERT INTO feedback (user_id, comment_, star_rating) VALUES (?, ?, ?)",
            [user_id, comment_, star_rating],
            (err, result) => {
                if (err) return res.status(500).json({ message: "Server Error", error: err });

                res.status(201).json({ message: "✅ Feedback submitted successfully", feedback_id: result.insertId });
            }
        );
    } catch (error) {
        console.error("Create Feedback Error:", error);
        res.status(500).json({ message: "Server Error", error });
    }
};

// ✅ Get all feedback
exports.getAllFeedback = async (req, res) => {
    try {
        const db = req.db;
        db.execute(
            `SELECT f.*, u.first_name, u.last_name 
             FROM feedback f 
             JOIN user u ON f.user_id = u.user_id`,
            (err, results) => {
                if (err) return res.status(500).json({ message: "Server Error", error: err });
                res.status(200).json(results);
            }
        );
    } catch (error) {
        res.status(500).json({ message: "Server Error", error });
    }
};

// ✅ Get feedback by ID
exports.getFeedbackById = async (req, res) => {
    try {
        const { id } = req.params;
        const db = req.db;
        
        db.execute(
            `SELECT f.*, u.first_name, u.last_name 
             FROM feedback f 
             JOIN user u ON f.user_id = u.user_id 
             WHERE f.feedback_id = ?`,
            [id],
            (err, results) => {
                if (err) return res.status(500).json({ message: "Server Error", error: err });
                
                if (results.length === 0) {
                    return res.status(404).json({ message: "❌ Feedback not found" });
                }
                
                res.status(200).json(results[0]);
            }
        );
    } catch (error) {
        res.status(500).json({ message: "Server Error", error });
    }
};

// ✅ Get feedback by user ID
exports.getFeedbackByUserId = async (req, res) => {
    try {
        const { userId } = req.params;
        const db = req.db;
        
        db.execute(
            `SELECT f.*, u.first_name, u.last_name 
             FROM feedback f 
             JOIN user u ON f.user_id = u.user_id 
             WHERE f.user_id = ?`,
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

// ✅ Update feedback
exports.updateFeedback = async (req, res) => {
    try {
        const { id } = req.params;
        const { comment_, star_rating } = req.body;
        const db = req.db;

        // Validate star rating
        if (star_rating < 1 || star_rating > 5) {
            return res.status(400).json({ message: "Star rating must be between 1 and 5" });
        }

        // Check if feedback exists
        db.execute("SELECT * FROM feedback WHERE feedback_id = ?", [id], (err, results) => {
            if (err) return res.status(500).json({ message: "Server Error", error: err });

            if (results.length === 0) {
                return res.status(404).json({ message: "❌ Feedback not found" });
            }

            // Update feedback
            db.execute(
                "UPDATE feedback SET comment_ = ?, star_rating = ? WHERE feedback_id = ?",
                [comment_, star_rating, id],
                (err, result) => {
                    if (err) return res.status(500).json({ message: "Server Error", error: err });
                    res.status(200).json({ message: "✅ Feedback updated successfully" });
                }
            );
        });
    } catch (error) {
        res.status(500).json({ message: "Server Error", error });
    }
};

// ✅ Delete feedback
exports.deleteFeedback = async (req, res) => {
    try {
        const { id } = req.params;
        const db = req.db;

        // Check if feedback exists
        db.execute("SELECT * FROM feedback WHERE feedback_id = ?", [id], (err, results) => {
            if (err) return res.status(500).json({ message: "Server Error", error: err });

            if (results.length === 0) {
                return res.status(404).json({ message: "❌ Feedback not found" });
            }

            // Delete feedback
            db.execute(
                "DELETE FROM feedback WHERE feedback_id = ?",
                [id],
                (err, result) => {
                    if (err) return res.status(500).json({ message: "Server Error", error: err });
                    res.status(200).json({ message: "✅ Feedback deleted successfully" });
                }
            );
        });
    } catch (error) {
        res.status(500).json({ message: "Server Error", error });
    }
};
