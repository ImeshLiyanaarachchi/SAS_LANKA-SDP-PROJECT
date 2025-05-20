import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import {
  FaUser,
  FaEnvelope,
  FaIdCard,
  FaPhone,
  FaEdit,
  FaTrash,
  FaKey,
  FaUserShield,
  FaFilePdf,
  FaFileExcel,
  FaSearch,
  FaFilter,
} from "react-icons/fa";
import {
  Modal,
  Button,
  Form,
  Input,
  Select,
  message,
  Tooltip,
  Spin,
  Typography,
  Card,
  Space,
  Tag,
  Badge,
  Empty,
  Divider,
} from "antd";
import jsPDF from "jspdf";
import "jspdf-autotable";
import * as XLSX from "xlsx";

const { Title, Text } = Typography;

// Custom styles moved to bottom of file

const AdminUserProfile = () => {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [passwordModalVisible, setPasswordModalVisible] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [editForm] = Form.useForm();
  const [passwordForm] = Form.useForm();
  const [roleFilter, setRoleFilter] = useState("all");
  const [reportLoading, setReportLoading] = useState(false);
  const [selectedRole, setSelectedRole] = useState("customer");
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const user = JSON.parse(localStorage.getItem("user"));
        if (!user || user.role !== "admin") {
          navigate("/login");
          return;
        }
        fetchUsers();
      } catch (error) {
        console.error("Auth check error:", error);
        navigate("/login");
      }
    };

    checkAuth();
  }, [navigate]);

  useEffect(() => {
    // Apply search filter locally
    if (users.length > 0) {
      let filtered = [...users];

      // Apply role filter
      if (roleFilter !== "all") {
        filtered = filtered.filter((user) => user.role === roleFilter);
      }

      // Apply search filter
      if (searchTerm) {
        filtered = filtered.filter(
          (user) =>
            user.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            user.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (user.phone_number && user.phone_number.includes(searchTerm))
        );
      }

      setFilteredUsers(filtered);
    }
  }, [users, searchTerm, roleFilter]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await axios.get("http://localhost:3000/api/users", {
        withCredentials: true,
      });
      setUsers(response.data);
      setFilteredUsers(response.data);
      setError("");
    } catch (error) {
      console.error("Error fetching users:", error);
      setError("Failed to fetch users");
      if (error.response?.status === 401 || error.response?.status === 403) {
        navigate("/login");
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchUsersByRole = async (role) => {
    try {
      setLoading(true);
      const response = await axios.get(
        `http://localhost:3000/api/users/role/${role}`,
        {
          withCredentials: true,
        }
      );
      setUsers(response.data);
      setFilteredUsers(response.data);
      setError("");
    } catch (error) {
      console.error("Error fetching users by role:", error);
      setError("Failed to fetch users");
      if (error.response?.status === 401 || error.response?.status === 403) {
        navigate("/login");
      }
    } finally {
      setLoading(false);
    }
  };

  const searchUsersByName = async () => {
    if (!searchTerm.trim()) {
      fetchUsers();
      return;
    }

    try {
      setLoading(true);
      const response = await axios.get(
        `http://localhost:3000/api/users/search/${searchTerm}`,
        {
          withCredentials: true,
        }
      );
      setUsers(response.data);
      setFilteredUsers(response.data);
      setError("");
    } catch (error) {
      console.error("Error searching users:", error);
      setError("Failed to search users");
      if (error.response?.status === 401 || error.response?.status === 403) {
        navigate("/login");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRoleFilterChange = (value) => {
    setRoleFilter(value);
    if (value !== "all") {
      fetchUsersByRole(value);
    } else {
      fetchUsers();
    }
  };

  const showEditModal = (user) => {
    setCurrentUser(user);
    setIsEditing(true);
    editForm.resetFields();
    
    editForm.setFieldsValue({
      first_name: user.first_name,
      last_name: user.last_name,
      email: user.email,
      nic: user.nic,
      phone_number: user.phone_number,
      role: user.role || "customer",
    });
    setEditModalVisible(true);
  };

  const handleAddUserClick = () => {
    setCurrentUser(null);
    setIsEditing(false);
    editForm.resetFields();
    editForm.setFieldsValue({
      role: "customer",
    });
    setEditModalVisible(true);
  };

  const showPasswordModal = (user) => {
    setCurrentUser(user);
    passwordForm.resetFields();
    setPasswordModalVisible(true);
  };

  const handleEditCancel = () => {
    setEditModalVisible(false);
    setCurrentUser(null);
    editForm.resetFields();
  };

  const handlePasswordCancel = () => {
    setPasswordModalVisible(false);
    setCurrentUser(null);
    passwordForm.resetFields();
  };

  // Add validation functions
  const validateName = (name) => /^[A-Za-z]+$/.test(name);
  const validateNIC = (nic) => /^(?:\d{9}[VvXx]|\d{12})$/.test(nic);
  const validatePhoneNumber = (phone) => /^0\d{9}$/.test(phone);
  const validateEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const handleUpdateUser = async (values) => {
    try {
      // Validate all fields before submission
      if (!validateName(values.first_name)) {
        toast.error("First name must contain only letters");
        return;
      }

      if (!validateName(values.last_name)) {
        toast.error("Last name must contain only letters");
        return;
      }

      if (!validateNIC(values.nic)) {
        toast.error("Invalid NIC format. Must be 9 digits + V/X or 12 digits");
        return;
      }

      if (!validatePhoneNumber(values.phone_number)) {
        toast.error("Invalid phone number. Must start with 0 and be exactly 10 digits");
        return;
      }

      if (!validateEmail(values.email)) {
        toast.error("Please enter a valid email address");
        return;
      }

      if (!isEditing && (!values.password || values.password.length < 6)) {
        toast.error("Password must be at least 6 characters long");
        return;
      }

      if (!isEditing && values.password !== values.confirm_password) {
        toast.error("Passwords do not match");
        return;
      }

      if (isEditing) {
        // Update existing user
        await axios.put(
          `http://localhost:3000/api/users/${currentUser.user_id}`,
          values,
          {
            withCredentials: true,
          }
        );
        toast.success("User updated successfully");
      } else {
        // Create new user
        await axios.post(
          "http://localhost:3000/api/users/register",
          values,
          {
            withCredentials: true,
          }
        );
        toast.success("User created successfully");
      }

      setEditModalVisible(false);
      fetchUsers();
    } catch (error) {
      console.error("Error saving user:", error);
      const errorMessage = error.response?.data?.message || "An error occurred";

      // Handle specific duplicate cases
      if (errorMessage.includes("Already in use:")) {
        const duplicateFields = errorMessage.split("Already in use:")[1].trim();

        // Show separate toast for each duplicate field
        if (duplicateFields.includes("email")) {
          toast.error("🚨 This email is already registered");
        }
        if (duplicateFields.includes("phone number")) {
          toast.error("🚨 This phone number is already registered");
        }
        if (duplicateFields.includes("NIC")) {
          toast.error("🚨 This NIC is already registered");
        }
      } else {
        // Show general error message for other cases
        toast.error(errorMessage);
      }

      if (error.response?.status === 401 || error.response?.status === 403) {
        navigate("/login");
      }
    }
  };

  const handleUpdatePassword = async (values) => {
    try {
      if (!currentUser) return;

      await axios.put(
        `http://localhost:3000/api/users/password/${currentUser.user_id}`,
        {
          current_password: values.current_password,
          new_password: values.new_password,
        },
        {
          withCredentials: true,
        }
      );

      message.success("Password updated successfully");
      setPasswordModalVisible(false);
    } catch (error) {
      console.error("Error updating password:", error);
      message.error(
        "Failed to update password: " +
          (error.response?.data?.message || error.message)
      );
      if (error.response?.status === 401 || error.response?.status === 403) {
        navigate("/login");
      }
    }
  };

  const handleDeleteUser = async (userId) => {
    try {
      const confirmDelete = window.confirm(
        "Are you sure you want to delete this user?"
      );
      if (!confirmDelete) return;

      await axios.delete(`http://localhost:3000/api/users/${userId}`, {
        withCredentials: true,
      });
      message.success("User deleted successfully");
      fetchUsers();
    } catch (error) {
      console.error("Error deleting user:", error);
      message.error(
        "Failed to delete user: " +
          (error.response?.data?.message || error.message)
      );
      if (error.response?.status === 401 || error.response?.status === 403) {
        navigate("/login");
      }
    }
  };

  const getRoleBadgeColor = (role) => {
    switch (role) {
      case "admin":
        return "#722ed1";
      case "technician":
        return "#1890ff";
      case "customer":
        return "#52c41a";
      default:
        return "#d9d9d9";
    }
  };

  const generatePDFReport = () => {
    try {
      setReportLoading(true);
      const doc = new jsPDF();
      const currentDate = new Date().toLocaleDateString();

      doc.setFontSize(18);
      doc.text("User Management Report", 15, 15);
      doc.setFontSize(11);
      doc.text(`Generated on: ${currentDate}`, 15, 23);
      doc.text(`Total Users: ${filteredUsers.length}`, 15, 31);

      if (roleFilter !== "all") {
        doc.text(`Filtered by role: ${roleFilter}`, 15, 39);
      }

      if (searchTerm) {
        doc.text(`Search term: "${searchTerm}"`, 15, 47);
      }

      const tableColumn = ["Name", "Email", "Phone", "NIC", "Role"];
      const tableRows = [];

      filteredUsers.forEach((user) => {
        const userData = [
          `${user.first_name} ${user.last_name}`,
          user.email,
          user.phone_number || "N/A",
          user.nic || "N/A",
          user.role,
        ];
        tableRows.push(userData);
      });

      doc.autoTable({
        head: [tableColumn],
        body: tableRows,
        startY: roleFilter !== "all" || searchTerm ? 55 : 40,
        styles: { fontSize: 10, cellPadding: 3 },
        headStyles: { fillColor: [66, 139, 202] },
      });

      doc.save(`User_Report_${currentDate.replace(/\//g, "-")}.pdf`);
      message.success("PDF report generated successfully");
    } catch (error) {
      console.error("Error generating PDF report:", error);
      message.error("Failed to generate PDF report");
    } finally {
      setReportLoading(false);
    }
  };

  const generateExcelReport = () => {
    try {
      setReportLoading(true);
      const workbook = XLSX.utils.book_new();
      const currentDate = new Date().toLocaleDateString().replace(/\//g, "-");

      const excelData = filteredUsers.map((user) => ({
        "First Name": user.first_name,
        "Last Name": user.last_name,
        Email: user.email,
        Phone: user.phone_number || "N/A",
        NIC: user.nic || "N/A",
        Role: user.role,
      }));

      const worksheet = XLSX.utils.json_to_sheet(excelData);

      XLSX.utils.book_append_sheet(workbook, worksheet, "Users");

      XLSX.writeFile(workbook, `User_Report_${currentDate}.xlsx`);
      message.success("Excel report generated successfully");
    } catch (error) {
      console.error("Error generating Excel report:", error);
      message.error("Failed to generate Excel report");
    } finally {
      setReportLoading(false);
    }
  };

  return (
    <div style={lightThemeStyles.page}>
      <ToastContainer
        position="top-right"
        autoClose={5000}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="dark"
      />
      <div className="mb-4">
        <Title level={2} style={lightThemeStyles.title}>
          User Management
        </Title>
      </div>

      <Card
        className="mb-4"
        style={lightThemeStyles.card}
        bodyStyle={{ padding: "20px" }}
      >
        <div className="flex flex-col md:flex-row justify-between items-center mb-4">
          <Space size="large" className="mb-3 md:mb-0">
            <Input
              placeholder="Search by name or email"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onPressEnter={() => searchUsersByName()}
              prefix={
                <FaSearch style={{ color: "#1890ff", fontSize: "18px" }} />
              }
              allowClear
              style={lightThemeStyles.searchInput}
            />
            <Button
              type="primary"
              onClick={() => searchUsersByName()}
              loading={loading}
              size="large"
              style={lightThemeStyles.button}
            >
              Search
            </Button>
          </Space>

          <Space>
            <Select
              className="role-dropdown"
              value={roleFilter}
              onChange={handleRoleFilterChange}
              style={{
                width: 160,
                backgroundColor: "#ffffff",
                color: "rgba(0, 0, 0, 0.85)",
                fontSize: "16px",
              }}
            >
              <Select.Option value="all">All Roles</Select.Option>
              <Select.Option value="admin">Admins</Select.Option>
              <Select.Option value="technician">Technicians</Select.Option>
              <Select.Option value="customer">Customers</Select.Option>
            </Select>

            <Button
              type="primary"
              icon={<FaFilePdf style={{ fontSize: "18px" }} />}
              onClick={generatePDFReport}
              loading={reportLoading}
              size="large"
              style={{ ...lightThemeStyles.button, background: "#1d39c4" }}
            >
              Export PDF
            </Button>

            <Button
              type="primary"
              icon={<FaFileExcel style={{ fontSize: "18px" }} />}
              onClick={generateExcelReport}
              loading={reportLoading}
              size="large"
              style={{ ...lightThemeStyles.button, background: "#237804" }}
            >
              Export Excel
            </Button>

            <Button
              type="primary"
              icon={<FaUser style={{ fontSize: "18px" }} />}
              onClick={handleAddUserClick}
              size="large"
              style={lightThemeStyles.button}
            >
              Add User
            </Button>
          </Space>
        </div>

        <Divider style={{ borderColor: "#f0f0f0", margin: "12px 0 24px" }} />

        {loading ? (
          <div style={lightThemeStyles.loading}>
            <Spin size="large" />
            <p style={{ fontSize: "18px", color: "#333", marginTop: "15px" }}>
              Loading users...
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full" style={lightThemeStyles.table}>
              <thead style={lightThemeStyles.tableHeader}>
                <tr>
                  <th
                    className="px-6 py-3 text-left"
                    style={{
                      fontSize: "18px",
                      color: "rgba(0, 0, 0, 0.85)",
                      fontWeight: "500",
                    }}
                  >
                    User Details
                  </th>
                  <th
                    className="px-6 py-3 text-left"
                    style={{
                      fontSize: "18px",
                      color: "rgba(0, 0, 0, 0.85)",
                      fontWeight: "500",
                    }}
                  >
                    Email
                  </th>
                  <th
                    className="px-6 py-3 text-left"
                    style={{
                      fontSize: "18px",
                      color: "rgba(0, 0, 0, 0.85)",
                      fontWeight: "500",
                    }}
                  >
                    Phone
                  </th>
                  <th
                    className="px-6 py-3 text-left"
                    style={{
                      fontSize: "18px",
                      color: "rgba(0, 0, 0, 0.85)",
                      fontWeight: "500",
                    }}
                  >
                    Role
                  </th>
                  <th
                    className="px-6 py-3 text-left"
                    style={{
                      fontSize: "18px",
                      color: "rgba(0, 0, 0, 0.85)",
                      fontWeight: "500",
                    }}
                  >
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="text-center py-8">
                      <Empty
                        description={
                          <span style={{ color: "#666" }}>No users found</span>
                        }
                      />
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((user) => (
                    <tr
                      key={user.user_id}
                      style={{
                        color: "rgba(0, 0, 0, 0.85)",
                        fontSize: "16px",
                        borderBottom: "1px solid #f0f0f0",
                      }}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                            <FaUser className="text-blue-500" />
                          </div>
                          <div className="ml-4">
                            <div
                              style={{
                                color: "rgba(0, 0, 0, 0.85)",
                                fontSize: "16px",
                                fontWeight: "500",
                              }}
                            >
                              {user.first_name} {user.last_name}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <FaEnvelope className="mr-2 text-gray-400" />
                          <span>{user.email}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {user.phone_number ? (
                          <div className="flex items-center">
                            <FaPhone className="mr-2 text-gray-400" />
                            <span>{user.phone_number}</span>
                          </div>
                        ) : (
                          <span className="text-gray-500">Not provided</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Badge
                          color={getRoleBadgeColor(user.role)}
                          text={
                            <span
                              style={{
                                fontSize: "16px",
                                color: "rgba(0, 0, 0, 0.85)",
                              }}
                            >
                              {user.role}
                            </span>
                          }
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Space>
                          <Button
                            type="primary"
                            icon={<FaEdit />}
                            onClick={() => showEditModal(user)}
                            style={{
                              backgroundColor: "#1890ff",
                              borderColor: "#1890ff",
                              fontSize: "14px",
                            }}
                          >
                            Edit
                          </Button>
                          <Button
                            type="primary"
                            icon={<FaKey />}
                            onClick={() => showPasswordModal(user)}
                            style={{
                              backgroundColor: "#722ed1",
                              borderColor: "#722ed1",
                              fontSize: "14px",
                            }}
                          >
                            Password
                          </Button>
                          <Button
                            type="primary"
                            danger
                            icon={<FaTrash />}
                            onClick={() => handleDeleteUser(user.user_id)}
                            style={{ fontSize: "14px" }}
                          >
                            Delete
                          </Button>
                        </Space>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Modal
        title={isEditing ? "Edit User" : "Add New User"}
        visible={editModalVisible}
        onCancel={handleEditCancel}
        footer={null}
        width={800}
        centered={true}
        style={{ top: 20 }}
        bodyStyle={{ backgroundColor: "#ffffff", padding: "20px" }}
        headStyle={{
          backgroundColor: "#ffffff",
          color: "rgba(0, 0, 0, 0.85)",
          borderBottom: "1px solid #f0f0f0",
        }}
      >
        <Form form={editForm} layout="vertical" onFinish={handleUpdateUser}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Form.Item
              label={
                <span
                  style={{ color: "rgba(0, 0, 0, 0.85)", fontSize: "18px" }}
                >
                  First Name
                </span>
              }
              name="first_name"
              rules={[
                { required: true, message: "Please enter first name" },
                {
                  pattern: /^[A-Za-z]+$/,
                  message: "First name must contain only letters",
                },
              ]}
            >
              <Input
                size="large"
                placeholder="First Name"
                style={{
                  backgroundColor: "#ffffff",
                  borderColor: "#d9d9d9",
                  color: "rgba(0, 0, 0, 0.85)",
                }}
              />
            </Form.Item>

            <Form.Item
              label={
                <span
                  style={{ color: "rgba(0, 0, 0, 0.85)", fontSize: "18px" }}
                >
                  Last Name
                </span>
              }
              name="last_name"
              rules={[
                { required: true, message: "Please enter last name" },
                {
                  pattern: /^[A-Za-z]+$/,
                  message: "Last name must contain only letters",
                },
              ]}
            >
              <Input
                size="large"
                placeholder="Last Name"
                style={{
                  backgroundColor: "#ffffff",
                  borderColor: "#d9d9d9",
                  color: "rgba(0, 0, 0, 0.85)",
                }}
              />
            </Form.Item>

            <Form.Item
              label={
                <span
                  style={{ color: "rgba(0, 0, 0, 0.85)", fontSize: "18px" }}
                >
                  Email
                </span>
              }
              name="email"
              rules={[
                { required: true, message: "Please enter email" },
                { type: "email", message: "Please enter a valid email" },
              ]}
            >
              <Input
                size="large"
                placeholder="Email"
                style={{
                  backgroundColor: "#ffffff",
                  borderColor: "#d9d9d9",
                  color: "rgba(0, 0, 0, 0.85)",
                }}
              />
            </Form.Item>

            <Form.Item
              label={
                <span
                  style={{ color: "rgba(0, 0, 0, 0.85)", fontSize: "18px" }}
                >
                  Phone Number
                </span>
              }
              name="phone_number"
              rules={[
                { required: true, message: "Please enter phone number" },
                {
                  pattern: /^\d{10}$/,
                  message: "Phone number should contain 10 digits",
                },
              ]}
            >
              <Input
                maxLength={10}
                size="large"
                placeholder="Phone Number"
                onKeyPress={(e) => {
                  if (!/[0-9]/.test(e.key)) {
                    e.preventDefault();
                  }
                }}
                style={{
                  backgroundColor: "#ffffff",
                  borderColor: "#d9d9d9",
                  color: "rgba(0, 0, 0, 0.85)",
                }}
              />
            </Form.Item>

            <Form.Item
              label={
                <span
                  style={{ color: "rgba(0, 0, 0, 0.85)", fontSize: "18px" }}
                >
                  NIC
                </span>
              }
              name="nic"
              rules={[
                { required: true, message: "Please enter NIC" },
                {
                  pattern: /^(\d{9}[vV]|\d{12})$/,
                  message:
                    "NIC must be 9 digits followed by 'V' or exactly 12 digits",
                },
              ]}
            >
              <Input
                maxLength={12}
                size="large"
                placeholder="NIC"
                onKeyPress={(e) => {
                  if (!/[0-9vV]/.test(e.key)) {
                    e.preventDefault();
                  }
                }}
                style={{
                  backgroundColor: "#ffffff",
                  borderColor: "#d9d9d9",
                  color: "rgba(0, 0, 0, 0.85)",
                }}
              />
            </Form.Item>

            <Form.Item
              label="Role"
              name="role"
              initialValue="customer"
            >
              <Select
                className="role-dropdown"
                style={{ backgroundColor: "#ffffff" }}
                size="large"
                disabled={isEditing}
              >
                <Select.Option value="customer">Customer</Select.Option>
                <Select.Option value="technician">Technician</Select.Option>
                <Select.Option value="admin">Admin</Select.Option>
              </Select>
            </Form.Item>

            {!isEditing && (
              <>
              <Form.Item
  label={
    <span style={{ color: "rgba(0, 0, 0, 0.85)", fontSize: "18px" }}>
      Password
    </span>
  }
  name="password"
  rules={[
    { required: true, message: "Please enter password" },
    { min: 8, message: "Password must be at least 8 characters" },
  ]}
>
  <Input.Password
    size="large"
    placeholder="Password"
    style={{
      backgroundColor: "#ffffff",
      borderColor: "#d9d9d9",
      color: "rgba(0, 0, 0, 0.85)",
    }}
  />
</Form.Item>

                <Form.Item
                  label={
                    <span
                      style={{ color: "rgba(0, 0, 0, 0.85)", fontSize: "18px" }}
                    >
                      Confirm Password
                    </span>
                  }
                  name="confirm_password"
                  dependencies={["password"]}
                  rules={[
                    { required: true, message: "Please confirm password" },
                    ({ getFieldValue }) => ({
                      validator(_, value) {
                        if (!value || getFieldValue("password") === value) {
                          return Promise.resolve();
                        }
                        return Promise.reject(
                          new Error("The two passwords do not match")
                        );
                      },
                    }),
                  ]}
                >
                  <Input.Password
                    size="large"
                    placeholder="Confirm Password"
                    style={{
                      backgroundColor: "#ffffff",
                      borderColor: "#d9d9d9",
                      color: "rgba(0, 0, 0, 0.85)",
                    }}
                  />
                </Form.Item>
              </>
            )}
          </div>

          <div className="flex justify-end mt-4">
            <Button
              onClick={handleEditCancel}
              style={{ marginRight: 12, fontSize: "15px" }}
            >
              Cancel
            </Button>
            <Button
              type="primary"
              htmlType="submit"
              style={{ fontSize: "15px" }}
            >
              {isEditing ? "Update User" : "Create User"}
            </Button>
          </div>
        </Form>
      </Modal>

      <Modal
        title="Change Password"
        visible={passwordModalVisible}
        onCancel={handlePasswordCancel}
        footer={null}
        width={400}
        bodyStyle={{ backgroundColor: "#ffffff", padding: "20px" }}
        headStyle={{
          backgroundColor: "#ffffff",
          color: "rgba(0, 0, 0, 0.85)",
          borderBottom: "1px solid #f0f0f0",
        }}
      >
        <Form
          form={passwordForm}
          layout="vertical"
          onFinish={handleUpdatePassword}
        >
          <Form.Item
            label={
              <span style={{ color: "rgba(0, 0, 0, 0.85)", fontSize: "15px" }}>
                Current Password
              </span>
            }
            name="current_password"
            rules={[
              { required: true, message: "Please enter current password" },
            ]}
          >
            <Input.Password
              placeholder="Current Password"
              style={{
                backgroundColor: "#ffffff",
                borderColor: "#d9d9d9",
                color: "rgba(0, 0, 0, 0.85)",
              }}
            />
          </Form.Item>

          <Form.Item
            label={
              <span style={{ color: "rgba(0, 0, 0, 0.85)", fontSize: "15px" }}>
                New Password
              </span>
            }
            name="new_password"
            rules={[{ required: true, message: "Please enter new password" }]}
          >
            <Input.Password
              placeholder="New Password"
              style={{
                backgroundColor: "#ffffff",
                borderColor: "#d9d9d9",
                color: "rgba(0, 0, 0, 0.85)",
              }}
            />
          </Form.Item>

          <Form.Item
            label={
              <span style={{ color: "rgba(0, 0, 0, 0.85)", fontSize: "15px" }}>
                Confirm New Password
              </span>
            }
            name="confirm_password"
            dependencies={["new_password"]}
            rules={[
              { required: true, message: "Please confirm new password" },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue("new_password") === value) {
                    return Promise.resolve();
                  }
                  return Promise.reject(
                    new Error("The two passwords do not match")
                  );
                },
              }),
            ]}
          >
            <Input.Password
              placeholder="Confirm New Password"
              style={{
                backgroundColor: "#ffffff",
                borderColor: "#d9d9d9",
                color: "rgba(0, 0, 0, 0.85)",
              }}
            />
          </Form.Item>

          <div className="flex justify-end mt-4">
            <Button
              onClick={handlePasswordCancel}
              style={{ marginRight: 12, fontSize: "15px" }}
            >
              Cancel
            </Button>
            <Button
              type="primary"
              htmlType="submit"
              style={{ fontSize: "15px" }}
            >
              Update Password
            </Button>
          </div>
        </Form>
      </Modal>

      <style jsx global>{`
        .ant-table-thead > tr > th {
          font-size: 20px;
          padding: 12px 16px;
        }

        .ant-table-tbody > tr > td {
          font-size: 19px;
          padding: 12px 16px;
        }

        .page-title {
          font-size: 32px;
          margin-bottom: 15px;
          color: #333;
        }

        .section-title {
          font-size: 22px;
          font-weight: bold;
          color: #1890ff;
        }

        .loading-container {
          text-align: center;
          margin: 80px 0;
        }

        .loading-container p {
          font-size: 18px;
          margin-top: 15px;
        }

        .action-button {
          height: 45px;
          font-size: 18px;
          padding: 0 25px;
        }

        .content-card {
          border-radius: 10px;
          margin-bottom: 20px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
        }

        .details-descriptions .ant-descriptions-item-label {
          font-size: 20px;
          font-weight: 500;
        }

        .details-descriptions .ant-descriptions-item-content {
          font-size: 20px;
        }

        .modal-title {
          font-size: 23px;
          margin: 0;
          width: 100%;
          text-align: left;
          font-weight: 600;
        }

        .ant-form-item-label > label {
          font-size: 18px;
        }

        .ant-input-number,
        .ant-select,
        .ant-input {
          font-size: 18px;
        }

        .ant-select-selection-item,
        .ant-select-item {
          font-size: 18px;
        }

        .ant-btn {
          font-size: 18px;
        }

        .ant-divider-inner-text {
          font-size: 18px;
          font-weight: 500;
        }

        .ant-select-dropdown {
          background-color: #ffffff !important;
          border: 1px solid #d9d9d9 !important;
        }

        .ant-select-item {
          color: rgba(0, 0, 0, 0.85) !important;
        }

        .ant-select-item-option-selected {
          background-color: #e6f7ff !important;
        }

        .ant-select-item-option:hover {
          background-color: #f5f5f5 !important;
        }

        .custom-select .ant-select-selector {
          background-color: #ffffff !important;
          color: rgba(0, 0, 0, 0.85) !important;
          border-color: #d9d9d9 !important;
          font-size: 16px;
        }

        .custom-select .ant-select-selection-item {
          color: rgba(0, 0, 0, 0.85) !important;
        }

        .custom-select .ant-select-arrow {
          color: rgba(0, 0, 0, 0.25) !important;
        }

        .ant-modal-content {
          background-color: #ffffff !important;
          border-radius: 10px !important;
          overflow: hidden !important;
        }

        .ant-modal-header {
          background-color: #ffffff !important;
        }

        .ant-modal-title {
          color: rgba(0, 0, 0, 0.85) !important;
          font-size: 18px !important;
        }

        .ant-modal-close-icon {
          color: rgba(0, 0, 0, 0.45) !important;
          font-size: 16px !important;
        }

        .ant-form-item-label > label {
          color: rgba(0, 0, 0, 0.85) !important;
        }

        .ant-form-item-explain-error {
          color: #ff4d4f !important;
        }

        .role-dropdown .ant-select-selector {
          background-color: #ffffff !important;
          color: rgba(0, 0, 0, 0.85) !important;
          border: 1px solid #d9d9d9 !important;
          font-size: 16px !important;
        }

        .role-dropdown .ant-select-arrow {
          color: rgba(0, 0, 0, 0.25) !important;
        }

        .role-dropdown .ant-select-selection-item {
          color: rgba(0, 0, 0, 0.85) !important;
        }

        .ant-input::placeholder {
          color: rgba(0, 0, 0, 0.45) !important;
          opacity: 1;
        }

        .ant-form .ant-input::placeholder {
          color: rgba(0, 0, 0, 0.45) !important;
        }
      `}</style>
    </div>
  );
};

const lightThemeStyles = {
  page: {
    backgroundColor: "#ffffff",
    minHeight: "100vh",
    padding: "20px",
    width: "100%",
  },
  title: {
    color: "#333",
    fontSize: "32px",
    marginBottom: "15px",
  },
  subtitle: {
    color: "#666",
    fontSize: "18px",
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: "10px",
    marginBottom: "20px",
    boxShadow: "0 4px 12px rgba(0, 0, 0, 0.05)",
  },
  button: {
    height: "40px",
    fontSize: "16px",
    padding: "0 20px",
  },
  searchInput: {
    backgroundColor: "#ffffff",
    borderColor: "#d9d9d9",
    color: "rgba(0, 0, 0, 0.85)",
    height: "40px",
    fontSize: "16px",
    width: "350px",
  },
  table: {
    backgroundColor: "#ffffff",
    color: "rgba(0, 0, 0, 0.85)",
  },
  tableHeader: {
    backgroundColor: "#fafafa",
    color: "rgba(0, 0, 0, 0.85)",
    fontSize: "16px",
  },
  loading: {
    textAlign: "center",
    margin: "80px 0",
    fontSize: "18px",
  },
};

export default AdminUserProfile;
