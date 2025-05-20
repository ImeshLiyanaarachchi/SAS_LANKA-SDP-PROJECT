const express = require("express");
require("dotenv").config(); // Load environment variables
const mysql = require("mysql2");
const cookieParser = require('cookie-parser');
const cors = require('cors');



const userRoutes = require("./route/UserRoutes");
const inventoryItemRoutes = require("./route/InventoryItemRoutes");
const purchaseRoutes = require("./route/PurchaseRoutes");
const inventoryReleaseRoutes = require("./route/InventoryReleaseRoutes");
const serviceRecordRoutes = require("./route/ServiceRecordRoutes");
const vehicleProfileRoutes = require("./route/VehicleProfileRoutes");
const invoiceRoutes = require("./route/InvoiceRoutes");
const customServiceRecordRoutes = require("./route/CustomServiceRecordRoutes");
const appointmentRoutes = require("./route/AppointmentRoutes");
const serviceTypeRoutes = require("./route/ServiceTypeRoutes");
const serviceReminderRoutes = require("./route/ServiceReminderRoutes");
const serviceRoutes = require("./route/ServiceRoutes");
const promotionRoutes = require("./route/PromotionRoutes");
const feedbackRoutes = require("./route/FeedbackRoutes");
const inquiryRoutes = require("./route/InquiryRoutes");
const passwordResetRoutes = require("./route/PasswordResetRoutes");
const { scheduleServiceReminders } = require("./scheduler/serviceReminderScheduler");




// ✅ Create Express App
const app = express();
app.use(express.json()); // Middleware for JSON parsing
app.use(cookieParser());
app.use(express.urlencoded({ extended: true })); // ✅ Enables parsing of form data

// Enable CORS for all routes
app.use(cors({
    origin: 'http://localhost:5173', // Your frontend URL
    credentials: true // Allow cookies if you're using them
  }));


// ✅ Create a MySQL connection
const connection = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT
});

// ✅ Connect to MySQL
connection.connect((err) => {
    if (err) {
        console.error("Error connecting to MySQL:", err);
        return;
    }
    console.log("Connected to MySQL Database");
});

// ✅ Pass `connection` to routes
app.use((req, res, next) => {
    req.db = connection;
    next();
});


app.use("/api/users", userRoutes);
app.use("/api/inventory-items", inventoryItemRoutes);
app.use("/api/purchases", purchaseRoutes);
app.use("/api/inventory-releases", inventoryReleaseRoutes);
app.use("/api/service-records", serviceRecordRoutes);
app.use("/api/vehicle-profiles", vehicleProfileRoutes);
app.use("/api/invoices", invoiceRoutes);
app.use("/api/custom-service-records", customServiceRecordRoutes);
app.use("/api/appointments", appointmentRoutes);
app.use("/api/service-types", serviceTypeRoutes);
app.use("/api/service-reminders", serviceReminderRoutes);
app.use("/api/services", serviceRoutes);
app.use("/api/promotions", promotionRoutes);
app.use("/api/feedback", feedbackRoutes);
app.use("/api/inquiries", inquiryRoutes);
app.use("/api/password", passwordResetRoutes);

// Initialize the service reminder scheduler
scheduleServiceReminders();

// ✅ Close the connection when the app exits
process.on("SIGINT", () => {
    connection.end((err) => {
        if (err) console.log("Error closing MySQL connection:", err);
        console.log("MySQL connection closed.");
        process.exit();
    });
});

// ✅ Start Server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
}); 