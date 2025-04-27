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
            phone_number,
            appointment_date,
            appointment_time,
            status_ = 'Pending'  // Default status
        } = req.body;

        // Validate appointment date
        const currentDate = new Date();
        const selectedDate = new Date(appointment_date);
        
        if (selectedDate < currentDate.setHours(0,0,0,0)) {
            return res.status(400).json({ 
                message: "Invalid date. Appointment date must be today or a future date." 
            });
        }

        // Validate time slot format
        const validTimeSlots = ['08:00', '09:30', '11:00', '12:30', '14:00', '15:30'];
        if (!validTimeSlots.includes(appointment_time)) {
            return res.status(400).json({ 
                message: "Invalid time slot. Available slots are: 8:00 AM, 9:30 AM, 11:00 AM, 12:30 PM, 2:00 PM, 3:30 PM" 
            });
        }

        const db = req.db;

        // Check if the time slot is already booked for the selected date
        db.execute(
            `SELECT COUNT(*) as count 
             FROM appointment 
             WHERE appointment_date = ? 
             AND appointment_time = ?
             AND status_ != 'Cancelled'`,
            [appointment_date, appointment_time],
            (err, results) => {
                if (err) return res.status(500).json({ message: "Server Error", error: err });

                if (results[0].count > 0) {
                    return res.status(400).json({ 
                        message: "This time slot is already booked. Please select a different time." 
                    });
                }

                // If time slot is available, create the appointment
                db.execute(
                    `INSERT INTO appointment (
                        user_id, vehicle_number, service_type, phone_number, status_,
                        appointment_date, appointment_time
                    ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
                    [
                        req.user.user_id,
                        vehicle_number,
                        service_type,
                        phone_number || req.user.phone_number, // Use provided phone number or user's phone number
                        status_,
                        appointment_date,
                        appointment_time
                    ],
                    (err, result) => {
                        if (err) return res.status(500).json({ message: "Server Error", error: err });
                        res.status(201).json({ 
                            message: "✅ Appointment created successfully",
                            appointment_id: result.insertId
                        });
                    }
                );
            }
        );
    } catch (error) {
        console.error("Create Appointment Error:", error);
        res.status(500).json({ message: "Server Error", error });
    }
};

// Get all appointments (Admin only and service technician)
exports.getAllAppointments = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: "Unauthorized: User not found in request" });
        }

        // Check if user is admin
        if (req.user.role !== 'technician' && req.user.role !== 'admin') {
            return res.status(403).json({ message: "Forbidden: Only admin or techata withrai can view all appointments" });
        }

        const db = req.db;
        db.execute(
            `SELECT 
                a.appointment_id,
                a.vehicle_number,
                a.service_type,
                a.status_,
                a.status_updated_at,
                a.appointment_date,
                a.appointment_time,
                CONCAT(u.first_name, ' ', u.last_name) as customer_name,
                u.phone_number as customer_phone
             FROM appointment a
             JOIN user u ON a.user_id = u.user_id
             ORDER BY a.appointment_id DESC`,
            (err, results) => {
                if (err) {
                    console.error("SQL Error:", err);
                    return res.status(500).json({ message: "Server Error", error: err });
                }
                
                // Format dates to ensure proper display
                const formattedResults = results.map(appointment => ({
                    ...appointment,
                    appointment_date: appointment.appointment_date ? new Date(appointment.appointment_date).toISOString().split('T')[0] : null
                }));
                
                res.status(200).json(formattedResults);
            }
        );
    } catch (error) {
        console.error("Error in getAllAppointments:", error);
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
        if (req.user.role !== 'admin' && parseInt(userId) !== req.user.user_id) {
            return res.status(403).json({ message: "Forbidden: You can only view your own appointments" });
        }

        const db = req.db;
        db.execute(
            `SELECT * FROM appointment WHERE user_id = ? ORDER BY appointment_id DESC`,
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

// Update appointment status (no updated_by tracking)
exports.updateAppointmentStatus = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: "Unauthorized: User not found in request" });
        }

        const { appointmentId } = req.params;
        const { status_ } = req.body;
        
        if (!status_) {
            return res.status(400).json({ message: "Status field is required" });
        }

        // Validate status value against ENUM values
        const validStatuses = ['Pending', 'Confirmed'];
        if (!validStatuses.includes(status_)) {
            return res.status(400).json({ 
                message: `Invalid status value. Valid values are: ${validStatuses.join(', ')}` 
            });
        }

        const db = req.db;

        // First, check if appointment exists
        db.execute(
            "SELECT * FROM appointment WHERE appointment_id = ?",
            [appointmentId],
            (err, results) => {
                if (err) {
                    console.error("DB Error when checking appointment existence:", err);
                    return res.status(500).json({ message: "Server Error", error: err.message });
                }

                if (results.length === 0) {
                    return res.status(404).json({ message: "❌ Appointment not found" });
                }

                const originalStatus = results[0].status_;

                // Update appointment status (status_updated_at will update automatically via ON UPDATE)
                db.execute(
                    `UPDATE appointment 
                     SET status_ = ?
                     WHERE appointment_id = ?`,
                    [status_, appointmentId],
                    (err, result) => {
                        if (err) {
                            console.error("DB Error when updating appointment status:", err);
                            return res.status(500).json({ message: "Server Error", error: err.message });
                        }

                        // Special handling for "Cancelled" status if needed in the future
                        // Currently the schema only supports Pending and Confirmed

                        res.status(200).json({
                            message: "✅ Appointment status updated successfully",
                            new_status: status_,
                            previous_status: originalStatus
                        });
                    }
                );
            }
        );
    } catch (error) {
        console.error("Update Appointment Status Error:", error);
        res.status(500).json({ message: "Server Error", error: error.message });
    }
};

// Delete appointment (Admin only)
exports.deleteAppointment = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: "Unauthorized: User not found in request" });
        }

        // Check if user is admin
        if (req.user.role !== 'technician' && req.user.role !== 'admin') {
            return res.status(403).json({ message: "Forbidden: Only admin can delete appointments" });
        }

        const { appointmentId } = req.params;
        const db = req.db;

        // Check if appointment exists and get its details before deletion
        db.execute("SELECT * FROM appointment WHERE appointment_id = ?", [appointmentId], (err, results) => {
            if (err) return res.status(500).json({ message: "Server Error", error: err });

            if (results.length === 0) {
                return res.status(404).json({ message: "❌ Appointment not found" });
            }

            // Store appointment details for logging/audit purposes
            const appointmentToDelete = results[0];
            console.log(`Deleting appointment: ${appointmentId}`, appointmentToDelete);

            // Delete appointment - this automatically releases the time slot
            db.execute(
                "DELETE FROM appointment WHERE appointment_id = ?",
                [appointmentId],
                (err, result) => {
                    if (err) return res.status(500).json({ message: "Server Error", error: err });
                    
                    // The time slot is now available for booking
                    res.status(200).json({ 
                        message: "✅ Appointment deleted successfully",
                        info: "The time slot has been released and is now available for booking."
                    });
                }
            );
        });
    } catch (error) {
        res.status(500).json({ message: "Server Error", error });
    }
};

// Get available time slots for a specific date
exports.getAvailableTimeSlots = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: "Unauthorized: User not found in request" });
        }

        const { date } = req.params;
        const allTimeSlots = ['08:00', '09:30', '11:00', '12:30', '14:00', '15:30'];

        // Validate date format
        if (!date.match(/^\d{4}-\d{2}-\d{2}$/)) {
            return res.status(400).json({ message: "Invalid date format. Use YYYY-MM-DD" });
        }

        // Check if date is not in the past
        const selectedDate = new Date(date);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        if (selectedDate < today) {
            return res.status(400).json({ message: "Cannot check availability for past dates" });
        }

        const db = req.db;
        db.execute(
            `SELECT appointment_time 
             FROM appointment 
             WHERE appointment_date = ?
             AND status_ != 'Cancelled'`,
            [date],
            (err, results) => {
                if (err) return res.status(500).json({ message: "Server Error", error: err });

                // Get booked time slots
                const bookedSlots = results.map(row => row.appointment_time);
                
                // Filter out booked slots to get available slots
                const availableSlots = allTimeSlots.filter(slot => !bookedSlots.includes(slot));

                // If the date is today, filter out past time slots
                if (selectedDate.toDateString() === new Date().toDateString()) {
                    const currentHour = new Date().getHours();
                    const currentMinutes = new Date().getMinutes();
                    
                    const availableSlotsForToday = availableSlots.filter(slot => {
                        const [hours, minutes] = slot.split(':').map(Number);
                        return (hours > currentHour) || (hours === currentHour && minutes > currentMinutes);
                    });

                    return res.status(200).json({
                        date: date,
                        available_slots: availableSlotsForToday
                    });
                }

                res.status(200).json({
                    date: date,
                    available_slots: availableSlots
                });
            }
        );
    } catch (error) {
        console.error("Get Available Time Slots Error:", error);
        res.status(500).json({ message: "Server Error", error });
    }
};

// Update entire appointment (Technician or Admin only)
exports.updateAppointment = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: "Unauthorized: User not found in request" });
        }

        // Check if user is technician or admin
        if (req.user.role !== 'technician' && req.user.role !== 'admin') {
            return res.status(403).json({ message: "Forbidden: Only technicians and admin can update appointments" });
        }

        const { appointmentId } = req.params;
        const { vehicle_number, service_type, appointment_date, appointment_time, status_ } = req.body;
        
        // Log the received data for debugging
        console.log("Update Appointment Data:", {
            appointmentId,
            vehicle_number,
            service_type,
            appointment_date,
            appointment_time,
            status_
        });

        // Validate that required fields are present
        if (!vehicle_number || !service_type || !status_) {
            return res.status(400).json({ 
                message: "Missing required fields: vehicle_number, service_type, and status_ are required" 
            });
        }

        // Validate status value against ENUM values
        const validStatuses = ['Pending', 'Confirmed'];
        if (!validStatuses.includes(status_)) {
            return res.status(400).json({ 
                message: `Invalid status value. Valid values are: ${validStatuses.join(', ')}` 
            });
        }

        const db = req.db;

        // First, check if appointment exists and get original details
        db.execute(
            "SELECT * FROM appointment WHERE appointment_id = ?",
            [appointmentId],
            (err, results) => {
                if (err) {
                    console.error("DB Error when checking appointment existence:", err); 
                    return res.status(500).json({ message: "Server Error", error: err.message });
                }

                if (results.length === 0) {
                    return res.status(404).json({ message: "❌ Appointment not found" });
                }

                const originalAppointment = results[0];

                // Check if the appointment date or time is being changed
                const isDateTimeChange = 
                    (appointment_date && appointment_date !== originalAppointment.appointment_date) || 
                    (appointment_time && appointment_time !== originalAppointment.appointment_time);

                // If date and time are provided and different from original, check for conflicts
                if (isDateTimeChange) {
                    // Check if the new time slot is available
                    db.execute(
                        `SELECT COUNT(*) as count 
                         FROM appointment 
                         WHERE appointment_date = ? 
                         AND appointment_time = ?
                         AND status_ != 'Cancelled'
                         AND appointment_id != ?`,
                        [appointment_date || originalAppointment.appointment_date, 
                         appointment_time || originalAppointment.appointment_time, 
                         appointmentId],
                        (err, timeResults) => {
                            if (err) {
                                console.error("DB Error when checking time slot availability:", err);
                                return res.status(500).json({ message: "Server Error", error: err.message });
                            }

                            if (timeResults[0].count > 0) {
                                return res.status(400).json({ 
                                    message: "This time slot is already booked. Please select a different time." 
                                });
                            }
                            
                            // If the new time slot is available, proceed with the update
                            updateAppointmentDetails(originalAppointment);
                        }
                    );
                } else {
                    // If no date/time update, proceed directly
                    updateAppointmentDetails(originalAppointment);
                }

                // Helper function to update appointment details
                function updateAppointmentDetails(original) {
                    // Use the original values if new ones are not provided
                    const updatedVehicleNumber = vehicle_number || original.vehicle_number;
                    const updatedServiceType = service_type || original.service_type;
                    const updatedStatus = status_ || original.status_;
                    
                    // For date and time, only update if provided, otherwise keep original
                    const updatedDate = appointment_date || original.appointment_date;
                    const updatedTime = appointment_time || original.appointment_time;

                    // Update appointment with new details
                    db.execute(
                        `UPDATE appointment 
                         SET vehicle_number = ?,
                             service_type = ?,
                             appointment_date = ?,
                             appointment_time = ?,
                             status_ = ?
                         WHERE appointment_id = ?`,
                        [
                            updatedVehicleNumber,
                            updatedServiceType,
                            updatedDate,
                            updatedTime,
                            updatedStatus,
                            appointmentId
                        ],
                        (err, result) => {
                            if (err) {
                                console.error("DB Error when updating appointment:", err);
                                return res.status(500).json({ message: "Server Error", error: err.message });
                            }
                            
                            let responseMessage = "✅ Appointment updated successfully";
                            if (isDateTimeChange) {
                                responseMessage += `. Time slot updated from ${original.appointment_date} ${original.appointment_time} to ${updatedDate} ${updatedTime}`;
                            }
                            
                            res.status(200).json({ 
                                message: responseMessage,
                                status_: updatedStatus,
                                previous_time_slot: isDateTimeChange ? `${original.appointment_date} ${original.appointment_time}` : null,
                                new_time_slot: isDateTimeChange ? `${updatedDate} ${updatedTime}` : null
                            });
                        }
                    );
                }
            }
        );
    } catch (error) {
        console.error("Update Appointment Error:", error);
        res.status(500).json({ message: "Server Error", error: error.message });
    }
}; 