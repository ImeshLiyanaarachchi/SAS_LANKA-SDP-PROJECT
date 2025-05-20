require('dotenv').config();
const mysql = require('mysql2');
const fs = require('fs');
const path = require('path');

// Create connection to database
const db = mysql.createConnection({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'autocare',
  port: process.env.DB_PORT || 3306
});

// Connect to database
db.connect((err) => {
  if (err) {
    console.error('Error connecting to database:', err);
    process.exit(1);
  }
  console.log('Connected to database');
  
  // Read SQL file
  const sqlPath = path.join(__dirname, '../db/add_service_record_status.sql');
  const sql = fs.readFileSync(sqlPath, 'utf8');
  
  // Split SQL statements
  const statements = sql.split(';').filter(statement => statement.trim() !== '');
  
  // Execute each SQL statement
  for (const statement of statements) {
    db.query(statement, (err, result) => {
      if (err) {
        console.error('Error executing SQL statement:', err);
        console.error('Statement:', statement);
      } else {
        console.log('SQL statement executed successfully');
        console.log('Result:', result);
      }
    });
  }
  
  // Close connection after all statements are executed
  setTimeout(() => {
    db.end((err) => {
      if (err) {
        console.error('Error closing database connection:', err);
      } else {
        console.log('Database connection closed');
      }
      process.exit(0);
    });
  }, 2000);
}); 