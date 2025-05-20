const mysql = require('mysql2/promise');
const nodemailer = require('nodemailer');
require('dotenv').config();

// Create nodemailer transporter
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  },
  tls: {
    rejectUnauthorized: false   // ADD THIS to ignore SSL self-signed errors
  }
});

// Get users due for service on a specific date
exports.getUsersDueForService = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized: User not found in request" });
    }

    // Check if user is admin
    if (req.user.role !== 'admin' && req.user.role !== 'technician') {
      return res.status(403).json({ message: "Forbidden: Only admin can access service reminders" });
    }

    const { daysFromNow } = req.query;
    const interval = daysFromNow || 14; // Default to 14 days if not provided
    
    const db = req.db;
    
    
    const query = `
      SELECT u.user_id, u.email, u.first_name, u.last_name, v.vehicle_number, s.next_service_date
      FROM user u
      JOIN vehicle_profile v ON u.user_id = v.user_id
      JOIN (
          SELECT sr1.*
          FROM service_record sr1
          INNER JOIN (
              SELECT vehicle_number, MAX(date_) AS max_date
              FROM service_record
              WHERE next_service_date IS NOT NULL
              GROUP BY vehicle_number
          ) sr2 ON sr1.vehicle_number = sr2.vehicle_number AND sr1.date_ = sr2.max_date
      ) s ON v.vehicle_number = s.vehicle_number
      WHERE s.next_service_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL ? DAY)
    `;
    
    const [rows] = await db.promise().query(query, [parseInt(interval)]);
    
    // Debug
    console.log(`Found ${rows.length} service records`);
    if (rows.length > 0) {
      console.log('Sample record:', rows[0]);
    }
    
    res.status(200).json({
      success: true,
      count: rows.length,
      data: rows
    });
  } catch (error) {
    console.error('Error getting users due for service:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve users due for service',
      error: error.message
    });
  }
};

// Send reminder emails to users
exports.sendServiceReminders = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized: User not found in request" });
    }

    // Check if user is admin
    if (req.user.role !== 'admin' && req.user.role !== 'technician') {
      return res.status(403).json({ message: "Forbidden: Only admin can send service reminders" });
    }

    const { userIds } = req.body;
    const db = req.db;
    
    // If userIds is provided, filter by those users, otherwise get all users due in 14 days
    let query = `
      SELECT u.user_id, u.email, u.first_name, u.last_name, v.vehicle_number, s.next_service_date
      FROM user u
      JOIN vehicle_profile v ON u.user_id = v.user_id
      JOIN (
          SELECT sr1.*
          FROM service_record sr1
          INNER JOIN (
              SELECT vehicle_number, MAX(date_) AS max_date
              FROM service_record
              WHERE next_service_date IS NOT NULL
              GROUP BY vehicle_number
          ) sr2 ON sr1.vehicle_number = sr2.vehicle_number AND sr1.date_ = sr2.max_date
      ) s ON v.vehicle_number = s.vehicle_number
      WHERE s.next_service_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 14 DAY)
    `;
    
    // If specific userIds are provided, add a filter
    const params = [];
    if (userIds && userIds.length > 0) {
      query += ' AND u.user_id IN (?)';
      params.push(userIds);
    }
    
    const [rows] = await db.promise().query(query, params);
    
    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No users found for service reminders'
      });
    }
    
    // Send emails to each user
    const emailPromises = rows.map(user => {
      return transporter.sendMail({
        from: `"Service Reminder" <${process.env.EMAIL_USER}>`,
        to: user.email,
        subject: 'Upcoming Vehicle Service Reminder',
        html: `<p>Hi ${user.first_name},</p>
               <p>This is a reminder that your vehicle <strong>${user.vehicle_number}</strong> is due for its next service on <strong>${new Date(user.next_service_date).toLocaleDateString()}</strong>.</p>
               <p>Please schedule an appointment soon.</p>
               <p>Thanks,<br/>Your Service Team</p>`
      });
    });
    
    await Promise.all(emailPromises);
    
    res.status(200).json({
      success: true,
      message: "Service reminder emails sent successfully",
      count: rows.length
    });
  } catch (error) {
    console.error('Error sending service reminders:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send service reminder emails',
      error: error.message
    });
  }
};

// Send custom emails to selected users
exports.sendCustomEmails = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized: User not found in request" });
    }

    // Check if user is admin
    if (req.user.role !== 'admin' && req.user.role !== 'technician') {
      return res.status(403).json({ message: "Forbidden: Only admin can send custom emails" });
    }

    const { userIds, emailSubject, emailBody } = req.body;

    // Validate required fields
    if (!userIds || !userIds.length) {
      return res.status(400).json({
        success: false,
        message: 'Please select at least one user to send emails'
      });
    }

    if (!emailSubject || !emailBody) {
      return res.status(400).json({
        success: false,
        message: 'Email subject and body are required'
      });
    }

    const db = req.db;
    
    // Get user details for the selected users
    const [users] = await db.promise().query(
      `SELECT user_id, email, first_name, last_name FROM user WHERE user_id IN (?)`,
      [userIds]
    );
    
    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No users found with the provided IDs'
      });
    }
    
    // Send custom emails to each user
    const emailPromises = users.map(user => {
      // Replace placeholders in the email body with user details
      let personalizedBody = emailBody
        .replace(/{{first_name}}/g, user.first_name)
        .replace(/{{last_name}}/g, user.last_name)
        .replace(/{{email}}/g, user.email);
      
      return transporter.sendMail({
        from: `"Service Notification" <${process.env.EMAIL_USER}>`,
        to: user.email,
        subject: emailSubject,
        html: personalizedBody
      });
    });
    
    await Promise.all(emailPromises);
    
    res.status(200).json({
      success: true,
      message: "Custom emails sent successfully",
      count: users.length
    });
  } catch (error) {
    console.error('Error sending custom emails:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send custom emails',
      error: error.message
    });
  }
}; 