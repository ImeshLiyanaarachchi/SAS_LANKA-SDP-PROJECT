import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { DatePicker } from "antd";
import dayjs from "dayjs";
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
  TagOutlined,
  CalendarOutlined,
  PercentageOutlined,
  ArrowLeftOutlined,
} from "@ant-design/icons";
import { motion } from "framer-motion";

const { Title, Text } = Typography;
const { Option } = Select;
const { Search } = Input;

const AdminPromotion = () => {
  const navigate = useNavigate();
  const [promotions, setPromotions] = useState([]);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [modalVisible, setModalVisible] = useState(false);
  const [editingPromotion, setEditingPromotion] = useState(null);
  const [searchText, setSearchText] = useState("");
  const [stats, setStats] = useState({
    totalPromotions: 0,
    activePromotions: 0,
    upcomingPromotions: 0,
    expiredPromotions: 0,
  });
  const [form] = Form.useForm();
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
          await Promise.all([fetchPromotions(token), fetchServices(token)]);
        } catch (error) {
          console.error("Error fetching initial data:", error);
          if (
            error.response?.status === 401 ||
            error.response?.status === 403
          ) {
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

  // Calculate statistics when promotions change
  useEffect(() => {
    const today = new Date();
    const totalPromotions = promotions.length;
    const activePromotions = promotions.filter(
      (promotion) =>
        promotion.is_active &&
        new Date(promotion.start_date) <= today &&
        new Date(promotion.end_date) >= today
    ).length;
    const upcomingPromotions = promotions.filter(
      (promotion) =>
        promotion.is_active && new Date(promotion.start_date) > today
    ).length;
    const expiredPromotions = promotions.filter(
      (promotion) => promotion.is_active && new Date(promotion.end_date) < today
    ).length;

    setStats({
      totalPromotions,
      activePromotions,
      upcomingPromotions,
      expiredPromotions,
    });
  }, [promotions]);

  const fetchPromotions = async (authToken) => {
    try {
      const response = await axios.get("http://localhost:3000/api/promotions", {
        withCredentials: true,
        headers: {
          Authorization: `Bearer ${authToken || token}`,
          "Content-Type": "application/json",
        },
      });
      setPromotions(response.data);
    } catch (error) {
      console.error("Error fetching promotions:", error);
      if (error.response?.status === 401 || error.response?.status === 403) {
        toast.error("Authentication error. Please log in again.");
        navigate("/login");
        return;
      }
      toast.error("Failed to fetch promotions");
      throw error;
    }
  };

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

  const handleAddPromotion = () => {
    setEditingPromotion(null);
    form.resetFields();
    setModalVisible(true);
  };

  const handleEditPromotion = (record) => {
    setEditingPromotion(record);

    form.setFieldsValue({
      service_id: record.service_id,
      discount_percentage: record.discount_percentage,
      start_date: dayjs(record.start_date),
      end_date: dayjs(record.end_date),
      is_active: record.is_active,
    });

    setModalVisible(true);
  };

  const handleDeletePromotion = async (promotionId) => {
    try {
      await axios.delete(
        `http://localhost:3000/api/promotions/${promotionId}`,
        {
          withCredentials: true,
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );
      toast.success("Promotion deleted successfully");
      fetchPromotions(token);
    } catch (error) {
      console.error("Error deleting promotion:", error);
      toast.error("Failed to delete promotion");
    }
  };

  const handleModalOk = async () => {
    try {
      const values = await form.validateFields();

      // Format dates properly for MySQL
      const formattedValues = {
        ...values,
        start_date: values.start_date
          ? values.start_date.format("YYYY-MM-DD")
          : undefined,
        end_date: values.end_date
          ? values.end_date.format("YYYY-MM-DD")
          : undefined,
      };

      if (editingPromotion) {
        // Update existing promotion
        await axios.put(
          `http://localhost:3000/api/promotions/${editingPromotion.promotion_id}`,
          formattedValues,
          {
            withCredentials: true,
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          }
        );
        toast.success("Promotion updated successfully");
      } else {
        // Create new promotion
        await axios.post(
          "http://localhost:3000/api/promotions",
          formattedValues,
          {
            withCredentials: true,
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          }
        );
        toast.success("Promotion created successfully");
      }

      setModalVisible(false);
      fetchPromotions(token);
    } catch (error) {
      console.error("Error saving promotion:", error);

      // Enhanced error handling with more detailed logging
      if (error.response) {
        console.log("Error response data:", error.response.data);
        console.log("Error response status:", error.response.status);

        if (error.response.status === 409) {
          toast.error(
            "An active promotion already exists for this service during the specified date range",
            {
              position: "top-center",
              autoClose: 5000,
              hideProgressBar: false,
              closeOnClick: true,
              pauseOnHover: true,
              draggable: true,
            }
          );
        } else if (error.response.data?.message) {
          toast.error(error.response.data.message, {
            position: "top-center",
            autoClose: 5000,
          });
        } else {
          toast.error(`Failed to save promotion: ${error.message}`, {
            position: "top-center",
            autoClose: 5000,
          });
        }
      } else {
        toast.error(`Network error: ${error.message}`, {
          position: "top-center",
          autoClose: 5000,
        });
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
      borderRadius: "0 0 10px 10px",
    };
  };

  const getModalHeaderStyle = () => {
    return {
      padding: "16px 24px",
      borderBottom: "1px solid #e8e8e8",
      borderRadius: "10px 10px 0 0",
    };
  };

  const filteredPromotions = promotions.filter(
    (promotion) =>
      promotion.service_name
        ?.toLowerCase()
        .includes(searchText.toLowerCase()) ||
      promotion.vehicle_type?.toLowerCase().includes(searchText.toLowerCase())
  );

  const columns = [
    {
      title: "Service",
      dataIndex: "service_name",
      key: "service_name",
      sorter: (a, b) => a.service_name.localeCompare(b.service_name),
    },
    {
      title: "Vehicle Type",
      dataIndex: "vehicle_type",
      key: "vehicle_type",
      render: (text) => <Tag color="blue">{text}</Tag>,
    },
    {
      title: "Discount",
      dataIndex: "discount_percentage",
      key: "discount_percentage",
      render: (discount) => `${Math.round(discount)}%`,
      sorter: (a, b) => a.discount_percentage - b.discount_percentage,
    },
    {
      title: "Start Date",
      dataIndex: "start_date",
      key: "start_date",
      render: (date) => new Date(date).toLocaleDateString(),
      sorter: (a, b) => new Date(a.start_date) - new Date(b.start_date),
    },
    {
      title: "End Date",
      dataIndex: "end_date",
      key: "end_date",
      render: (date) => new Date(date).toLocaleDateString(),
      sorter: (a, b) => new Date(a.end_date) - new Date(b.end_date),
    },
    {
      title: "Status",
      key: "status",
      render: (_, record) => {
        const today = new Date();
        const startDate = new Date(record.start_date);
        const endDate = new Date(record.end_date);

        if (!record.is_active) {
          return <Tag color="red">Inactive</Tag>;
        } else if (startDate > today) {
          return <Tag color="blue">Upcoming</Tag>;
        } else if (endDate < today) {
          return <Tag color="orange">Expired</Tag>;
        } else {
          return <Tag color="green">Active</Tag>;
        }
      },
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
              onClick={() => handleEditPromotion(record)}
            />
          </Tooltip>
          <Tooltip title="Delete">
            <Popconfirm
              title="Are you sure you want to delete this promotion?"
              onConfirm={() => handleDeletePromotion(record.promotion_id)}
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

  const navigateToServices = () => {
    navigate("/admin/services");
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      style={lightThemeStyles.page}
    >
      <ToastContainer
        position="top-center"
        autoClose={5000}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
      />

      <div className="max-w-8xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
          >
            <div className="flex items-center">
              <Button
                type="text"
                icon={<ArrowLeftOutlined />}
                onClick={navigateToServices}
                style={{ marginRight: "12px" }}
                size="large"
              />
              <Title level={2} className="page-title">
                Promotion Management
              </Title>
            </div>
          </motion.div>
        </div>

        {error && (
          <Alert
            message="Error"
            description={error}
            type="error"
            showIcon
            closable
            onClose={() => setError("")}
            className="mb-4"
          />
        )}

        <Card
          className="mb-8 content-card"
          bodyStyle={{ padding: "20px" }}
          title={
            <Title level={4} className="section-title">
              Promotion Statistics
            </Title>
          }
        >
          <Row gutter={16}>
            <Col xs={24} sm={12} md={6}>
              <Statistic
                title="Total Promotions"
                value={stats.totalPromotions}
                valueStyle={{ color: "#1890ff" }}
                prefix={<TagOutlined />}
              />
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Statistic
                title="Active Promotions"
                value={stats.activePromotions}
                valueStyle={{ color: "#52c41a" }}
                prefix={<TagOutlined />}
              />
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Statistic
                title="Upcoming Promotions"
                value={stats.upcomingPromotions}
                valueStyle={{ color: "#1890ff" }}
                prefix={<CalendarOutlined />}
              />
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Statistic
                title="Expired Promotions"
                value={stats.expiredPromotions}
                valueStyle={{ color: "#faad14" }}
                prefix={<CalendarOutlined />}
              />
            </Col>
          </Row>
        </Card>

        <Card className="mb-8 content-card" bodyStyle={{ padding: "20px" }}>
          <div className="flex justify-between items-center mb-4">
            <Title level={4} className="section-title">
              All Promotions
            </Title>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={handleAddPromotion}
              size="large"
              className="action-button"
            >
              Add Promotion
            </Button>
          </div>

          <div className="mb-6">
            <Search
              placeholder="Search promotions..."
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
              <p>Loading promotions...</p>
            </div>
          ) : (
            <Table
              columns={columns}
              dataSource={filteredPromotions.map((item) => ({
                ...item,
                key: item.promotion_id,
              }))}
              pagination={{
                pageSize: 10,
                position: ["bottomCenter"],
                showTotal: (total) => <Text>Total {total} records</Text>,
              }}
              className="promotions-table"
            />
          )}
        </Card>
      </div>

      {/* Promotion Modal */}
      <Modal
        title={
          <Title level={4} style={{ fontSize: "25px" }}>
            {editingPromotion ? "Edit Promotion" : "Add New Promotion"}
          </Title>
        }
        open={modalVisible}
        onOk={handleModalOk}
        onCancel={() => setModalVisible(false)}
        confirmLoading={loading}
        width={600}
        centered
        styles={{
          header: { ...getModalHeaderStyle() },
          body: { ...getModalBodyStyle() },
          footer: {
            borderTop: "1px solid #e8e8e8",
            borderRadius: "0 0 10px 10px",
            padding: "10px 16px",
          },
        }}
      >
        <Form
          form={form}
          layout="vertical"
          className="promotion-form"
          initialValues={{ is_active: true }}
        >
          <Form.Item
            name="service_id"
            label={<span style={{ fontSize: "18px" }}>Service</span>}
            rules={[{ required: true, message: "Please select a service" }]}
          >
            <Select
              placeholder="Select service"
              style={{ fontSize: "18px" }}
              dropdownStyle={{ fontSize: "18px" }}
            >
              {services
                .filter((service) => service.is_active)
                .map((service) => (
                  <Option key={service.service_id} value={service.service_id}>
                    {service.name} ({service.vehicle_type}) - Rs.
                    {parseFloat(service.price).toFixed(2)}
                  </Option>
                ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="discount_percentage"
            label={
              <span style={{ fontSize: "18px" }}>Discount Percentage</span>
            }
            rules={[
              {
                required: true,
                message: "Please enter the discount percentage",
              },
              {
                type: "number",
                min: 5,
                max: 100,
                message: "Discount must be between 5% and 100%",
              },
            ]}
          >
            <InputNumber
              min={5}
              max={100}
              style={{ width: "100%", fontSize: "16px" }}
              placeholder="Enter discount percentage"
              formatter={(value) => `${value}%`}
              parser={(value) => {
                if (!value) return 0;
                return parseFloat(value.replace(/[^0-9.]/g, "")) || 0;
              }}
            />
          </Form.Item>

          <Form.Item
            name="start_date"
            label={<span style={{ fontSize: "18px" }}>Start Date</span>}
            rules={[
              { required: true, message: "Please select the start date" },
            ]}
          >
            <DatePicker
              style={{ width: "100%", fontSize: "16px" }}
              placeholder="Select start date"
              disabledDate={(current) => {
                const today = dayjs().startOf("day");
                const maxDate = dayjs().add(14, "day").endOf("day");
                return current && (current < today || current > maxDate);
              }}
            />
          </Form.Item>

          <Form.Item
            name="end_date"
            label={<span style={{ fontSize: "18px" }}>End Date</span>}
            rules={[{ required: true, message: "Please select the end date" }]}
          >
            <DatePicker
              style={{ width: "100%", fontSize: "16px" }}
              placeholder="Select end date"
              disabledDate={(current) => {
                const today = dayjs().startOf("day");
                const minDate = today.add(1, "month").startOf("day"); // At least 1 month from today
                const maxDate = today.add(6, "month").endOf("day"); // Max 6 months from today

                return current && (current < minDate || current > maxDate);
              }}
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
        .promotions-table .ant-table-thead > tr > th {
          background-color: #f0f5ff;
          font-size: 20px;
          font-weight: 600;
          padding: 15px 20px;
          color: #333;
        }

        .promotions-table .ant-table-tbody > tr > td {
          font-size: 19px;
          padding: 15px 20px;
        }

        .promotions-table .ant-table-tbody > tr:nth-child(odd) {
          background-color: #fafafa;
        }

        .promotions-table .ant-table-tbody > tr:hover > td {
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
            0 2px 4px rgba(0, 0, 0, 0.03), 0 4px 8px rgba(0, 0, 0, 0.03);
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

        /* Custom font size for Select */
        .promotion-form .ant-select-selector {
          font-size: 18px !important;
          height: 44px !important;
          display: flex;
          align-items: center;
        }

        /* Font size for dropdown options */
        .promotion-form .ant-select-item {
          font-size: 18px !important;
        }

        /* Font size for InputNumber */
        .promotion-form .ant-input-number-input {
          font-size: 18px !important;
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

export default AdminPromotion;
