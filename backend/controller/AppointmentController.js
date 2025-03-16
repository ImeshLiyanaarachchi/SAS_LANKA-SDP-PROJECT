require("dotenv").config();

// Create appointment (Customer only)
exports.createAppointment = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: "Unauthorized: User not found in request" });
        }

        // Check if user is a customer
        if (req.user.role !== 'customer') {
            return res.status(403).json({ message: "Forbidden: Only customers can create appointments" });
        }

        const {
            vehicle_number,
            service_type,
            status_
        } = req.body;

        const db = req.db;

        // Insert appointment
        db.execute(
            `INSERT INTO appointment (
                user_id, vehicle_number, service_type, status_
            ) VALUES (?, ?, ?, ?)`,
            [req.user.user_id, vehicle_number, service_type, status_],
            (err, result) => {
                if (err) return res.status(500).json({ message: "Server Error", error: err });
                res.status(201).json({ 
                    message: "✅ Appointment created successfully",
                    appointment_id: result.insertId
                });
            }
        );
    } catch (error) {
        console.error("Create Appointment Error:", error);
        res.status(500).json({ message: "Server Error", error });
    }
};

// Get all appointments (Admin only)
exports.getAllAppointments = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: "Unauthorized: User not found in request" });
        }

        // Check if user is admin
        if (req.user.role !== 'admin') {
            return res.status(403).json({ message: "Forbidden: Only admin can view all appointments" });
        }

        const db = req.db;
        db.execute(
            `SELECT a.*, 
                    u.first_name as user_first_name, u.last_name as user_last_name,
                    t.first_name as tech_first_name, t.last_name as tech_last_name,
                    vp.make, vp.model
             FROM appointment a
             JOIN user u ON a.user_id = u.user_id
             LEFT JOIN user t ON a.updated_by = t.user_id
             JOIN vehicle_profile vp ON a.vehicle_number = vp.vehicle_number
             ORDER BY a.appointment_id DESC`,
            (err, results) => {
                if (err) return res.status(500).json({ message: "Server Error", error: err });
                res.status(200).json(results);
            }
        );
    } catch (error) {
        res.status(500).json({ message: "Server Error", error });
    }
};

// Get appointments by user ID
exports.getAppointmentsByUserId = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: "Unauthorized: User not found in request" });
        }

        const { userId } = req.params;
        
        // Check if user is admin or requesting their own appointments
        if (req.user.role !== 'admin' && userId !== req.user.user_id) {
            return res.status(403).json({ message: "Forbidden: You can only view your own appointments" });
        }

        const db = req.db;
        db.execute(
            `SELECT a.*, 
                    t.first_name as tech_first_name, t.last_name as tech_last_name,
                    vp.make, vp.model
             FROM appointment a
             LEFT JOIN user t ON a.updated_by = t.user_id
             JOIN vehicle_profile vp ON a.vehicle_number = vp.vehicle_number
             WHERE a.user_id = ?
             ORDER BY a.appointment_id DESC`,
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

// Update appointment status (Technician or Admin only)
exports.updateAppointmentStatus = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: "Unauthorized: User not found in request" });
        }

        // Check if user is technician or admin
        if (req.user.role !== 'technician' && req.user.role !== 'admin') {
            return res.status(403).json({ message: "Forbidden: Only technicians and admin can update appointment status" });
        }

        const { appointmentId } = req.params;
        const { status_ } = req.body;

        const db = req.db;

        // Check if appointment exists
        db.execute("SELECT * FROM appointment WHERE appointment_id = ?", [appointmentId], (err, results) => {
            if (err) return res.status(500).json({ message: "Server Error", error: err });

            if (results.length === 0) {
                return res.status(404).json({ message: "❌ Appointment not found" });
            }

            // Update appointment status
            db.execute(
                `UPDATE appointment 
                 SET status_ = ?, updated_by = ?, status_updated_at = CURRENT_TIMESTAMP
                 WHERE appointment_id = ?`,
                [status_, req.user.user_id, appointmentId],
                (err, result) => {
                    if (err) return res.status(500).json({ message: "Server Error", error: err });
                    res.status(200).json({ message: "✅ Appointment status updated successfully" });
                }
            );
        });
    } catch (error) {
        res.status(500).json({ message: "Server Error", error });
    }
};

// Delete appointment (Admin only)
exports.deleteAppointment = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: "Unauthorized: User not found in request" });
        }

        // Check if user is admin
        if (req.user.role !== 'admin') {
            return res.status(403).json({ message: "Forbidden: Only admin can delete appointments" });
        }

        const { appointmentId } = req.params;
        const db = req.db;

        // Check if appointment exists
        db.execute("SELECT * FROM appointment WHERE appointment_id = ?", [appointmentId], (err, results) => {
            if (err) return res.status(500).json({ message: "Server Error", error: err });

            if (results.length === 0) {
                return res.status(404).json({ message: "❌ Appointment not found" });
            }

            // Delete appointment
            db.execute(
                "DELETE FROM appointment WHERE appointment_id = ?",
                [appointmentId],
                (err, result) => {
                    if (err) return res.status(500).json({ message: "Server Error", error: err });
                    res.status(200).json({ message: "✅ Appointment deleted successfully" });
                }
            );
        });
    } catch (error) {
        res.status(500).json({ message: "Server Error", error });
    }
}; 