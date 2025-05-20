import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import {
  Table,
  Button,
  Modal,
  Form,
  Input,
  InputNumber,
  Select,
  Space,
  Card,
  Typography,
  Tag,
  Tooltip,
  Popconfirm,
  Statistic,
  Row,
  Col,
  Alert,
  Switch,
  Spin,
} from "antd";
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  CarOutlined,
  StopOutlined,
  CheckCircleOutlined,
  TagOutlined,
} from "@ant-design/icons";
import { motion } from "framer-motion";

const { Title, Text } = Typography;
const { Option } = Select;
const { Search } = Input;
const { TextArea } = Input;

const AdminService = () => {
  const navigate = useNavigate();
  const [services, setServices] = useState([]);
  const [motorVehicles, setMotorVehicles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [serviceModalVisible, setServiceModalVisible] = useState(false);
  const [editingService, setEditingService] = useState(null);
  const [searchText, setSearchText] = useState("");
  const [stats, setStats] = useState({
    totalServices: 0,
    activeServices: 0,
    inactiveServices: 0,
  });
  const [serviceForm] = Form.useForm();
  const [token, setToken] = useState("");

  // Authentication check on component mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const user = JSON.parse(localStorage.getItem("user"));
        if (!user || user.role !== "admin") {
          console.log("Unauthorized access attempt");
          navigate("/login");
          return;
        }

        const token = user.token;
        setToken(token);

        try {
          setLoading(true);
          await Promise.all([
            fetchServices(token),
            fetchMotorVehicles(token),
          ]);
        } catch (error) {
          console.error("Error fetching initial data:", error);
          if (error.response?.status === 401 || error.response?.status === 403) {
            navigate("/login");
          }
          setError("Failed to fetch initial data");
        } finally {
          setLoading(false);
        }
      } catch (error) {
        console.error("Auth check error:", error);
        navigate("/login");
      }
    };

    checkAuth();
  }, [navigate]);

  // Calculate statistics when services change
  useEffect(() => {
    const totalServices = services.length;
    const activeServices = services.filter((service) => service.is_active).length;
    const inactiveServices = totalServices - activeServices;

    setStats({
      totalServices,
      activeServices,
      inactiveServices,
    });
  }, [services]);

  const fetchServices = async (authToken) => {
    try {
      const response = await axios.get("http://localhost:3000/api/services", {
        withCredentials: true,
        headers: {
          Authorization: `Bearer ${authToken || token}`,
          "Content-Type": "application/json",
        },
      });
      setServices(response.data);
    } catch (error) {
      console.error("Error fetching services:", error);
      if (error.response?.status === 401 || error.response?.status === 403) {
        toast.error("Authentication error. Please log in again.");
        navigate("/login");
        return;
      }
      toast.error("Failed to fetch services");
      throw error;
    }
  };

  const fetchMotorVehicles = async (authToken) => {
    try {
      const response = await axios.get(
        "http://localhost:3000/api/services/vehicles/all",
        {
          withCredentials: true,
          headers: {
            Authorization: `Bearer ${authToken || token}`,
            "Content-Type": "application/json",
          },
        }
      );
      setMotorVehicles(response.data);
    } catch (error) {
      console.error("Error fetching motor vehicles:", error);
      if (error.response?.status === 401 || error.response?.status === 403) {
        toast.error("Authentication error. Please log in again.");
        navigate("/login");
        return;
      }
      toast.error("Failed to fetch motor vehicles");
      throw error;
    }
  };

  const handleAddService = () => {
    setEditingService(null);
    serviceForm.resetFields();
    setServiceModalVisible(true);
  };

  const handleEditService = (record) => {
    setEditingService(record);
    serviceForm.setFieldsValue({
      name: record.name,
      description: record.description,
      motor_vehicle_id: record.motor_vehicle_id,
      price: record.price,
      is_active: record.is_active,
    });
    setServiceModalVisible(true);
  };

  const handleDeleteService = async (serviceId) => {
    try {
      await axios.delete(`http://localhost:3000/api/services/${serviceId}`, {
        withCredentials: true,
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });
      toast.success("Service deleted successfully");
      fetchServices(token);
    } catch (error) {
      console.error("Error deleting service:", error);
      if (error.response?.status === 409) {
        toast.error("Cannot delete service: It has associated promotions or is in use");
      } else {
        toast.error("Failed to delete service");
      }
    }
  };

  const handleDeactivateService = async (serviceId, currentStatus) => {
    try {
      await axios.put(
        `http://localhost:3000/api/services/${serviceId}/deactivate`,
        {},
        {
          withCredentials: true,
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );
      toast.success("Service deactivated successfully");
      fetchServices(token);
    } catch (error) {
      console.error("Error deactivating service:", error);
      toast.error("Failed to deactivate service");
    }
  };

  const handleToggleServiceStatus = async (serviceId, currentStatus) => {
    try {
      await axios.put(
        `http://localhost:3000/api/services/${serviceId}`,
        { is_active: !currentStatus },
        {
          withCredentials: true,
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );
      toast.success(`Service ${!currentStatus ? "activated" : "deactivated"} successfully`);
      fetchServices(token);
    } catch (error) {
      console.error("Error toggling service status:", error);
      toast.error(`Failed to ${!currentStatus ? "activate" : "deactivate"} service`);
    }
  };

  const handleServiceModalOk = async () => {
    try {
      const values = await serviceForm.validateFields();
      
      if (editingService) {
        // Update existing service
        await axios.put(
          `http://localhost:3000/api/services/${editingService.service_id}`,
          values,
          {
            withCredentials: true,
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          }
        );
        toast.success("Service updated successfully");
      } else {
        // Create new service
        await axios.post("http://localhost:3000/api/services", values, {
          withCredentials: true,
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });
        toast.success("Service created successfully");
      }
      
      setServiceModalVisible(false);
      fetchServices(token);
    } catch (error) {
      console.error("Error saving service:", error);
      if (error.response?.status === 409) {
        toast.error("A service with this name already exists for this vehicle type");
      } else {
        toast.error("Failed to save service");
      }
    }
  };

  const handleSearch = (value) => {
    setSearchText(value);
  };

  // Custom styling for modal components
  const getModalBodyStyle = () => {
    return {
      padding: "20px",
      borderRadius: "0 0 10px 10px"
    };
  };

  const getModalHeaderStyle = () => {
    return {
      padding: "16px 24px",
      borderBottom: "1px solid #e8e8e8",
      borderRadius: "10px 10px 0 0"
    };
  };

  const filteredServices = services.filter(
    (service) =>
      service.name.toLowerCase().includes(searchText.toLowerCase()) ||
      service.vehicle_type.toLowerCase().includes(searchText.toLowerCase())
  );

  const serviceColumns = [
    {
      title: "Name",
      dataIndex: "name",
      key: "name",
      sorter: (a, b) => a.name.localeCompare(b.name),
    },
    {
      title: "Vehicle Type",
      dataIndex: "vehicle_type",
      key: "vehicle_type",
      render: (text) => <Tag color="blue">{text}</Tag>,
      sorter: (a, b) => a.vehicle_type.localeCompare(b.vehicle_type),
    },
    {
      title: "Price",
      dataIndex: "price",
      key: "price",
      render: (price) => `Rs.${parseFloat(price).toFixed(2)}`,
      sorter: (a, b) => a.price - b.price,
    },
    {
      title: "Status",
      dataIndex: "is_active",
      key: "is_active",
      render: (isActive) => (
        isActive ? (
          <Tag color="green">Active</Tag>
        ) : (
          <Tag color="red">Inactive</Tag>
        )
      ),
      sorter: (a, b) => (a.is_active === b.is_active ? 0 : a.is_active ? -1 : 1),
    },
    {
      title: "Actions",
      key: "actions",
      render: (_, record) => (
        <Space size="small">
          <Tooltip title="Edit">
            <Button
              type="primary"
              icon={<EditOutlined />}
              size="large"
              onClick={() => handleEditService(record)}
            />
          </Tooltip>
          <Tooltip title={record.is_active ? "Deactivate" : "Activate"}>
            <Button
              type={record.is_active ? "default" : "primary"}
              icon={record.is_active ? <StopOutlined /> : <CheckCircleOutlined />}
              size="large"
              onClick={() => handleToggleServiceStatus(record.service_id, record.is_active)}
            />
          </Tooltip>
          <Tooltip title="Delete">
            <Popconfirm
              title="Are you sure you want to delete this service?"
              onConfirm={() => handleDeleteService(record.service_id)}
              okText="Yes"
              cancelText="No"
              placement="left"
            >
              <Button danger icon={<DeleteOutlined />} size="large" />
            </Popconfirm>
          </Tooltip>
        </Space>
      ),
    },
  ];

  const navigateToPromotions = () => {
    navigate('/admin/promotions');
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      style={lightThemeStyles.page}
    >
      <div className="max-w-8xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Title level={2} className="page-title">
              Service Management
            </Title>
          </motion.div>
        </div>

        {error && (
          <Alert
            message="Error"
            description={error}
            type="error"
            showIcon
            closable
            onClose={() => setError('')}
            className="mb-4"
          />
        )}

        <Card 
          className="mb-8 content-card" 
          bodyStyle={{ padding: "20px" }}
          title={<Title level={4} className="section-title">Service Statistics</Title>}
        >
          <Row gutter={16}>
            <Col xs={24} sm={12} md={8}>
              <Statistic
                title="Total Services"
                value={stats.totalServices}
                valueStyle={{ color: "#3f8600" }}
                prefix={<CarOutlined />}
              />
            </Col>
            <Col xs={24} sm={12} md={8}>
              <Statistic
                title="Active Services"
                value={stats.activeServices}
                valueStyle={{ color: "#3f8600" }}
                prefix={<CheckCircleOutlined />}
              />
            </Col>
            <Col xs={24} sm={12} md={8}>
              <Statistic
                title="Inactive Services"
                value={stats.inactiveServices}
                valueStyle={{ color: "#cf1322" }}
                prefix={<StopOutlined />}
              />
            </Col>
          </Row>
        </Card>

        <Card 
          className="mb-8 content-card" 
          bodyStyle={{ padding: "20px" }}
        >
          <div className="flex justify-between items-center mb-4">
            <Title level={4} className="section-title">All Services</Title>
            <Space>
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={handleAddService}
                size="large"
                className="action-button"
              >
                Add Service
              </Button>
              <Button
                type="default"
                icon={<TagOutlined />}
                onClick={navigateToPromotions}
                size="large"
                className="action-button"
              >
                Manage Promotions
              </Button>
            </Space>
          </div>

          <div className="mb-6">
            <Search
              placeholder="Search services..."
              allowClear
              enterButton="Search"
              size="large"
              onSearch={handleSearch}
              onChange={(e) => setSearchText(e.target.value)}
            />
          </div>

          {loading ? (
            <div className="loading-container">
              <Spin size="large" />
              <p>Loading services...</p>
            </div>
          ) : (
            <Table
              columns={serviceColumns}
              dataSource={filteredServices.map((item) => ({ ...item, key: item.service_id }))}
              pagination={{ 
                pageSize: 10,
                position: ['bottomCenter'],
                showTotal: (total) => (
                  <Text>
                    Total {total} records
                  </Text>
                )
              }}
              className="services-table"
              expandable={{
                expandedRowRender: (record) => (
                  <div className="p-4">
                    <Text strong>Description:</Text>
                    <div className="mt-2 p-4 bg-gray-100 rounded-lg">
                      {record.description || "No description available"}
                    </div>
                  </div>
                ),
              }}
            />
          )}
        </Card>
      </div>

      {/* Service Modal */}
      <Modal
  title={
    <Title level={4} style={{ fontSize: '25px' }}>
      {editingService ? "Edit Service" : "Add New Service"}
    </Title>
  }
  open={serviceModalVisible}
  onOk={handleServiceModalOk}
  onCancel={() => setServiceModalVisible(false)}
  confirmLoading={loading}
  width={600}
  centered
  styles={{
    header: { ...getModalHeaderStyle() },
    body: { ...getModalBodyStyle() },
    footer: {
      borderTop: "1px solid #e8e8e8",
      borderRadius: "0 0 10px 10px",
      padding: "10px 16px"
    }
  }}
>
  <Form
    form={serviceForm}
    layout="vertical"
    name="serviceForm"
    initialValues={{ is_active: true }}
  >
    <Form.Item
      name="name"
      label={<span style={{ fontSize: "18px" }}>Service Name</span>}
      rules={[{ required: true, message: "Please enter the service name" }]}
    >
      <Input
        placeholder="Enter service name"
        style={{ fontSize: "16px" }}
      />
    </Form.Item>

    <Form.Item
      name="description"
      label={<span style={{ fontSize: "18px" }}>Description</span>}
    >
      <TextArea
        rows={4}
        placeholder="Enter service description"
        style={{ fontSize: "16px" }}
      />
    </Form.Item>

    <Form.Item
      name="motor_vehicle_id"
      label={<span style={{ fontSize: "18px" }}>Vehicle Type</span>}
      rules={[{ required: true, message: "Please select a vehicle type" }]}
    >
      <Select
        placeholder="Select vehicle type"
        style={{ fontSize: "16px" }}
        dropdownStyle={{ fontSize: "16px" }}
      >
        {motorVehicles.map((vehicle) => (
          <Option key={vehicle.motor_vehicle_id} value={vehicle.motor_vehicle_id}>
            {vehicle.vehicle_type}
          </Option>
        ))}
      </Select>
    </Form.Item>

    <Form.Item
      name="price"
      label={<span style={{ fontSize: "18px" }}>Price</span>}
      rules={[{ required: true, message: "Please enter the price" }]}
    >
      <InputNumber
        min={300}
        step={0.01}
        precision={2}
        style={{ width: "100%", fontSize: "16px" }}
        prefix="Rs."
        placeholder="0.00"
      />
    </Form.Item>

    <Form.Item
      name="is_active"
      label={<span style={{ fontSize: "18px" }}>Status</span>}
      valuePropName="checked"
    >
      <Switch
        checkedChildren="Active"
        unCheckedChildren="Inactive"
        style={{ fontSize: "16px" }}
      />
    </Form.Item>
  </Form>
</Modal>

      <style jsx global>{`
        .services-table .ant-table-thead > tr > th {
          background-color: #f0f5ff;
          font-size: 20px;
          font-weight: 600;
          padding: 15px 20px;
          color: #333;
        }
        
        .services-table .ant-table-tbody > tr > td {
          font-size: 19px;
          padding: 15px 20px;
        }
        
        .services-table .ant-table-tbody > tr:nth-child(odd) {
          background-color: #fafafa;
        }
        
        .services-table .ant-table-tbody > tr:hover > td {
          background-color: #e6f7ff;
        }
        
        .page-title {
          font-size: 28px !important;
          font-weight: 600 !important;
          color: #333 !important;
          margin-bottom: 24px !important;
        }
        
        .section-title {
          font-size: 22px !important;
          font-weight: 600 !important;
          color: #333 !important;
          margin-bottom: 16px !important;
        }
        
        .modal-title {
          font-size: 20px !important;
          font-weight: 600 !important;
          color: #333 !important;
          margin: 0 !important;
        }
        
        .content-card {
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.03), 
                      0 2px 4px rgba(0, 0, 0, 0.03), 
                      0 4px 8px rgba(0, 0, 0, 0.03);
          border-radius: 8px;
        }
        
        .action-button {
          height: 40px;
          font-size: 16px;
        }
        
        .loading-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 40px 0;
        }
        
        .loading-container p {
          margin-top: 16px;
          font-size: 16px;
          color: #666;
        }
      `}</style>
    </motion.div>
  );
};

// Light theme styles
const lightThemeStyles = {
  page: {
    backgroundColor: "#ffffff",
    minHeight: "100vh",
    padding: "20px",
    width: "100%",
  },
};

export default AdminService; 