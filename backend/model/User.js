class User {
  constructor(first_name, last_name, nic, phone_number, email, password) {
      this.first_name = first_name;
      this.last_name = last_name;
      this.nic = nic;
      this.phone_number = phone_number;
      this.email = email;
      this.password = password;
  }
}

module.exports = User;