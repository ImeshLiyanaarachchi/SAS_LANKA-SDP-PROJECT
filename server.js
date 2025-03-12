require('dotenv').config(); // Load environment variables
const mysql = require('mysql2');

// Create a MySQL connection
const connection = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT
});

// Connect to MySQL
connection.connect((err) => {
    if (err) {
        console.error('Error connecting to MySQL:', err);
        return;
    }
    console.log('Connected to MySQL Database');
});

// Close the connection when the app exits
process.on('SIGINT', () => {
    connection.end((err) => {
        if (err) console.log('Error closing MySQL connection:', err);
        console.log('MySQL connection closed.');
        process.exit();
    });
});