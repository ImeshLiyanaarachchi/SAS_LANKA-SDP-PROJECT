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
  Rate,
  Progress,
  Divider,
} from "antd";
import {
  StarOutlined,
  DeleteOutlined,
  ReloadOutlined,
  UserOutlined,
  BarChartOutlined,
  StarFilled,
} from "@ant-design/icons";
import { motion } from "framer-motion";

const { Title, Text, Paragraph } = Typography;
const { Search } = Input;
const { TextArea } = Input;

const AdminFeedback = () => {
  const navigate = useNavigate();
  const [feedback, setFeedback] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [searchText, setSearchText] = useState("");
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [currentFeedback, setCurrentFeedback] = useState(null);
  const [stats, setStats] = useState({
    total_feedback: 0,
    average_rating: 0,
    five_star: 0,
    four_star: 0,
    three_star: 0,
    two_star: 0,
    one_star: 0,
    five_star_percent: 0,
    four_star_percent: 0,
    three_star_percent: 0,
    two_star_percent: 0,
    one_star_percent: 0,
  });
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
            fetchFeedback(token),
            fetchFeedbackStats(token),
          ]);
        } catch (error) {
          console.error("Error fetching initial data:", error);
          if (error.response?.status === 401 || error.response?.status === 403) {
            navigate("/login");
          }
          setError("Failed to fetch feedback data");
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

  const fetchFeedback = async (authToken) => {
    try {
      const response = await axios.get("http://localhost:3000/api/feedback", {
        withCredentials: true,
        headers: {
          Authorization: `Bearer ${authToken || token}`,
          "Content-Type": "application/json",
        },
      });
      setFeedback(response.data);
    } catch (error) {
      console.error("Error fetching feedback:", error);
      if (error.response?.status === 401 || error.response?.status === 403) {
        toast.error("Authentication error. Please log in again.");
        navigate("/login");
        return;
      }
      toast.error("Failed to fetch feedback");
      throw error;
    }
  };

  const fetchFeedbackStats = async (authToken) => {
    try {
      const response = await axios.get("http://localhost:3000/api/feedback/stats", {
        withCredentials: true,
        headers: {
          Authorization: `Bearer ${authToken || token}`,
          "Content-Type": "application/json",
        },
      });
      setStats(response.data);
    } catch (error) {
      console.error("Error fetching feedback stats:", error);
      if (error.response?.status === 401 || error.response?.status === 403) {
        // Already handled in fetchFeedback
        return;
      }
      toast.error("Failed to fetch feedback statistics");
      throw error;
    }
  };

  const handleDeleteFeedback = async (feedbackId) => {
    try {
      await axios.delete(`http://localhost:3000/api/feedback/${feedbackId}`, {
        withCredentials: true,
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });
      toast.success("Feedback deleted successfully");
      await Promise.all([
        fetchFeedback(token),
        fetchFeedbackStats(token),
      ]);
    } catch (error) {
      console.error("Error deleting feedback:", error);
      toast.error("Failed to delete feedback");
    }
  };

  const handleViewFeedbackDetails = (record) => {
    setCurrentFeedback(record);
    setDetailModalVisible(true);
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

  const getRatingColor = (rating) => {
    switch (Math.floor(rating)) {
      case 5:
        return "#52c41a"; // green
      case 4:
        return "#1890ff"; // blue
      case 3:
        return "#faad14"; // yellow
      case 2:
        return "#fa8c16"; // orange
      case 1:
      default:
        return "#f5222d"; // red
    }
  };

  const getRatingTag = (rating) => {
    const color = getRatingColor(rating);
    return (
      <Tag color={color} className="text-base px-3 py-1">
        {rating} <StarFilled style={{ fontSize: '12px' }} />
      </Tag>
    );
  };

  const filteredFeedback = feedback.filter(
    (item) =>
      (item.first_name && item.first_name.toLowerCase().includes(searchText.toLowerCase())) ||
      (item.last_name && item.last_name.toLowerCase().includes(searchText.toLowerCase())) ||
      (item.email && item.email.toLowerCase().includes(searchText.toLowerCase())) ||
      (item.description && item.description.toLowerCase().includes(searchText.toLowerCase()))
  );

  const feedbackColumns = [
    {
      title: "Customer",
      key: "customer",
      render: (_, record) => (
        <div>
          <div className="font-medium">{`${record.first_name || ''} ${record.last_name || ''}`}</div>
          <div className="text-gray-500 text-sm">{record.email}</div>
        </div>
      ),
      sorter: (a, b) => {
        const nameA = `${a.first_name || ''} ${a.last_name || ''}`;
        const nameB = `${b.first_name || ''} ${b.last_name || ''}`;
        return nameA.localeCompare(nameB);
      },
    },
    {
      title: "Rating",
      dataIndex: "rating",
      key: "rating",
      render: (rating) => <Rate disabled defaultValue={rating} />,
      sorter: (a, b) => a.rating - b.rating,
      filters: [
        { text: '5 Stars', value: 5 },
        { text: '4 Stars', value: 4 },
        { text: '3 Stars', value: 3 },
        { text: '2 Stars', value: 2 },
        { text: '1 Star', value: 1 },
      ],
      onFilter: (value, record) => record.rating === value,
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
      title: "Has Comment",
      key: "has_comment",
      render: (_, record) => (
        record.description ? 
          <Tag color="green">Yes</Tag> : 
          <Tag color="default">No</Tag>
      ),
      filters: [
        { text: 'With Comment', value: true },
        { text: 'No Comment', value: false },
      ],
      onFilter: (value, record) => (!!record.description) === value,
    },
    {
      title: "Actions",
      key: "actions",
      render: (_, record) => (
        <Space size="small">
          <Tooltip title="View Details">
            <Button
              type="primary"
              icon={<StarOutlined />}
              size="large"
              onClick={() => handleViewFeedbackDetails(record)}
            />
          </Tooltip>
          <Tooltip title="Delete">
            <Popconfirm
              title="Are you sure you want to delete this feedback?"
              onConfirm={() => handleDeleteFeedback(record.feedback_id)}
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
              Customer Feedback Management
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
          title={<Title level={4} className="section-title">Feedback Statistics</Title>}
        >
          <Row gutter={16} className="mb-4">
            <Col xs={24} sm={12} md={8}>
              <Statistic
                title="Total Feedback"
                value={stats.total_feedback}
                valueStyle={{ color: "#3f8600" }}
                prefix={<UserOutlined />}
              />
            </Col>
            <Col xs={24} sm={12} md={8}>
              <Statistic
                title="Average Rating"
                value={stats.average_rating}
                precision={1}
                valueStyle={{ color: getRatingColor(stats.average_rating) }}
                prefix={<StarOutlined />}
                suffix="/ 5"
              />
            </Col>
            <Col xs={24} sm={12} md={8}>
              <div>
                <Text strong>Rating Distribution</Text>
                <div className="mt-2">
                  <Rate disabled defaultValue={5} className="text-xs mr-2" /> 
                  <Progress percent={parseFloat(stats.five_star_percent)} size="small" strokeColor="#52c41a" />
                </div>
                <div className="mt-1">
                  <Rate disabled defaultValue={4} className="text-xs mr-2" /> 
                  <Progress percent={parseFloat(stats.four_star_percent)} size="small" strokeColor="#1890ff" />
                </div>
                <div className="mt-1">
                  <Rate disabled defaultValue={3} className="text-xs mr-2" /> 
                  <Progress percent={parseFloat(stats.three_star_percent)} size="small" strokeColor="#faad14" />
                </div>
                <div className="mt-1">
                  <Rate disabled defaultValue={2} className="text-xs mr-2" /> 
                  <Progress percent={parseFloat(stats.two_star_percent)} size="small" strokeColor="#fa8c16" />
                </div>
                <div className="mt-1">
                  <Rate disabled defaultValue={1} className="text-xs mr-2" /> 
                  <Progress percent={parseFloat(stats.one_star_percent)} size="small" strokeColor="#f5222d" />
                </div>
              </div>
            </Col>
          </Row>
        </Card>

        <Card 
          className="mb-8 content-card" 
          bodyStyle={{ padding: "20px" }}
        >
          <div className="flex justify-between items-center mb-4">
            <Title level={4} className="section-title">All Customer Feedback</Title>
            <Button
              type="primary"
              icon={<ReloadOutlined />}
              onClick={() => {
                fetchFeedback(token);
                fetchFeedbackStats(token);
              }}
              size="large"
              className="action-button"
            >
              Refresh
            </Button>
          </div>

          <div className="mb-6">
            <Search
              placeholder="Search feedback by customer name, email or comment..."
              allowClear
              enterButton="Search"
              size="large"
              onSearch={handleSearch}
              onChange={(e) => setSearchText(e.target.value)}
            />
          </div>

          <Table
            columns={feedbackColumns}
            dataSource={filteredFeedback.map((item) => ({ ...item, key: item.feedback_id }))}
            loading={loading}
            pagination={{ 
              pageSize: 10,
              position: ['bottomCenter'],
              showTotal: (total) => (
                <Text>
                  Total {total} records
                </Text>
              )
            }}
            className="feedback-table"
            expandable={{
              expandedRowRender: (record) => (
                <div className="p-4">
                  <div className="mb-4">
                    <Text strong style={{ color: "#1890ff" }}>Rating:</Text>
                    <div className="mt-2">
                      <Rate disabled value={record.rating} />
                    </div>
                  </div>
                  
                  {record.description && (
                    <div>
                      <Divider />
                      <Text strong style={{ color: "#52c41a" }}>Comment:</Text>
                      <Paragraph style={{ marginTop: 8, padding: 12, background: "#f0f2f5", borderRadius: 8 }}>
                        {record.description}
                      </Paragraph>
                    </div>
                  )}
                </div>
              ),
            }}
          />
        </Card>
      </div>

      {/* Feedback Detail Modal */}
      <Modal
        title={
          <Title level={4} className="modal-title">
            Feedback Details
          </Title>
        }
        open={detailModalVisible}
        onCancel={() => setDetailModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setDetailModalVisible(false)}>
            Close
          </Button>,
        ]}
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
        {currentFeedback && (
          <div>
            <div className="mb-4">
              <Text strong>Customer:</Text>
              <div className="mt-1">
                <Text>{`${currentFeedback.first_name || ''} ${currentFeedback.last_name || ''}`}</Text>
              </div>
              <div className="mt-1">
                <Text type="secondary">{currentFeedback.email}</Text>
              </div>
            </div>
            
            <div className="mb-4">
              <Text strong>Rating:</Text>
              <div className="mt-1">
                <Rate disabled value={currentFeedback.rating} />
                <Text className="ml-2">
                  ({currentFeedback.rating}/5)
                </Text>
              </div>
            </div>
            
            <div className="mb-4">
              <Text strong>Date:</Text>
              <div className="mt-1">
                <Text>
                  {new Date(currentFeedback.created_at).toLocaleString()}
                </Text>
              </div>
            </div>
            
            <div>
              <Text strong>Comment:</Text>
              <div className="mt-2 p-4 bg-gray-100 rounded-lg">
                {currentFeedback.description ? (
                  <Paragraph>{currentFeedback.description}</Paragraph>
                ) : (
                  <Text italic>No comment provided</Text>
                )}
              </div>
            </div>
          </div>
        )}
      </Modal>

      <style jsx global>{`
        .feedback-table .ant-table-thead > tr > th {
          background-color: #f0f5ff;
          font-size: 20px;
          font-weight: 600;
          padding: 15px 20px;
          color: #333;
        }
        
        .feedback-table .ant-table-tbody > tr > td {
          font-size: 19px;
          padding: 15px 20px;
        }
        
        .feedback-table .ant-table-tbody > tr:nth-child(odd) {
          background-color: #fafafa;
        }
        
        .feedback-table .ant-table-tbody > tr:hover > td {
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

export default AdminFeedback; 