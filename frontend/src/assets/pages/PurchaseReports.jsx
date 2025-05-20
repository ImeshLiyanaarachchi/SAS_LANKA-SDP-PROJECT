import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import {
  Table,
  Button,
  Card,
  Typography,
  Input,
  Space,
  DatePicker,
  Select,
  Tag,
  Spin,
  Empty,
  Row,
  Col,
  Statistic,
} from "antd";
import {
  ShoppingCartOutlined,
  FileTextOutlined,
  SearchOutlined,
  FilePdfOutlined,
  DollarOutlined,
  CalendarOutlined,
  FilterOutlined,
} from "@ant-design/icons";
import { jsPDF } from "jspdf";
import "jspdf-autotable";
import dayjs from "dayjs";
import { motion } from 'framer-motion';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;
const { Option } = Select;

// Remove dark theme styles

const PurchaseReports = () => {
  const navigate = useNavigate();
  const [purchases, setPurchases] = useState([]);
  const [filteredPurchases, setFilteredPurchases] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  
  // Filter states
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [dateRange, setDateRange] = useState(null);

  // Stats
  const [stats, setStats] = useState({
    totalPurchases: 0,
    totalSpent: 0,
    totalItems: 0,
    totalSelling: 0,
    totalProfit: 0,
    averagePrice: 0
  });

  // Authentication check on component mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const user = JSON.parse(localStorage.getItem("user"));
        if (!user || user.role !== "admin") {
          navigate("/login");
          return;
        }
        fetchPurchases();
      } catch (error) {
        console.error("Auth check error:", error);
        navigate("/login");
      }
    };

    checkAuth();
  }, [navigate]);

  // Fetch all purchases
  const fetchPurchases = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const response = await axios.get(
        "http://localhost:3000/api/purchases",
        {
          withCredentials: true,
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );

      // Sort purchases by date (newest first)
      const sortedPurchases = response.data.sort((a, b) => {
        return new Date(b.purchase_date) - new Date(a.purchase_date);
      });

      setPurchases(sortedPurchases);
      setFilteredPurchases(sortedPurchases);
      
      // Extract unique categories
      const uniqueCategories = [...new Set(response.data.map(item => item.category))];
      setCategories(uniqueCategories);
      
      // Calculate initial stats
      updateStats(sortedPurchases);
    } catch (error) {
      console.error("Error fetching purchases:", error);
      toast.error("Failed to fetch purchases");
      if (error.response?.status === 401 || error.response?.status === 403) {
        navigate("/login");
      }
    } finally {
      setLoading(false);
    }
  };

  // Update stats based on filtered purchases
  const updateStats = (data) => {
    const totalPurchases = data.length;
    const totalSpent = data.reduce((sum, p) => sum + (Number(p.buying_price) * Number(p.quantity)), 0);
    const totalItems = data.reduce((sum, p) => sum + Number(p.quantity), 0);
    const totalSelling = data.reduce((sum, p) => sum + (Number(p.selling_price) * Number(p.quantity)), 0);
    const totalProfit = totalSelling - totalSpent;
    const averagePrice = totalPurchases > 0 ? totalSpent / totalItems : 0;

    setStats({
      totalPurchases,
      totalSpent,
      totalItems,
      totalSelling,
      totalProfit,
      averagePrice
    });
  };

  // Apply all filters
  const applyFilters = () => {
    let filtered = [...purchases];

    // Apply search term filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(purchase => 
        purchase.item_name.toLowerCase().includes(term) || 
        purchase.brand.toLowerCase().includes(term)
      );
    }

    // Apply category filter
    if (selectedCategory) {
      filtered = filtered.filter(purchase => purchase.category === selectedCategory);
    }

    // Apply date range filter
    if (dateRange && dateRange[0] && dateRange[1]) {
      const startDate = dateRange[0].startOf('day');
      const endDate = dateRange[1].endOf('day');
      
      filtered = filtered.filter(purchase => {
        const purchaseDate = dayjs(purchase.purchase_date);
        return purchaseDate.isAfter(startDate) && purchaseDate.isBefore(endDate);
      });
    }

    setFilteredPurchases(filtered);
    updateStats(filtered);
  };

  // Reset all filters
  const resetFilters = () => {
    setSearchTerm("");
    setSelectedCategory("");
    setDateRange(null);
    setFilteredPurchases(purchases);
    updateStats(purchases);
  };

  // Generate PDF report with current filtered data
  const generatePDFReport = async () => {
    try {
      setExportLoading(true);
      
      // Create new PDF document
      const doc = new jsPDF('landscape');
      
      // Add title and date
      doc.setFontSize(20);
      doc.setTextColor(40, 40, 40);
      doc.text("Purchase History Report", 14, 22);
      
      // Add report generated date
      doc.setFontSize(12);
      doc.setTextColor(100, 100, 100);
      doc.text(`Report generated on: ${dayjs().format('YYYY-MM-DD HH:mm')}`, 14, 30);
      
      // Add filter information if any
      let yPos = 38;
      if (searchTerm || selectedCategory || (dateRange && dateRange[0] && dateRange[1])) {
        doc.setFontSize(14);
        doc.setTextColor(60, 60, 60);
        doc.text("Filters applied:", 14, yPos);
        yPos += 8;
        
        if (searchTerm) {
          doc.setFontSize(12);
          doc.text(`• Search: "${searchTerm}"`, 20, yPos);
          yPos += 7;
        }
        
        if (selectedCategory) {
          doc.setFontSize(12);
          doc.text(`• Category: ${selectedCategory}`, 20, yPos);
          yPos += 7;
        }
        
        if (dateRange && dateRange[0] && dateRange[1]) {
          doc.setFontSize(12);
          doc.text(`• Date range: ${dateRange[0].format('YYYY-MM-DD')} to ${dateRange[1].format('YYYY-MM-DD')}`, 20, yPos);
          yPos += 7;
        }
        
        yPos += 5;
      }
      
      // Add summary statistics
      doc.setFontSize(14);
      doc.setTextColor(60, 60, 60);
      doc.text("Summary:", 14, yPos);
      yPos += 8;
      
      doc.setFontSize(12);
      doc.text(`• Total Purchases: ${stats.totalPurchases}`, 20, yPos); yPos += 7;
      doc.text(`• Total Items: ${stats.totalItems}`, 20, yPos); yPos += 7;
      doc.text(`• Total Spent: $${stats.totalSpent.toFixed(2)}`, 20, yPos); yPos += 7;
      doc.text(`• Total Selling Value: $${stats.totalSelling.toFixed(2)}`, 20, yPos); yPos += 7;
      doc.text(`• Total Profit: $${stats.totalProfit.toFixed(2)}`, 20, yPos); yPos += 7;
      doc.text(`• Average Price Per Item: $${stats.averagePrice.toFixed(2)}`, 20, yPos); yPos += 10;
      
      // Create table data
      const tableColumn = [
        'Item Name', 
        'Category', 
        'Brand', 
        'Supplier', 
        'Quantity', 
        'Buying Price ($)', 
        'Selling Price ($)',
        'Total Cost ($)',
        'Date'
      ];
      
      const tableRows = filteredPurchases.map(purchase => [
        purchase.item_name,
        purchase.category,
        purchase.brand,
        purchase.supplier,
        purchase.quantity,
        parseFloat(purchase.buying_price).toFixed(2),
        parseFloat(purchase.selling_price).toFixed(2),
        (parseFloat(purchase.buying_price) * parseFloat(purchase.quantity)).toFixed(2),
        dayjs(purchase.purchase_date).format('YYYY-MM-DD')
      ]);
      
      // Generate the table
      doc.autoTable({
        startY: yPos,
        head: [tableColumn],
        body: tableRows,
        headStyles: {
          fillColor: [24, 144, 255],
          fontSize: 12,
          cellPadding: 3,
        },
        bodyStyles: {
          fontSize: 11,
        },
        alternateRowStyles: {
          fillColor: [240, 240, 240]
        },
        margin: { top: 10 },
      });
      
      // Save PDF
      doc.save(`purchase_report_${dayjs().format('YYYYMMDD_HHmmss')}.pdf`);
      
      toast.success("Report generated successfully!");
    } catch (error) {
      console.error("Error generating PDF report:", error);
      toast.error("Failed to generate report");
    } finally {
      setExportLoading(false);
    }
  };

  // Table columns configuration
  const columns = [
    {
      title: 'Item Name',
      dataIndex: 'item_name',
      key: 'item_name',
      render: (text) => <Text style={{ fontSize: '19px' }}>{text}</Text>,
    },
    {
      title: 'Category',
      dataIndex: 'category',
      key: 'category',
      render: (category) => (
        <Tag color="blue" style={{ fontSize: '19px' }}>
          {category}
        </Tag>
      ),
    },
    {
      title: 'Brand',
      dataIndex: 'brand',
      key: 'brand',
      render: (text) => <Text style={{ fontSize: '19px' }}>{text}</Text>,
    },
    {
      title: 'Quantity',
      dataIndex: 'quantity',
      key: 'quantity',
      render: (text) => <Text style={{ fontSize: '19px' }}>{text}</Text>,
    },
    {
      title: 'Buying Price',
      dataIndex: 'buying_price',
      key: 'buying_price',
      render: (price) => <Text style={{ fontSize: '19px' }}>${parseFloat(price).toFixed(2)}</Text>,
    },
    {
      title: 'Selling Price',
      dataIndex: 'selling_price',
      key: 'selling_price',
      render: (price) => <Text style={{ fontSize: '19px' }}>${parseFloat(price).toFixed(2)}</Text>,
    },
    {
      title: 'Total Cost',
      key: 'total_cost',
      render: (_, record) => (
        <Text style={{ fontSize: '19px' }}>
          ${(parseFloat(record.buying_price) * parseFloat(record.quantity)).toFixed(2)}
        </Text>
      ),
    },
    {
      title: 'Date',
      dataIndex: 'purchase_date',
      key: 'purchase_date',
      render: (date) => <Text style={{ fontSize: '19px' }}>{dayjs(date).format('YYYY-MM-DD')}</Text>,
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={lightThemeStyles.page}
    >
      <div>
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Title level={2} className="page-title" style={{ fontSize: '32px', marginBottom: '15px', color: '#333' }}>
           Purchase Reports
          </Title>
        </motion.div>

        {/* Statistics Cards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={12} md={6}>
              <Card className="content-card" style={{ borderRadius: '10px', marginBottom: '20px', boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)' }}>
                <Statistic
                  title={<span style={{ fontSize: '18px', color: '#666' }}>Total Purchases</span>}
                  value={stats.totalPurchases}
                  prefix={<ShoppingCartOutlined style={{ color: '#1890ff', fontSize: "24px" }} />}
                  valueStyle={{ color: '#1890ff', fontSize: '28px', fontWeight: "700" }}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Card className="content-card" style={{ borderRadius: '10px', marginBottom: '20px', boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)' }}>
                <Statistic
                  title={<span style={{ fontSize: '18px', color: '#666' }}>Total Spent</span>}
                  value={stats.totalSpent ? stats.totalSpent.toFixed(2) : 0}
                  prefix={<DollarOutlined style={{ color: '#52c41a', fontSize: "24px" }} />}
                  valueStyle={{ color: '#52c41a', fontSize: '28px', fontWeight: "700" }}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Card className="content-card" style={{ borderRadius: '10px', marginBottom: '20px', boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)' }}>
                <Statistic
                  title={<span style={{ fontSize: '18px', color: '#666' }}>Average Price</span>}
                  value={stats.averagePrice ? stats.averagePrice.toFixed(2) : 0}
                  prefix={<DollarOutlined style={{ color: '#fa8c16', fontSize: "24px" }} />}
                  valueStyle={{ color: '#fa8c16', fontSize: '28px', fontWeight: "700" }}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Card className="content-card" style={{ borderRadius: '10px', marginBottom: '20px', boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)' }}>
                <Statistic
                  title={<span style={{ fontSize: '18px', color: '#666' }}>Total Profit</span>}
                  value={stats.totalProfit ? stats.totalProfit.toFixed(2) : 0}
                  prefix={<DollarOutlined style={{ color: '#722ed1', fontSize: "24px" }} />}
                  valueStyle={{ color: '#722ed1', fontSize: '28px', fontWeight: "700" }}
                />
              </Card>
            </Col>
          </Row>
        </motion.div>

        {/* Filter Controls */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card className="content-card" style={{ borderRadius: '10px', marginBottom: '20px', boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)' }}>
            <Row gutter={[24, 24]} align="top">
              {/* Search Input */}
              <Col xs={24} md={8}>
                <label style={{ fontSize: '18px', color: '#333', fontWeight: '500', marginBottom: '8px', display: 'block' }}>Search Item</label>
                <Input
                  placeholder="Search by item name or brand"
                  prefix={<SearchOutlined />}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onPressEnter={applyFilters}
                  style={{
                    width: '100%',
                    height: '40px',
                    fontSize: '18px'
                  }}
                  allowClear
                />
              </Col>
              
              {/* Category Selector */}
              <Col xs={24} md={8}>
                <label style={{ fontSize: '18px', color: '#333', fontWeight: '500', marginBottom: '8px', display: 'block' }}>Category</label>
                <Select
                  placeholder="Select a category"
                  value={selectedCategory}
                  onChange={setSelectedCategory}
                  style={{ 
                    width: '100%',
                    fontSize: '18px'
                  }}
                  allowClear
                >
                  {categories.map(category => (
                    <Option key={category} value={category}>
                      {category}
                    </Option>
                  ))}
                </Select>
              </Col>
              
              {/* Date Range Picker */}
              <Col xs={24} md={8}>
                <label style={{ fontSize: '18px', color: '#333', fontWeight: '500', marginBottom: '8px', display: 'block' }}>Date Range</label>
                <RangePicker
                  value={dateRange}
                  onChange={setDateRange}
                  style={{ 
                    width: '100%',
                    fontSize: '18px'
                  }}
                  format="YYYY-MM-DD"
                />
              </Col>
              
              {/* Action Buttons */}
              <Col xs={24} style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '8px' }}>
                <Button
                  onClick={resetFilters}
                  style={{
                    borderRadius: '8px',
                    height: "40px",
                    fontSize: "18px"
                  }}
                >
                  Reset
                </Button>
                <Button
                  type="primary"
                  icon={<FilterOutlined />}
                  onClick={applyFilters}
                  style={{
                    background: '#1890ff',
                    borderRadius: '8px',
                    height: "40px",
                    fontSize: "18px",
                    fontWeight: "500"
                  }}
                >
                  Apply Filters
                </Button>
              </Col>
            </Row>
          </Card>
        </motion.div>

        {/* Purchase Data Table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <Card 
            className="content-card"
            style={{ borderRadius: '10px', marginBottom: '20px', boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)' }}
            title={
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '20px', fontWeight: 'bold' }}>
                  Purchase History
                </span>
                <Button
                  type="primary"
                  icon={<FilePdfOutlined />}
                  onClick={generatePDFReport}
                  loading={exportLoading}
                  disabled={filteredPurchases.length === 0}
                  style={{
                    background: '#1890ff',
                    borderRadius: '8px',
                    height: "40px",
                    fontSize: "18px",
                    fontWeight: "500"
                  }}
                >
                  Generate Report
                </Button>
              </div>
            }
          >
            {loading ? (
              <div style={{ textAlign: 'center', margin: '80px 0' }}>
                <Spin size="large" />
                <Text style={{ display: 'block', marginTop: '20px', fontSize: '18px' }}>
                  Loading purchase data...
                </Text>
              </div>
            ) : filteredPurchases.length === 0 ? (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description={
                  <Text style={{ fontSize: '18px' }}>No purchase data found</Text>
                }
              />
            ) : (
              <Table
                columns={columns}
                dataSource={filteredPurchases}
                rowKey="purchase_id"
                pagination={{
                  pageSize: 10,
                  showSizeChanger: true,
                  showTotal: (total, range) => (
                    <Text style={{ fontSize: '18px' }}>
                      {range[0]}-{range[1]} of {total} purchases
                    </Text>
                  )
                }}
                className="parts-table"
              />
            )}
          </Card>
        </motion.div>
      </div>
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

export default PurchaseReports;

<style jsx>{`
  .parts-table .ant-table-thead > tr > th {
    font-size: 20px;
    padding: 12px 16px;
  }
  
  .parts-table .ant-table-tbody > tr > td {
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
  
  .invoice-button {
    height: 50px;
    font-size: 18px;
  }
  
  .print-button {
    background: #1d39c4;
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
  
  .drawer-subtitle {
    font-size: 18px;
    color: #666;
    margin-top: 8px;
    text-align: left;
    width: 100%;
  }
  
  .part-title {
    font-size: 19px;
  }
  
  .part-card {
    border: 1px solid #f0f0f0;
    border-radius: 8px;
  }
  
  .part-card .ant-card-head {
    padding: 16px 24px;
  }
  
  .part-card .ant-card-body {
    padding: 20px;
  }
  
  .modal-title {
    font-size: 23px;
    margin: 0;
    width: 100%;
    text-align: left;
    font-weight: 600;
  }
  
  .total-price {
    font-size: 19px;
    font-weight: bold;
    color: #52c41a;
  }
  
  .add-part-button {
    height: 45px;
    font-size: 18px;
    margin-bottom: 15px;
  }
  
  .generate-invoice-button {
    margin-top: 16px;
    height: 55px;
    font-size: 18px;
  }
  
  .service-text {
    font-size: 18px;
    color: #666;
    display: block;
    margin-bottom: 15px;
  }
  
  /* Drawer specific styles */
  .ant-drawer-header {
    padding: 20px 24px;
  }
  
  .ant-drawer-header-title {
    flex-direction: column;
    align-items: flex-start;
    width: 100%;
    display: flex;
  }
  
  .ant-drawer-extra {
    position: absolute;
    right: 24px;
    top: 16px;
  }
  
  .ant-drawer-title {
    margin-bottom: 8px;
    width: 100%;
    text-align: left;
  }
  
  .charge-input {
    font-size: 20px !important;
    height: 55px;
  }
  
  .item-select, .quantity-input {
    font-size: 18px;
  }
  
  .ant-drawer-body {
    padding: 24px;
  }
  
  .ant-form-item-label > label {
    font-size: 18px;
  }
  
  .ant-input-number, .ant-select {
    font-size: 18px;
  }
  
  .ant-select-selection-item, .ant-select-item {
    font-size: 18px;
  }
  
  .ant-btn {
    font-size: 18px;
  }
  
  .ant-divider-inner-text {
    font-size: 18px;
    font-weight: 500;
  }
  
  .service-card {
    padding: 20px;
  }
  
  .service-card .ant-card-body {
    padding: 20px;
  }
`}</style> 