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
  Badge,
  Progress,
} from "antd";
import {
  InboxOutlined,
  FileTextOutlined,
  SearchOutlined,
  FilePdfOutlined,
  DollarOutlined,
  CalendarOutlined,
  FilterOutlined,
  WarningOutlined,
  CheckCircleOutlined,
} from "@ant-design/icons";
import { jsPDF } from "jspdf";
import "jspdf-autotable";
import dayjs from "dayjs";
import { motion } from 'framer-motion';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;
const { Option } = Select;

// Custom styles removed and will be added at the bottom of the file

const InventoryStockReports = () => {
  const navigate = useNavigate();
  const [stocks, setStocks] = useState([]);
  const [filteredStocks, setFilteredStocks] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  
  // Filter states
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [dateRange, setDateRange] = useState(null);
  const [stockStatus, setStockStatus] = useState("all"); // all, available, low, out

  // Stats
  const [stats, setStats] = useState({
    totalItems: 0,
    totalBatches: 0,
    totalValue: 0,
    availableItems: 0,
    lowStockItems: 0,
    outOfStockItems: 0
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
        fetchInventoryStock();
      } catch (error) {
        console.error("Auth check error:", error);
        navigate("/login");
      }
    };

    checkAuth();
  }, [navigate]);

  // Fetch all inventory stock
  const fetchInventoryStock = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      
      // Fetch inventory stock data with item details using our new endpoint
      const response = await axios.get(
        "http://localhost:3000/api/purchases/stock-reports",
        {
          withCredentials: true,
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          params: {
            // Add any default filters here if needed
            startDate: dateRange && dateRange[0] ? dateRange[0].format('YYYY-MM-DD') : null,
            endDate: dateRange && dateRange[1] ? dateRange[1].format('YYYY-MM-DD') : null,
            category: selectedCategory || null
          }
        }
      );

      // Process data to add batch numbers and other calculated fields
      const processedData = response.data.map((stock, index) => {
        // Calculate batch number using purchase_id (Batch-{purchase_id})
        const batchNumber = `Batch-${stock.purchase_id}`;
        
        // Calculate stock status
        let status = "In Stock";
        if (stock.available_qty === 0) {
          status = "Out of Stock";
        } else if (stock.available_qty < 10) { // Define a threshold for low stock
          status = "Low Stock";
        }
        
        // Calculate usage percentage
        const initialQty = stock.initial_quantity || stock.quantity || 0; // Use initial_quantity from our API
        const usagePercentage = initialQty > 0 
          ? Math.round(((initialQty - stock.available_qty) / initialQty) * 100) 
          : 0;
        
        // Return enriched stock data with correct price fields
        return {
          ...stock,
          key: stock.stock_id,
          batch_number: batchNumber,
          status: status,
          usage_percentage: usagePercentage,
          quantity: initialQty,
          // Ensure we're using the correct price fields
          buying_price: stock.buying_price || 0,
          selling_price: stock.selling_price || 0
        };
      });

      // Sort by purchase date (newest first)
      const sortedStocks = processedData.sort((a, b) => {
        return new Date(b.purchase_date) - new Date(a.purchase_date);
      });

      setStocks(sortedStocks);
      setFilteredStocks(sortedStocks);
      
      // Fetch categories from the API instead of extracting from data
      fetchCategories();
      
      // Calculate initial stats
      updateStats(sortedStocks);
    } catch (error) {
      console.error("Error fetching inventory stock:", error);
      toast.error("Failed to fetch inventory stock data");
      if (error.response?.status === 401 || error.response?.status === 403) {
        navigate("/login");
      }
    } finally {
      setLoading(false);
    }
  };

  // Fetch categories for filter dropdown
  const fetchCategories = async () => {
    try {
      const token = localStorage.getItem("token");
      
      const response = await axios.get(
        "http://localhost:3000/api/purchases/categories",
        {
          withCredentials: true,
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          }
        }
      );

      // Process categories based on response format
      if (Array.isArray(response.data)) {
        if (response.data.length > 0 && response.data[0].hasOwnProperty('category_id')) {
          // Using the category from item_category table
          const categoryList = response.data.map(cat => cat.category);
          setCategories(categoryList);
        } else {
          // Direct category strings
          setCategories(response.data.map(item => item.category));
        }
      }
    } catch (error) {
      console.error("Error fetching categories:", error);
      toast.error("Failed to fetch categories");
    }
  };

  // Update stats based on filtered stocks
  const updateStats = (data) => {
    const totalBatches = data.length;
    const totalItems = data.reduce((sum, s) => sum + Number(s.available_qty), 0);
    const totalValue = data.reduce((sum, s) => sum + (Number(s.buying_price) * Number(s.available_qty)), 0);
    
    // Count by stock status
    const availableItems = data.filter(s => s.status === "In Stock").length;
    const lowStockItems = data.filter(s => s.status === "Low Stock").length;
    const outOfStockItems = data.filter(s => s.status === "Out of Stock").length;

    setStats({
      totalBatches,
      totalItems,
      totalValue,
      availableItems,
      lowStockItems,
      outOfStockItems
    });
  };

  // Apply filters - update to use API for filtering
  const applyFilters = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      
      // Format date range for API
      const formattedStartDate = dateRange && dateRange[0] ? dateRange[0].format('YYYY-MM-DD') : null;
      const formattedEndDate = dateRange && dateRange[1] ? dateRange[1].format('YYYY-MM-DD') : null;
      
      // Make API request with filters
      const response = await axios.get(
        "http://localhost:3000/api/purchases/stock-reports",
        {
          withCredentials: true,
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          params: {
            startDate: formattedStartDate,
            endDate: formattedEndDate,
            category: selectedCategory || null
          }
        }
      );
      
      // Process the data as before
      const processedData = response.data.map((stock, index) => {
        const batchNumber = `Batch-${stock.purchase_id}`;
        
        let status = "In Stock";
        if (stock.available_qty === 0) {
          status = "Out of Stock";
        } else if (stock.available_qty < 10) {
          status = "Low Stock";
        }
        
        const initialQty = stock.initial_quantity || stock.quantity || 0;
        const usagePercentage = initialQty > 0 
          ? Math.round(((initialQty - stock.available_qty) / initialQty) * 100) 
          : 0;
        
        return {
          ...stock,
          key: stock.stock_id,
          batch_number: batchNumber,
          status: status,
          usage_percentage: usagePercentage,
          quantity: initialQty,
          // Ensure we're using the correct price fields
          buying_price: stock.buying_price || 0,
          selling_price: stock.selling_price || 0
        };
      });
      
      let results = [...processedData];
      
      // Apply client-side filters for search term and stock status (these aren't handled by API)
      if (searchTerm) {
        results = results.filter(stock => {
          const searchFields = [
            stock.item_name,
            stock.brand,
            stock.batch_number
          ].map(field => (field || "").toLowerCase());
          
          return searchFields.some(field => field.includes(searchTerm.toLowerCase()));
        });
      }
      
      if (stockStatus !== "all") {
        if (stockStatus === "in-stock") {
          results = results.filter(stock => stock.status === "In Stock");
        } else if (stockStatus === "low-stock") {
          results = results.filter(stock => stock.status === "Low Stock");
        } else if (stockStatus === "out-of-stock") {
          results = results.filter(stock => stock.status === "Out of Stock");
        }
      }
      
      setFilteredStocks(results);
      updateStats(results);
      
      // Show toast notification with results
      if (results.length === 0) {
        toast.info("No inventory stock matches your filter criteria");
      } else {
        toast.success(`Found ${results.length} stock items matching your criteria`);
      }
    } catch (error) {
      console.error("Error applying filters:", error);
      toast.error("Failed to apply filters");
    } finally {
      setLoading(false);
    }
  };

  // Reset all filters
  const resetFilters = () => {
    setSearchTerm("");
    setSelectedCategory("");
    setDateRange(null);
    setStockStatus("all");
    setFilteredStocks(stocks);
    updateStats(stocks);
    toast.info("Filters reset");
  };

  // Generate PDF report
  const generatePDFReport = async () => {
    try {
      if (filteredStocks.length === 0) {
        toast.warn("No inventory stock to include in the report");
        return;
      }

      setExportLoading(true);

      // Create new PDF document
      const doc = new jsPDF("landscape", "mm", "a4");
      const pageWidth = doc.internal.pageSize.width;
      const pageHeight = doc.internal.pageSize.height;

      // Add report title
      doc.setFontSize(22);
      doc.text("Inventory Stock Report", pageWidth / 2, 15, { align: "center" });

      // Add filter information
      doc.setFontSize(12);
      const reportDate = dayjs().format("YYYY-MM-DD HH:mm");
      doc.text(`Generated on: ${reportDate}`, pageWidth / 2, 22, { align: "center" });
      
      // Add filter criteria
      let filterText = "";
      if (selectedCategory) filterText += `Category: ${selectedCategory} | `;
      if (dateRange && dateRange[0] && dateRange[1]) {
        filterText += `Purchase Date: ${dateRange[0].format('YYYY-MM-DD')} to ${dateRange[1].format('YYYY-MM-DD')} | `;
      }
      if (stockStatus !== "all") {
        const statusLabels = {
          "in-stock": "In Stock",
          "low-stock": "Low Stock",
          "out-of-stock": "Out of Stock"
        };
        filterText += `Status: ${statusLabels[stockStatus]} | `;
      }
      if (searchTerm) filterText += `Search: "${searchTerm}" | `;
      
      if (filterText) {
        doc.text(`Filters: ${filterText.slice(0, -3)}`, pageWidth / 2, 29, { align: "center" });
      }

      // Add statistics summary
      doc.setFontSize(11);
      doc.setTextColor(0, 0, 0);
      
      const statsData = [
        [
          { content: "Total Batches:", styles: { fontStyle: 'bold' } }, 
          { content: stats.totalBatches.toString() },
          { content: "Total Items:", styles: { fontStyle: 'bold' } }, 
          { content: stats.totalItems.toString() },
          { content: "Total Value:", styles: { fontStyle: 'bold' } }, 
          { content: `Rs. ${stats.totalValue.toFixed(2)}` },
          { content: "Stock Status:", styles: { fontStyle: 'bold' } }, 
          { content: `${stats.availableItems} In Stock, ${stats.lowStockItems} Low, ${stats.outOfStockItems} Out` }
        ]
      ];
      
      doc.autoTable({
        startY: 35,
        body: statsData,
        theme: 'grid',
        styles: { fontSize: 10, cellPadding: 3 },
        margin: { left: 10, right: 10 },
        tableWidth: pageWidth - 20,
      });
      
      // Inventory stock table headers
      const headers = [
        "Batch Number", 
        "Purchase Date", 
        "Item Name",
        "Category",
        "Initial Qty",
        "Available Qty",
        "Usage %",
        "Status",
        "Buying Price",
        "Selling Price",
        "Total Value"
      ];
      
      // Prepare inventory stock data
      const stockData = filteredStocks.map(stock => {
        const initialQty = stock.quantity || 0;
        const availableQty = stock.available_qty || 0;
        const usagePercent = stock.usage_percentage || 0;
        const buyingPrice = Number(stock.buying_price) || 0;
        const sellingPrice = Number(stock.selling_price) || 0;
        const totalValue = buyingPrice * Number(availableQty);
        
        return [
          stock.batch_number,
          dayjs(stock.purchase_date).format("YYYY-MM-DD"),
          `${stock.item_name}\n${stock.brand || ""}`,
          stock.category || "N/A",
          `${initialQty} ${stock.unit || ""}`,
          `${availableQty} ${stock.unit || ""}`,
          `${usagePercent}%`,
          stock.status,
          `Rs. ${buyingPrice.toFixed(2)}`,
          `Rs. ${sellingPrice.toFixed(2)}`,
          `Rs. ${totalValue.toFixed(2)}`
        ];
      });
      
      // Define status cell styles
      const getStatusCellStyle = (status) => {
        const baseStyle = { fontStyle: 'bold' };
        if (status === "Out of Stock") return { ...baseStyle, textColor: [255, 76, 76] };
        if (status === "Low Stock") return { ...baseStyle, textColor: [250, 173, 20] };
        return { ...baseStyle, textColor: [82, 196, 26] };
      };
      
      // Add inventory stock table
      doc.autoTable({
        startY: doc.lastAutoTable.finalY + 10,
        head: [headers],
        body: stockData,
        theme: 'grid',
        headStyles: { fillColor: [44, 62, 80], fontSize: 10, fontStyle: 'bold', halign: 'center' },
        bodyStyles: { fontSize: 9 },
        columnStyles: {
          0: { halign: 'center' },
          1: { halign: 'center' },
          4: { halign: 'center' },
          5: { halign: 'center' },
          6: { halign: 'center' },
          7: { cellWidth: 25 },
          8: { halign: 'right' },
          9: { halign: 'right' },
          10: { halign: 'right' }
        },
        alternateRowStyles: { fillColor: [240, 240, 240] },
        margin: { top: 10, left: 10, right: 10, bottom: 10 },
        tableWidth: pageWidth - 20,
        didParseCell: function(data) {
          // Apply status cell styles
          if (data.column.index === 7 && data.section === 'body') {
            const status = data.cell.raw;
            Object.assign(data.cell.styles, getStatusCellStyle(status));
          }
          
          // Apply price styles
          if (data.column.index === 8 && data.section === 'body') {
            // Buying price - red color
            data.cell.styles.textColor = [255, 76, 76];
          }
          
          if (data.column.index === 9 && data.section === 'body') {
            // Selling price - teal color
            data.cell.styles.textColor = [64, 224, 208];
          }
          
          if (data.column.index === 10 && data.section === 'body') {
            // Total value - green color
            data.cell.styles.textColor = [82, 196, 26];
          }
          
          // Center align status
          if (data.column.index === 7) {
            data.cell.styles.halign = 'center';
          }
        }
      });
      
      // Add summary footer
      const summaryData = [
        [
          { content: '', colSpan: 5 },
          { content: `Total: ${stats.totalItems}`, styles: { fontStyle: 'bold', halign: 'center' } },
          { content: '', colSpan: 3 },
          { content: 'Total Value:', styles: { fontStyle: 'bold', halign: 'right' } },
          { content: `Rs. ${stats.totalValue.toFixed(2)}`, styles: { fontStyle: 'bold', halign: 'right' } }
        ]
      ];
      
      doc.autoTable({
        startY: doc.lastAutoTable.finalY + 2,
        body: summaryData,
        theme: 'plain',
        styles: { fontSize: 10, cellPadding: 3 },
        margin: { left: 10, right: 10 },
        tableWidth: pageWidth - 20,
      });
      
      // Add page number at the bottom of each page
      const totalPages = doc.internal.getNumberOfPages();
      for(let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFontSize(10);
        doc.text(`Page ${i} of ${totalPages}`, pageWidth - 20, pageHeight - 10);
      }

      // Get generated report name based on filters
      let reportName = "Inventory_Stock_Report";
      if (selectedCategory) reportName += `_${selectedCategory}`;
      if (dateRange && dateRange[0]) reportName += `_${dateRange[0].format('YYYYMMDD')}`;
      if (stockStatus !== "all") reportName += `_${stockStatus}`;
      reportName += `_${dayjs().format("YYYYMMDD_HHmmss")}.pdf`;
      
      // Save the PDF
      doc.save(reportName);
      toast.success(`Report generated: ${reportName}`);
    } catch (error) {
      console.error("Error generating PDF report:", error);
      toast.error("Failed to generate PDF report");
    } finally {
      setExportLoading(false);
    }
  };

  // Table columns
  const columns = [
    {
      title: <span style={{ fontSize: '19px' }}>Batch</span>,
      dataIndex: "batch_number",
      key: "batch_number",
      render: (text) => <span style={{ fontSize: '18px' }}>{text}</span>
    },
    {
      title: <span style={{ fontSize: '19px' }}>Purchase Date</span>,
      dataIndex: "purchase_date",
      key: "purchase_date",
      render: (date) => <span style={{ fontSize: '18px' }}>{dayjs(date).format("YYYY-MM-DD")}</span>
    },
    {
      title: <span style={{ fontSize: '19px' }}>Item Name</span>,
      dataIndex: "item_name",
      key: "item_name",
      render: (text) => <span style={{ fontSize: '18px' }}>{text}</span>
    },
    {
      title: <span style={{ fontSize: '19px' }}>Category</span>,
      dataIndex: "category",
      key: "category",
      render: (text) => <span style={{ fontSize: '18px' }}>{text}</span>
    },
    {
      title: <span style={{ fontSize: '19px' }}>Initial Qty</span>,
      dataIndex: "quantity",
      key: "quantity",
      render: (text) => <span style={{ fontSize: '18px' }}>{text}</span>
    },
    {
      title: <span style={{ fontSize: '19px' }}>Available Qty</span>,
      dataIndex: "available_qty",
      key: "available_qty",
      render: (text) => <span style={{ fontSize: '18px' }}>{text}</span>
    },
    {
      title: <span style={{ fontSize: '19px' }}>Buying Price</span>,
      dataIndex: "buying_price",
      key: "buying_price",
      render: (price) => <span style={{ fontSize: '18px' }}>{`Rs. ${Number(price || 0).toFixed(2)}`}</span>
    },
    {
      title: <span style={{ fontSize: '19px' }}>Selling Price</span>,
      dataIndex: "selling_price",
      key: "selling_price",
      render: (price) => <span style={{ fontSize: '18px' }}>{`Rs. ${Number(price || 0).toFixed(2)}`}</span>
    },
    {
      title: <span style={{ fontSize: '19px' }}>Total Value</span>,
      key: "total_value",
      render: (_, record) => {
        const buyingPrice = Number(record.buying_price || 0);
        const availableQty = Number(record.available_qty || 0);
        return <span style={{ fontSize: '18px' }}>{`Rs. ${(buyingPrice * availableQty).toFixed(2)}`}</span>;
      },
    },
  ];

  return (
    <div style={{ padding: "20px" }}>
      <Title level={2} style={{ fontSize: '28px', marginBottom: '20px' }}>Inventory Stock</Title>
      
      <Space style={{ marginBottom: "16px" }} wrap>
        <Input
          placeholder="Search items..."
          prefix={<SearchOutlined />}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{ width: 200, fontSize: '16px' }}
        />
        <Select
          placeholder="Select Category"
          style={{ width: 200, fontSize: '16px' }}
          onChange={(value) => setSelectedCategory(value)}
          allowClear
        >
          {categories.map((category) => (
            <Option key={category} value={category} style={{ fontSize: '16px' }}>
              {category}
            </Option>
          ))}
        </Select>
        <RangePicker
          onChange={(dates) => setDateRange(dates)}
          style={{ fontSize: '16px' }}
        />
        <Button
          type="primary"
          icon={<FilterOutlined />}
          onClick={fetchInventoryStock}
          style={{ fontSize: '16px' }}
        >
          Apply Filters
        </Button>
        <Button
          icon={<FilePdfOutlined />}
          loading={exportLoading}
          onClick={generatePDFReport}
          style={{ fontSize: '16px' }}
        >
          Export PDF
        </Button>
      </Space>

      <Table
        columns={columns}
        dataSource={filteredStocks}
        loading={loading}
        pagination={{ pageSize: 10 }}
        scroll={{ x: true }}
      />
    </div>
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

export default InventoryStockReports; 