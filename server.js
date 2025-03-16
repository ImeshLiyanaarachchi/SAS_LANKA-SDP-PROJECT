const express = require("express");
require("dotenv").config(); // Load environment variables
const mysql = require("mysql2");
const cookieParser = require('cookie-parser');

const userRoutes = require("./backend/route/UserRoutes");
const feedbackRoutes = require("./backend/route/FeedbackRoutes");
const inquiryRoutes = require("./backend/route/InquiryRoutes");
const vehicleProfileRoutes = require("./backend/route/VehicleProfileRoutes");
const serviceRecordRoutes = require("./backend/route/ServiceRecordRoutes");
const appointmentRoutes = require("./backend/route/AppointmentRoutes");
const purchaseRoutes = require("./backend/route/PurchaseRoutes");
const stockRoutes = require("./backend/route/StockRoutes");
const inventoryItemRoutes = require("./backend/route/InventoryItemRoutes");

// ✅ Create Express App
const app = express();
app.use(express.json()); // Middleware for JSON parsing
app.use(cookieParser());
app.use(express.urlencoded({ extended: true })); // ✅ Enables parsing of form data

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

// ✅ Mount routes
app.use("/api/users", userRoutes);
app.use("/api/feedback", feedbackRoutes);
app.use("/api/inquiries", inquiryRoutes);
app.use("/api/vehicle-profiles", vehicleProfileRoutes);
app.use("/api/service-records", serviceRecordRoutes);
app.use("/api/purchases", purchaseRoutes);
app.use("/api/stock", stockRoutes);
app.use("/api/inventory-items", inventoryItemRoutes);
app.use("/api/appointments", appointmentRoutes);

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
