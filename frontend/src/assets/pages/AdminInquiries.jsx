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
  Badge,
  Divider,
  Spin,
} from "antd";
import {
  MessageOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  QuestionCircleOutlined,
  ReloadOutlined,
  SendOutlined,
} from "@ant-design/icons";
import { motion } from "framer-motion";

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;
const { Search } = Input;
const { TextArea } = Input;

const AdminInquiries = () => {
  const navigate = useNavigate();
  const [inquiries, setInquiries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [responseModalVisible, setResponseModalVisible] = useState(false);
  const [currentInquiry, setCurrentInquiry] = useState(null);
  const [searchText, setSearchText] = useState("");
  const [stats, setStats] = useState({
    totalInquiries: 0,
    pendingInquiries: 0,
    resolvedInquiries: 0,
    closedInquiries: 0,
  });
  const [responseForm] = Form.useForm();
  const [token, setToken] = useState("");

  // Authentication check on component mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const user = JSON.parse(localStorage.getItem("user"));
        if (!user || (user.role !== "admin" && user.role !== "technician")) {
          console.log("Unauthorized access attempt");
          navigate("/login");
          return;
        }

        const token = user.token;
        setToken(token);

        try {
          setLoading(true);
          await fetchInquiries(token);
        } catch (error) {
          console.error("Error fetching initial data:", error);
          if (error.response?.status === 401 || error.response?.status === 403) {
            navigate("/login");
          }
          setError("Failed to fetch inquiries");
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

  // Calculate statistics when inquiries change
  useEffect(() => {
    const totalInquiries = inquiries.length;
    const pendingInquiries = inquiries.filter((inquiry) => inquiry.status === 'pending').length;
    const resolvedInquiries = inquiries.filter((inquiry) => inquiry.status === 'resolved').length;
    const closedInquiries = inquiries.filter((inquiry) => inquiry.status === 'closed').length;

    setStats({
      totalInquiries,
      pendingInquiries,
      resolvedInquiries,
      closedInquiries,
    });
  }, [inquiries]);

  const fetchInquiries = async (authToken) => {
    try {
      const response = await axios.get("http://localhost:3000/api/inquiries", {
        withCredentials: true,
        headers: {
          Authorization: `Bearer ${authToken || token}`,
          "Content-Type": "application/json",
        },
      });
      setInquiries(response.data);
    } catch (error) {
      console.error("Error fetching inquiries:", error);
      if (error.response?.status === 401 || error.response?.status === 403) {
        toast.error("Authentication error. Please log in again.");
        navigate("/login");
        return;
      }
      toast.error("Failed to fetch inquiries");
      throw error;
    }
  };

  const handleRespondToInquiry = (record) => {
    setCurrentInquiry(record);
    responseForm.resetFields();
    setResponseModalVisible(true);
  };

  const handleUpdateStatus = async (inquiryId, status) => {
    try {
      await axios.patch(`http://localhost:3000/api/inquiries/${inquiryId}/status`, 
        { status },
        {
          withCredentials: true,
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );
      toast.success(`Inquiry status updated to ${status.toUpperCase()}`);
      fetchInquiries(token);
    } catch (error) {
      console.error("Error updating inquiry status:", error);
      toast.error("Failed to update inquiry status");
    }
  };

  const handleResponseSubmit = async () => {
    try {
      const values = await responseForm.validateFields();
      
      await axios.post(
        `http://localhost:3000/api/inquiries/${currentInquiry.inquiry_id}/respond`,
        {
          response: values.response,
          status: 'resolved' // Always set to resolved when responding
        },
        {
          withCredentials: true,
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );
      
      toast.success("Response submitted successfully");
      setResponseModalVisible(false);
      fetchInquiries(token);
    } catch (error) {
      console.error("Error submitting response:", error);
      toast.error("Failed to submit response");
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

  const getStatusTag = (status) => {
    switch (status) {
      case 'pending':
        return <Tag color="orange">Pending</Tag>;
      case 'resolved':
        return <Tag color="green">Resolved</Tag>;
      case 'closed':
        return <Tag color="blue">Closed</Tag>;
      default:
        return <Tag color="default">{status}</Tag>;
    }
  };

  const filteredInquiries = inquiries.filter(
    (inquiry) =>
      inquiry.user_name?.toLowerCase().includes(searchText.toLowerCase()) ||
      inquiry.description?.toLowerCase().includes(searchText.toLowerCase()) ||
      inquiry.status?.toLowerCase().includes(searchText.toLowerCase()) ||
      inquiry.user_email?.toLowerCase().includes(searchText.toLowerCase())
  );

  const inquiryColumns = [
    {
      title: "Customer",
      dataIndex: "user_name",
      key: "user_name",
      sorter: (a, b) => a.user_name?.localeCompare(b.user_name),
    },
    {
      title: "Email",
      dataIndex: "user_email",
      key: "user_email",
      ellipsis: true,
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      render: (status) => getStatusTag(status),
      sorter: (a, b) => a.status?.localeCompare(b.status),
      filters: [
        { text: 'Pending', value: 'pending' },
        { text: 'Resolved', value: 'resolved' },
        { text: 'Closed', value: 'closed' },
      ],
      onFilter: (value, record) => record.status === value,
    },
    {
      title: "Date",
      dataIndex: "created_at",
      key: "created_at",
      render: (date) => new Date(date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      }),
      sorter: (a, b) => new Date(a.created_at) - new Date(b.created_at),
    },
    {
      title: "Response",
      key: "response_status",
      render: (_, record) => (
        record.response ? 
          <Badge status="success" text="Responded" /> : 
          <Badge status="warning" text="No Response" />
      ),
      filters: [
        { text: 'Responded', value: 'responded' },
        { text: 'Not Responded', value: 'not_responded' },
      ],
      onFilter: (value, record) => 
        (value === 'responded' && record.response) || 
        (value === 'not_responded' && !record.response),
    },
    {
      title: "Actions",
      key: "actions",
      render: (_, record) => (
        <Space size="small">
          <Tooltip title="Respond">
            <Button
              type="primary"
              icon={<SendOutlined />}
              size="large"
              onClick={() => handleRespondToInquiry(record)}
              disabled={record.status === 'closed'}
            />
          </Tooltip>
        </Space>
      ),
    },
  ];

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
              Customer Inquiries Management
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
          title={<Title level={4} className="section-title">Inquiry Statistics</Title>}
        >
          <Row gutter={16}>
            <Col xs={24} sm={12} md={6}>
              <Statistic
                title="Total Inquiries"
                value={stats.totalInquiries}
                valueStyle={{ color: "#3f8600" }}
                prefix={<MessageOutlined />}
              />
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Statistic
                title="Pending"
                value={stats.pendingInquiries}
                valueStyle={{ color: "#faad14" }}
                prefix={<QuestionCircleOutlined />}
              />
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Statistic
                title="Resolved"
                value={stats.resolvedInquiries}
                valueStyle={{ color: "#3f8600" }}
                prefix={<CheckCircleOutlined />}
              />
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Statistic
                title="Closed"
                value={stats.closedInquiries}
                valueStyle={{ color: "#1890ff" }}
                prefix={<CloseCircleOutlined />}
              />
            </Col>
          </Row>
        </Card>

        <Card 
          className="mb-8 content-card" 
          bodyStyle={{ padding: "20px" }}
        >
          <div className="flex justify-between items-center mb-4">
            <Title level={4} className="section-title">All Customer Inquiries</Title>
            <Button
              type="primary"
              icon={<ReloadOutlined />}
              onClick={() => fetchInquiries(token)}
              size="large"
              className="action-button"
            >
              Refresh
            </Button>
          </div>

          <div className="mb-6">
            <Search
              placeholder="Search inquiries..."
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
              <p>Loading inquiries...</p>
            </div>
          ) : (
            <Table
              columns={inquiryColumns}
              dataSource={filteredInquiries.map((item) => ({ ...item, key: item.inquiry_id }))}
              pagination={{ 
                pageSize: 10,
                position: ['bottomCenter'],
                showTotal: (total) => (
                  <Text>
                    Total {total} records
                  </Text>
                )
              }}
              className="inquiries-table"
              expandable={{
                expandedRowRender: (record) => (
                  <div className="p-4">
                    <div className="mb-4">
                      <Text strong style={{ color: "#1890ff" }}>Inquiry:</Text>
                      <Paragraph style={{ marginTop: 8, padding: 12, background: "#f0f2f5", borderRadius: 8 }}>
                        {record.description}
                      </Paragraph>
                    </div>
                    
                    {record.response && (
                      <div>
                        <Divider />
                        <Text strong style={{ color: "#52c41a" }}>Response:</Text>
                        <Paragraph style={{ marginTop: 8, padding: 12, background: "#f0f2f5", borderRadius: 8 }}>
                          {record.response}
                        </Paragraph>
                        <Text type="secondary">
                          Responded on: {record.responded_at ? new Date(record.responded_at).toLocaleString() : 'N/A'}
                        </Text>
                      </div>
                    )}
                  </div>
                ),
              }}
            />
          )}
        </Card>
      </div>

      {/* Response Modal */}
      <Modal
        title={
          <Title level={4} className="modal-title">
            Respond to Inquiry
          </Title>
        }
        open={responseModalVisible}
        onOk={handleResponseSubmit}
        onCancel={() => setResponseModalVisible(false)}
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
        {currentInquiry && (
          <div className="mb-4">
            <Text strong>Customer Inquiry:</Text>
            <Paragraph style={{ background: "#f0f2f5", padding: 12, borderRadius: 8, marginTop: 8 }}>
              {currentInquiry.description}
            </Paragraph>
            <div className="mt-2">
              <Text type="secondary">From: {currentInquiry.user_name}</Text>
              <br />
              <Text type="secondary">Date: {new Date(currentInquiry.created_at).toLocaleString()}</Text>
            </div>
          </div>
        )}
        
        <Form
          form={responseForm}
          layout="vertical"
          name="responseForm"
        >
          <Form.Item
            name="response"
            label="Your Response"
            rules={[{ required: true, message: "Please enter your response" }]}
          >
            <TextArea rows={6} placeholder="Enter your response to the customer's inquiry" />
          </Form.Item>
        </Form>
      </Modal>

      <style jsx global>{`
        .inquiries-table .ant-table-thead > tr > th {
          background-color: #f0f5ff;
          font-size: 20px;
          font-weight: 600;
          padding: 15px 20px;
          color: #333;
        }
        
        .inquiries-table .ant-table-tbody > tr > td {
          font-size: 19px;
          padding: 15px 20px;
        }
        
        .inquiries-table .ant-table-tbody > tr:nth-child(odd) {
          background-color: #fafafa;
        }
        
        .inquiries-table .ant-table-tbody > tr:hover > td {
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

export default AdminInquiries; 