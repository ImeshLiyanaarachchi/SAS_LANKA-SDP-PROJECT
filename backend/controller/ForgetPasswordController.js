const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const nodemailer = require('nodemailer');
const crypto = require('crypto');
require("dotenv").config();

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

// Request password reset
exports.requestPasswordReset = async (req, res) => {
  try {
    const { email } = req.body;
    const db = req.db;

    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    // Check if user exists
    db.execute("SELECT * FROM user WHERE email = ?", [email], async (err, users) => {
      if (err) return res.status(500).json({ message: "Server Error", error: err });

      if (users.length === 0) {
        // Don't reveal that the user doesn't exist for security reasons
        return res.status(200).json({ 
          message: "If your email is registered, you will receive a verification code" 
        });
      }

      const user = users[0];
      
      // Generate 6-digit verification code
      const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
      const resetTokenExpiry = new Date(Date.now() + 3600000); // 1 hour from now
      
      // Store code in database
      db.execute(
        "UPDATE user SET reset_token = ?, reset_token_expiry = ? WHERE user_id = ?",
        [verificationCode, resetTokenExpiry, user.user_id],
        async (err, result) => {
          if (err) return res.status(500).json({ message: "Server Error", error: err });

          // Send email with verification code
          try {
            await transporter.sendMail({
              from: `"SAS LANKA" <${process.env.EMAIL_USER}>`,
              to: user.email,
              subject: 'Password Reset Verification Code',
              html: `
                <h1>Password Reset Verification Code</h1>
                <p>Hi ${user.first_name},</p>
                <p>You requested a password reset. Please use the verification code below:</p>
                <h2 style="font-size: 24px; padding: 10px; background-color: #f0f0f0; border-radius: 5px; text-align: center;">${verificationCode}</h2>
                <p>This code will expire in 1 hour.</p>
                <p>If you didn't request this, please ignore this email.</p>
                <p>Thanks,<br/>SAS LANKA Team</p>
              `
            });

            res.status(200).json({ 
              message: "If your email is registered, you will receive a verification code",
              email: email
            });
          } catch (error) {
            console.error('Error sending email:', error);
            res.status(500).json({ message: "Failed to send verification code email", error: error.message });
          }
        }
      );
    });
  } catch (error) {
    console.error("Password Reset Request Error:", error);
    res.status(500).json({ message: "Server Error", error });
  }
};

// Verify code and allow password reset
exports.verifyCode = async (req, res) => {
  try {
    const { email, code } = req.body;
    const db = req.db;

    if (!email || !code) {
      return res.status(400).json({ message: "Email and verification code are required" });
    }

    // Find user with the code and check if code is expired
    db.execute(
      "SELECT * FROM user WHERE email = ? AND reset_token = ? AND reset_token_expiry > ?",
      [email, code, new Date()],
      async (err, users) => {
        if (err) return res.status(500).json({ message: "Server Error", error: err });

        if (users.length === 0) {
          return res.status(400).json({ message: "Invalid or expired verification code" });
        }

        // Code is valid
        res.status(200).json({ 
          message: "Verification code is valid",
          verified: true
        });
      }
    );
  } catch (error) {
    console.error("Code Verification Error:", error);
    res.status(500).json({ message: "Server Error", error });
  }
};

// Reset password with verified email and code
exports.resetPassword = async (req, res) => {
  try {
    const { email, code, password } = req.body;
    const db = req.db;

    if (!email || !code || !password) {
      return res.status(400).json({ message: "Email, verification code and password are required" });
    }

    // Find user with the code and check if code is expired
    db.execute(
      "SELECT * FROM user WHERE email = ? AND reset_token = ? AND reset_token_expiry > ?",
      [email, code, new Date()],
      async (err, users) => {
        if (err) return res.status(500).json({ message: "Server Error", error: err });

        if (users.length === 0) {
          return res.status(400).json({ message: "Invalid or expired verification code" });
        }

        const user = users[0];

        // Hash the new password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Update user's password and clear reset token fields
        db.execute(
          "UPDATE user SET password = ?, reset_token = NULL, reset_token_expiry = NULL WHERE user_id = ?",
          [hashedPassword, user.user_id],
          (err, result) => {
            if (err) return res.status(500).json({ message: "Server Error", error: err });

            res.status(200).json({ message: "Password has been reset successfully" });
          }
        );
      }
    );
  } catch (error) {
    console.error("Password Reset Error:", error);
    res.status(500).json({ message: "Server Error", error });
  }
}; 