const cron = require('node-cron');
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
    rejectUnauthorized: false
  }
});

// Create database connection pool
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Function to get users due for service
async function getUsersDueForService() {
  try {
    // Get the actual current date
    const currentDate = new Date().toISOString().split('T')[0];
    
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
      WHERE s.next_service_date > CURRENT_DATE()
      AND DATEDIFF(s.next_service_date, CURRENT_DATE()) = 14
      AND NOT EXISTS (
        SELECT 1 
        FROM service_reminder_log 
        WHERE vehicle_number = v.vehicle_number 
        AND next_service_date = s.next_service_date
      )
    `;
    
    // Log the query results for debugging
    const [rows] = await pool.query(query);
    console.log('Query results:', rows);
    console.log('Actual current date:', currentDate);
    console.log('Looking for services due on:', new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
    
    // If we found users, log that we've sent them reminders
    if (rows.length > 0) {
      const logQuery = `
        INSERT INTO service_reminder_log (vehicle_number, next_service_date, sent_date)
        VALUES ?
      `;
      
      const values = rows.map(user => [
        user.vehicle_number,
        user.next_service_date,
        new Date()
      ]);
      
      await pool.query(logQuery, [values]);
    }
    
    return rows;
  } catch (error) {
    console.error('Error getting users due for service:', error);
    return [];
  }
}

// Function to send reminder emails
async function sendServiceReminders(users) {
  try {
    const emailPromises = users.map(user => {
      return transporter.sendMail({
        from: `"Service Reminder" <${process.env.EMAIL_USER}>`,
        to: user.email,
        subject: 'Upcoming Vehicle Service Reminder',
        html: `
          <p>Hi ${user.first_name},</p>
          <p>This is a reminder that your vehicle <strong>${user.vehicle_number}</strong> is due for its next service on <strong>${new Date(user.next_service_date).toLocaleDateString()}</strong>.</p>
          <p>Please schedule an appointment soon to ensure your vehicle's optimal performance.</p>
          <p>You can schedule your appointment through our website or contact our service center directly.</p>
          <p>Thanks,<br/>Your Service Team</p>
        `
      });
    });
    
    await Promise.all(emailPromises);
    console.log(`Successfully sent ${users.length} service reminder emails`);
  } catch (error) {
    console.error('Error sending service reminders:', error);
  }
}

// Schedule the job to run every minute for testing
const scheduleServiceReminders = async () => {
 
  
  cron.schedule('0 10 * * *', async () => {
    console.log('Running automated service reminder check...');
    try {
      const users = await getUsersDueForService();
      if (users.length > 0) {
        console.log(`Found ${users.length} users due for service in exactly 14 days`);
        await sendServiceReminders(users);
      } else {
        console.log('No users due for service found for today\'s reminder');
      }
    } catch (error) {
      console.error('Error in scheduled service reminder:', error);
    }
  }, {
    timezone: "Asia/Colombo" // Set to Sri Lanka timezone
  });
  
  console.log('Service reminder scheduler initialized - running every minute for testing');
};


module.exports = { scheduleServiceReminders }; 