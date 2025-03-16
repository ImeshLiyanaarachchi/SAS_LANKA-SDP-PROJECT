const mysql = require('mysql2');

class Inquiry {
    constructor(inquiry_id, user_id, inquiry_details, status, created_timestamp) {
        this.inquiry_id = inquiry_id;
        this.user_id = user_id;
        this.inquiry_details = inquiry_details;
        this.status = status;
        this.created_timestamp = created_timestamp;
    }
}

module.exports = Inquiry; 