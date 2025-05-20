import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import {
  Table,
  Button,
  Modal,
  Form,
  Input,
  Select,
  Space,
  Card,
  Typography,
  InputNumber,
  Tooltip,
  Popconfirm,
  Statistic,
  Row,
  Col,
  Badge,
  Tag,
  Tabs,
  Alert,
  Drawer,
  Descriptions,
} from "antd";
import {
  CarOutlined,
  EditOutlined,
  DeleteOutlined,
  PlusOutlined,
  HistoryOutlined,
  UserOutlined,
  SettingOutlined,
  InfoCircleOutlined,
  EyeOutlined,
} from "@ant-design/icons";
import { motion } from "framer-motion";
import dayjs from "dayjs";

const { Title, Text } = Typography;
const { Option } = Select;
const { TabPane } = Tabs;
const { TextArea } = Input;

// Custom styles
const lightThemeStyles = {
  page: { backgroundColor: "#ffffff", minHeight: "100vh", padding: "20px" },
};

const AdminVehicleProfile = () => {
  const navigate = useNavigate();
  const [vehicles, setVehicles] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [serviceHistoryVisible, setServiceHistoryVisible] = useState(false);
  const [serviceHistory, setServiceHistory] = useState([]);
  const [stats, setStats] = useState({
    totalVehicles: 0,
    activeUsers: 0,
    recentServices: 0,
  });
  const [form] = Form.useForm();

  // Authentication check on component mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const user = JSON.parse(localStorage.getItem("user"));
        if (!user || (user.role !== "admin" && user.role !== "technician")) {
          navigate("/login");
          return;
        }
        fetchVehicles();
        fetchUsers();
      } catch (error) {
        console.error("Auth check error:", error);
        navigate("/login");
      }
    };

    checkAuth();
  }, [navigate]);

  const fetchVehicles = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const response = await axios.get(
        "http://localhost:3000/api/vehicle-profiles",
        {
          withCredentials: true,
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );
      setVehicles(response.data);
      updateStats(response.data);
    } catch (error) {
      console.error("Error fetching vehicles:", error);
      toast.error("Failed to fetch vehicles");
      if (error.response?.status === 401 || error.response?.status === 403) {
        navigate("/login");
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get("http://localhost:3000/api/users", {
        withCredentials: true,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
      // Filter to only include customers
      const customerUsers = response.data.filter(user => user.role === 'customer');
      setUsers(customerUsers);
    } catch (error) {
      console.error("Error fetching users:", error);
      toast.error("Failed to fetch users");
    }
  };

  const fetchServiceHistory = async (vehicleNumber) => {
    try {
      const response = await axios.get(
        `http://localhost:3000/api/service-records/vehicle/${vehicleNumber}`,
        {
          withCredentials: true,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
      setServiceHistory(response.data);
    } catch (error) {
      console.error("Error fetching service history:", error);
      toast.error("Failed to fetch service history");
    }
  };

  const updateStats = (vehicleData) => {
    const uniqueUsers = new Set(vehicleData.map((v) => v.user_id)).size;
    const recentServices = vehicleData.filter((v) => {
      const lastService = new Date(v.last_service_date);
      const monthAgo = new Date();
      monthAgo.setMonth(monthAgo.getMonth() - 1);
      return lastService >= monthAgo;
    }).length;

    setStats({
      totalVehicles: vehicleData.length,
      activeUsers: uniqueUsers,
      recentServices,
    });
  };

  const handleAdd = () => {
    setSelectedVehicle(null);
    form.resetFields();
    setModalVisible(true);
  };

  const handleEdit = (record) => {
    setSelectedVehicle(record);
    form.setFieldsValue({
      vehicle_number: record.vehicle_number,
      user_id: record.user_id,
      make: record.make,
      model: record.model,
      year_of_manuf: record.year_of_manuf,
      engine_details: record.engine_details,
      transmission_details: record.transmission_details,
      vehicle_colour: record.vehicle_colour,
      vehicle_features: record.vehicle_features,
      condition_: record.condition_,
      owner_: record.owner_,
    });
    setModalVisible(true);
  };

  const handleDelete = async (vehicleNumber) => {
    try {
      await axios.delete(
        `http://localhost:3000/api/vehicle-profiles/${vehicleNumber}`,
        {
          withCredentials: true,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
      toast.success("Vehicle profile deleted successfully");
      fetchVehicles();
    } catch (error) {
      console.error("Error deleting vehicle:", error);
      toast.error(error.response?.data?.message || "Failed to delete vehicle");
    }
  };

  const handleViewHistory = (record) => {
    setSelectedVehicle(record);
    fetchServiceHistory(record.vehicle_number);
    setServiceHistoryVisible(true);
  };

  const handleViewDetail = (record) => {
    navigate(`/admin/vehicle-profile/${record.vehicle_number}`);
  };

  const handleModalOk = async () => {
    try {
      const values = await form.validateFields();
      const token = localStorage.getItem("token");

      if (selectedVehicle) {
        await axios.put(
          `http://localhost:3000/api/vehicle-profiles/${selectedVehicle.vehicle_number}`,
          values,
          {
            withCredentials: true,
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
          }
        );
        toast.success("✅ Vehicle profile updated successfully");
      } else {
        await axios.post("http://localhost:3000/api/vehicle-profiles", values, {
          withCredentials: true,
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        });
        toast.success("✅ Vehicle profile created successfully");
      }
      setModalVisible(false);
      fetchVehicles();
    } catch (error) {
      console.error("Error saving vehicle:", error);
      const errorMessage = error.response?.data?.message || "Failed to save vehicle profile";
      
      if (errorMessage.includes("already exists")) {
        toast.error("🚨 Vehicle with this number already exists");
      } else {
        toast.error(errorMessage);
      }
    }
  };

  const columns = [
    {
      title: <span className="column-title">Vehicle Number</span>,
      dataIndex: "vehicle_number",
      key: "vehicle_number",
      render: (text, record) => (
        <Button
          type="link"
          onClick={() => handleViewDetail(record)}
          className="vehicle-number-btn"
        >
          {text}
        </Button>
      ),
    },
    {
      title: <span className="column-title">Make</span>,
      dataIndex: "make",
      key: "make",
      render: (text) => <Text className="table-text">{text}</Text>,
    },
    {
      title: <span className="column-title">Model</span>,
      dataIndex: "model",
      key: "model",
      render: (text) => <Text className="table-text">{text}</Text>,
    },
    {
      title: <span className="column-title">Owner Details</span>,
      key: "owner",
      render: (_, record) => (
        <div>
          <Text className="owner-text">{record.owner_}</Text>
        </div>
      ),
    },
    {
      title: <span className="column-title">Actions</span>,
      key: "actions",
      render: (_, record) => (
        <Space>
          <Tooltip title="View Details">
            <Button
              type="primary"
              icon={<EyeOutlined />}
              onClick={() => handleViewDetail(record)}
              className="action-button"
            />
          </Tooltip>
          <Tooltip title="Edit">
            <Button
              type="primary"
              icon={<EditOutlined />}
              onClick={() => handleEdit(record)}
              className="action-button"
            />
          </Tooltip>
          <Tooltip title="Delete">
            <Popconfirm
              title="Delete Vehicle Profile"
              description="Are you sure you want to delete this vehicle profile?"
              onConfirm={() => handleDelete(record.vehicle_number)}
              okText="Yes"
              cancelText="No"
            >
              <Button
                danger
                icon={<DeleteOutlined />}
                className="action-button"
              />
            </Popconfirm>
          </Tooltip>
        </Space>
      ),
    },
  ];

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
      <div className="max-w-8xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Title level={2} className="page-title">
              Vehicle Profiles
            </Title>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card className="styled-card shadow-sm">
            <div className="flex justify-between items-center mb-6">
              <div />
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={handleAdd}
                size="large"
                className="add-button"
              >
                Add New Vehicle
              </Button>
            </div>

            <Table
              columns={columns}
              dataSource={vehicles}
              rowKey="vehicle_number"
              loading={loading}
              pagination={{
                pageSize: 10,
                showSizeChanger: true,
                showTotal: (total, range) =>
                  `${range[0]}-${range[1]} of ${total} vehicles`,
              }}
              className="light-theme-table"
            />
          </Card>
        </motion.div>

        <Modal
          title={
            <div>
              <Title style={{ fontSize: '32px', textAlign: 'center', fontWeight: 'bold' }}>
                {selectedVehicle ? "Edit Vehicle Profile" : "Add New Vehicle"}
              </Title>
            </div>
          }
          open={modalVisible}
          onOk={handleModalOk}
          onCancel={() => setModalVisible(false)}
          width={950}
          centered
          className="styled-modal"
        >
          <Form form={form} layout="vertical">
            <Row gutter={[24, 10]}>
              <Col xs={24} md={12}>
                <Form.Item
                  name="vehicle_number"
                  label={<span className="form-label">Vehicle Number</span>}
                  rules={[
                    { required: true, message: "Please enter vehicle number" },
                    {
                      pattern: /^(?:\d{1,3}-\d{4}|[A-Z]{2,3}-\d{4})$/,
                      message:
                        "Invalid vehicle number format. E.g., CAA-1234, NA-4567, 300-2345, 2-3424",
                    },
                  ]}
                >
                  <Input
                    prefix={<CarOutlined />}
                    placeholder="e.g., CAA-1234"
                    disabled={!!selectedVehicle}
                    className="form-input"
                  />
                </Form.Item>
              </Col>

              <Col xs={24} md={12}>
                <Form.Item
                  name="user_id"
                  label={<span className="form-label">Owner</span>}
                  rules={[{ required: true, message: "Please select owner" }]}
                >
                  <Select
                    showSearch
                    placeholder="Select customer by email"
                    optionFilterProp="children"
                    className="form-select"
                    filterOption={(input, option) =>
                      option.children.toLowerCase().indexOf(input.toLowerCase()) >= 0
                    }
                  >
                    {users.map((user) => (
                      <Option key={user.user_id} value={user.user_id}>
                        {user.email} ({user.first_name} {user.last_name})
                      </Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={[24, 10]}>
              <Col xs={24} md={8}>
                <Form.Item
                  name="make"
                  label={<span className="form-label">Make</span>}
                  rules={[{ required: true, message: "Please enter make" }]}
                >
                  <Input placeholder="e.g., Toyota" className="form-input" />
                </Form.Item>
              </Col>
              <Col xs={24} md={8}>
                <Form.Item
                  name="model"
                  label={<span className="form-label">Model</span>}
                  rules={[{ required: true, message: "Please enter model" }]}
                >
                  <Input placeholder="e.g., Corolla" className="form-input" />
                </Form.Item>
              </Col>
              <Col xs={24} md={8}>
                <Form.Item
                  name="year_of_manuf"
                  label={<span className="form-label">Year</span>}
                  rules={[{ required: true, message: "Please enter year" }]}
                >
                  <InputNumber
                    min={1900}
                    max={new Date().getFullYear()}
                    className="form-input-number"
                  />
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={[24, 10]}>
              <Col xs={24} md={12}>
                <Form.Item
                  name="engine_details"
                  label={<span className="form-label">Engine Details</span>}
                  rules={[
                    { required: true, message: "Please enter engine details" },
                  ]}
                >
                  <TextArea
                    placeholder="e.g., 2.0L 4-cylinder DOHC"
                    autoSize={{ minRows: 3, maxRows: 5 }}
                    className="form-textarea"
                  />
                </Form.Item>
              </Col>
              <Col xs={24} md={12}>
                <Form.Item
                  name="transmission_details"
                  label={
                    <span className="form-label">Transmission Details</span>
                  }
                  rules={[
                    {
                      required: true,
                      message: "Please enter transmission details",
                    },
                  ]}
                >
                  <TextArea
                    placeholder="e.g., 6-speed automatic"
                    autoSize={{ minRows: 3, maxRows: 5 }}
                    className="form-textarea"
                  />
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={[24, 10]}>
              <Col xs={24} md={8}>
                <Form.Item
                  name="vehicle_colour"
                  label={<span className="form-label">Color</span>}
                  rules={[{ required: true, message: "Please enter color" }]}
                >
                  <Input placeholder="e.g., Silver" className="form-input" />
                </Form.Item>
              </Col>
              <Col xs={24} md={16}>
                <Form.Item
                  name="vehicle_features"
                  label={<span className="form-label">Features</span>}
                >
                  <TextArea
                    placeholder="e.g., Leather seats, Sunroof, Navigation"
                    autoSize={{ minRows: 3, maxRows: 5 }}
                    className="form-textarea"
                  />
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={[24, 10]}>
              <Col xs={24} md={12}>
                <Form.Item
                  name="condition_"
                  label={<span className="form-label">Condition</span>}
                  rules={[
                    { required: true, message: "Please enter condition" },
                  ]}
                >
                  <TextArea
                    placeholder="e.g., Good condition, regular maintenance"
                    autoSize={{ minRows: 3, maxRows: 5 }}
                    className="form-textarea"
                  />
                </Form.Item>
              </Col>
              <Col xs={24} md={12}>
                <Form.Item
                  name="owner_"
                  label={<span className="form-label">Owner Details</span>}
                  rules={[
                    { required: true, message: "Please enter owner details" },
                  ]}
                >
                  <TextArea
                    placeholder="e.g., First owner, all service records available"
                    autoSize={{ minRows: 3, maxRows: 5 }}
                    className="form-textarea"
                  />
                </Form.Item>
              </Col>
            </Row>
          </Form>
        </Modal>

      </div>

      <style jsx global>{`
        .light-theme-table .ant-table {
          background-color: #ffffff !important;
        }

        .light-theme-table .ant-table-thead > tr > th {
          background-color: #fafafa !important;
          font-size: 16px !important;
          padding: 12px 16px !important;
        }

        .light-theme-table .ant-table-tbody > tr > td {
          padding: 12px 16px !important;
          font-size: 15px !important;
        }

        .light-theme-table .ant-table-tbody > tr:hover > td {
          background-color: #f5f5f5 !important;
        }

        .page-title {
          font-size: 32px;
          font-weight: 700;
          margin-bottom: 12px;
        }

        .column-title {
          font-size: 20px;
          font-weight: 600;
        }

        .vehicle-number-btn {
          font-size: 19px;
          padding: 0;
          font-weight: 600;
        }

        .table-text {
          font-size: 19px;
        }

        .owner-text {
          color: #666;
          font-size: 19px;
        }

        .action-button {
          border-radius: 50%;
          width: 36px;
          height: 36px;
        }

        .styled-card {
          border-radius: 10px;
          margin-bottom: 20px;
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
        }

        .add-button {
          border-radius: 8px;
          height: 44px;
          font-size: 16px;
          font-weight: 500;
          padding: 0 20px;
        }

        .add-button .anticon {
          font-size: 18px;
        }


        .form-label {
          font-size: 16px;
        }

        .form-input {
          font-size: 16px;
          height: 45px;
        }

        .form-input-number {
          font-size: 16px;
          width: 100%;
          height: 45px;
        }

        .form-textarea {
          font-size: 16px;
        }

        .form-select {
          height: 45px;
          font-size: 18px !important;
        }

        /* Style for dropdown items */
        .ant-select-item {
          font-size: 18px !important;
          padding: 10px 12px !important;
        }
        
        /* Style for selected item in dropdown */
        .ant-select-selection-item {
          font-size: 18px !important;
        }

        .drawer-title {
          font-size: 20px;
        }

        .drawer-subtitle {
          color: #666;
          font-size: 16px;
        }

        .service-card {
          border-radius: 10px;
          margin-bottom: 16px;
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
        }

        .service-card-title {
          font-size: 18px;
        }

        .service-tag {
          font-size: 14px;
          padding: 4px 8px;
          margin: 2px;
        }
        /* styles.css or styled component */
        .styled-modal .ant-modal-content {
          padding: 32px;
          font-size: 18px; /* Increase base font */
          max-height: 90vh; /* Adjust height */
          overflow-y: auto;
        }
        .styled-modal .form-label {
          font-size: 19px; /* Labels */
        }
        
        .styled-modal .form-input,
        .styled-modal .form-textarea,
        .styled-modal .form-select,
        .styled-modal .form-input-number {
          font-size: 16px; /* Inputs */
          height: 44px;
        }

        .styled-modal .ant-form-item-label > label {
          font-size: 16px;
        }
        
        /* Increase placeholder font size */
        .styled-modal .ant-input::placeholder,
        .styled-modal .ant-input-number-input::placeholder,
        .styled-modal .ant-select-selection-placeholder {
          font-size: 18px !important;
        }

        /* Modal OK and Cancel buttons */
.styled-modal .ant-btn-primary, 
.styled-modal .ant-btn-default {
  height: 44px !important;
  font-size: 16px !important;
  padding: 0 24px !important;
  border-radius: 6px;
}




      `}</style>
    </div>
  );
};

export default AdminVehicleProfile;
