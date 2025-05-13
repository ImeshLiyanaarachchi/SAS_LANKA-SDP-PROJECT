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
  Badge,
  Alert,
  Divider,
} from "antd";
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  ExclamationCircleOutlined,
  InboxOutlined,
  WarningOutlined,
  ShoppingOutlined,
  DollarOutlined,
  FolderAddOutlined,
  FilePdfOutlined,
} from "@ant-design/icons";
import { motion, AnimatePresence } from "framer-motion";
import { jsPDF } from "jspdf";
import "jspdf-autotable";
import dayjs from "dayjs";

const { Title, Text } = Typography;
const { Option } = Select;
const { Search } = Input;

const AdminInventoryItem = () => {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [modalVisible, setModalVisible] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [searchText, setSearchText] = useState("");
  const [stats, setStats] = useState({
    totalItems: 0,
    lowStock: 0,
    totalValue: 0,
    categories: 0,
  });
  const [form] = Form.useForm();
  const [categoryModalVisible, setCategoryModalVisible] = useState(false);
  const [newCategory, setNewCategory] = useState("");
  const [categoryForm] = Form.useForm();
  const [token, setToken] = useState("");
  const [exportLoading, setExportLoading] = useState(false);

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
          await Promise.all([fetchItems(token), fetchCategories(token)]);
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

  // Calculate statistics when items change
  useEffect(() => {
    const totalItems = items.length;
    const lowStock = items.filter(
      (item) => (item.total_quantity || 0) <= (item.restock_level || 0)
    ).length;
    const totalValue = items.reduce(
      (sum, item) =>
        sum + (item.total_quantity || 0) * (item.current_selling_price || 0),
      0
    );
    const uniqueCategories = categories.length;

    setStats({
      totalItems,
      lowStock,
      totalValue,
      categories: uniqueCategories,
    });
  }, [items, categories]);

  const fetchItems = async (authToken) => {
    try {
      const response = await axios.get(
        "http://localhost:3000/api/inventory-items",
        {
          withCredentials: true,
          headers: {
            Authorization: `Bearer ${authToken || token}`,
            "Content-Type": "application/json",
          },
        }
      );
      setItems(response.data);
    } catch (error) {
      console.error("Error fetching items:", error);
      if (error.response?.status === 401 || error.response?.status === 403) {
        toast.error("Authentication error. Please log in again.");
        navigate("/login");
        return;
      }
      toast.error("Failed to fetch inventory items");
      throw error;
    }
  };

  const fetchCategories = async (authToken) => {
    try {
      const response = await axios.get(
        "http://localhost:3000/api/inventory-items/categories",
        {
          withCredentials: true,
          headers: {
            Authorization: `Bearer ${authToken || token}`,
            "Content-Type": "application/json",
          },
        }
      );
      setCategories(response.data);
    } catch (error) {
      console.error("Error fetching categories:", error);
      if (error.response?.status === 401 || error.response?.status === 403) {
        toast.error("Authentication error. Please log in again.");
        navigate("/login");
        return;
      }
      toast.error("Failed to fetch categories");
      throw error;
    }
  };

  const handleAdd = () => {
    setEditingItem(null);
    form.resetFields();
    setModalVisible(true);
  };

  const handleEdit = (record) => {
    setEditingItem(record);
    form.setFieldsValue({
      item_name: record.item_name,
      item_description: record.item_description,
      category: record.category,
      brand: record.brand,
      unit: record.unit,
      restock_level: record.restock_level,
    });
    setModalVisible(true);
  };

  const handleDelete = async (itemId) => {
    try {
      await axios.delete(
        `http://localhost:3000/api/inventory-items/${itemId}`,
        {
          withCredentials: true,
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );
      toast.success("Item deleted successfully");
      fetchItems(token);
    } catch (error) {
      console.error("Error deleting item:", error);
      if (error.response?.status === 401 || error.response?.status === 403) {
        toast.error("Authentication error. Please log in again.");
        navigate("/login");
        return;
      }
      toast.error(error.response?.data?.message || "Failed to delete item");
    }
  };

  const handleModalOk = async () => {
    try {
      const values = await form.validateFields();

      // Format the data to send to the API
      const formData = {
        item_name: values.item_name,
        item_description: values.item_description,
        category:
          values.category ||
          (values.category_id
            ? categories.find((c) => c.category_id === values.category_id)
                ?.category
            : ""),
        brand: values.brand,
        unit: values.unit,
        restock_level: values.restock_level,
      };

      if (editingItem) {
        await axios.put(
          `http://localhost:3000/api/inventory-items/${editingItem.item_id}`,
          formData,
          {
            withCredentials: true,
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          }
        );
        toast.success("Item updated successfully");
      } else {
        await axios.post(
          "http://localhost:3000/api/inventory-items",
          formData,
          {
            withCredentials: true,
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          }
        );
        toast.success("Item created successfully");
      }
      setModalVisible(false);
      fetchItems(token);
    } catch (error) {
      console.error("Error saving item:", error);
      if (error.response?.status === 401 || error.response?.status === 403) {
        toast.error("Authentication error. Please log in again.");
        navigate("/login");
        return;
      }
      toast.error(error.response?.data?.message || "Operation failed");
    }
  };

  const handleSearch = (value) => {
    setSearchText(value);
  };

  const handleCreateCategory = async () => {
    try {
      const values = await categoryForm.validateFields();

      await axios.post(
        "http://localhost:3000/api/inventory-items/categories",
        values,
        {
          withCredentials: true,
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );
      toast.success("Category created successfully");
      setCategoryModalVisible(false);
      categoryForm.resetFields();
      fetchCategories(token);
    } catch (error) {
      console.error("Error creating category:", error);
      if (error.response?.status === 401 || error.response?.status === 403) {
        toast.error("Authentication error. Please log in again.");
        navigate("/login");
        return;
      }
      toast.error(error.response?.data?.message || "Failed to create category");
    }
  };

  const generatePDFReport = async () => {
    try {
      if (filteredItems.length === 0) {
        toast.warn("No items to include in the report");
        return;
      }

      setExportLoading(true);

      // Create new PDF document
      const doc = new jsPDF("landscape", "mm", "a4");
      const pageWidth = doc.internal.pageSize.width;
      const pageHeight = doc.internal.pageSize.height;

      // Add report title
      doc.setFontSize(22);
      doc.text("Inventory Items Report", pageWidth / 2, 15, {
        align: "center",
      });

      // Add report information
      doc.setFontSize(12);
      const reportDate = dayjs().format("YYYY-MM-DD HH:mm");
      doc.text(`Generated on: ${reportDate}`, pageWidth / 2, 22, {
        align: "center",
      });

      // Add filter criteria
      if (searchText) {
        doc.text(`Search Filter: "${searchText}"`, pageWidth / 2, 29, {
          align: "center",
        });
      }

      // Add statistics summary
      doc.setFontSize(11);
      doc.setTextColor(0, 0, 0);

      const statsData = [
        [
          { content: "Total Items:", styles: { fontStyle: "bold" } },
          { content: stats.totalItems.toString() },
          { content: "Low Stock Items:", styles: { fontStyle: "bold" } },
          { content: stats.lowStock.toString() },
          { content: "Categories:", styles: { fontStyle: "bold" } },
          { content: stats.categories.toString() },
        ],
      ];

      doc.autoTable({
        startY: 35,
        body: statsData,
        theme: "grid",
        styles: { fontSize: 10, cellPadding: 3 },
        margin: { left: 10, right: 10 },
        tableWidth: pageWidth - 20,
      });

      // Inventory table headers
      const headers = [
        "Item Name",
        "Description",
        "Category",
        "Brand",
        "Unit",
        "Stock Quantity",
        "Restock Level",
        "Current Price",
      ];

      // Prepare inventory table data
      const data = filteredItems.map((item) => [
        item.item_name,
        item.item_description || "N/A",
        item.category || "N/A",
        item.brand || "N/A",
        item.unit || "N/A",
        item.total_quantity?.toString() || "0",
        item.restock_level?.toString() || "N/A",
        item.current_selling_price
          ? `Rs ${parseFloat(item.current_selling_price).toFixed(2)}`
          : "N/A",
      ]);

      // Add main inventory table
      doc.autoTable({
        startY: 45,
        head: [headers],
        body: data,
        theme: "grid",
        headStyles: {
          fillColor: [41, 128, 185],
          textColor: 255,
          fontSize: 10,
          fontStyle: "bold",
        },
        styles: { fontSize: 9, cellPadding: 3 },
        margin: { left: 10, right: 10 },
      });

      // Save the document
      doc.save(`Inventory_Report_${dayjs().format("YYYY-MM-DD")}.pdf`);
      toast.success("PDF report generated successfully");
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast.error("Failed to generate PDF report");
    } finally {
      setExportLoading(false);
    }
  };

  // Filter items based on search text
  const filteredItems = items.filter(
    (item) =>
      item.item_name.toLowerCase().includes(searchText.toLowerCase()) ||
      item.category?.toLowerCase().includes(searchText.toLowerCase()) ||
      item.brand?.toLowerCase().includes(searchText.toLowerCase()) ||
      item.item_description?.toLowerCase().includes(searchText.toLowerCase())
  );

  // Column definitions for the items table
  const columns = [
    {
      title: "Item Name",
      dataIndex: "item_name",
      key: "item_name",
      sorter: (a, b) => a.item_name.localeCompare(b.item_name),
    },
    {
      title: "Category",
      dataIndex: "category",
      key: "category",
      sorter: (a, b) => (a.category || "").localeCompare(b.category || ""),
      render: (category) => (
        <Tag className="category-tag">{category || "Uncategorized"}</Tag>
      ),
    },
    {
      title: "Brand",
      dataIndex: "brand",
      key: "brand",
      sorter: (a, b) => (a.brand || "").localeCompare(b.brand || ""),
    },
    {
      title: "Unit",
      dataIndex: "unit",
      key: "unit",
    },
    {
      title: "Stock",
      dataIndex: "total_quantity",
      key: "total_quantity",
      sorter: (a, b) => (a.total_quantity || 0) - (b.total_quantity || 0),
      render: (qty, record) => {
        const isLowStock = (qty || 0) <= (record.restock_level || 0);
        return (
          <span className={`${isLowStock ? "low-stock" : ""}`}>
            {isLowStock ? (
              <Badge status="error" className="stock-badge" />
            ) : null}
            {qty || 0}
          </span>
        );
      },
    },
    {
      title: "Restock Level",
      dataIndex: "restock_level",
      key: "restock_level",
      sorter: (a, b) => (a.restock_level || 0) - (b.restock_level || 0),
      width: 140,
    },
    {
      title: "Actions",
      key: "actions",
      width: 150,
      render: (_, record) => (
        <Space size="small">
          <Button
            type="primary"
            icon={<EditOutlined />}
            size="middle"
            onClick={() => handleEdit(record)}
            className="edit-button"
          />
          <Popconfirm
            title="Are you sure you want to delete this item?"
            onConfirm={() => handleDelete(record.item_id)}
            okText="Yes"
            cancelText="No"
            placement="topRight"
            icon={<ExclamationCircleOutlined style={{ color: "red" }} />}
          >
            <Button
              type="primary"
              danger
              icon={<DeleteOutlined />}
              size="middle"
              className="delete-button"
            />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  if (loading && items.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading inventory items...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="min-h-screen py-8"
        style={{ backgroundColor: "#ffffff" }}
      >
        <div className="max-w-8xl mx-auto px-4 sm:px-6 lg:px-8">
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

          <div className="mb-8 flex justify-between items-center">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Title level={2}>Inventory Management</Title>
            </motion.div>
          </div>

          {/* Stats Cards */}
          <Row gutter={[16, 16]} className="mb-6">
            <Col xs={24} sm={12} md={6}>
              <Card className="stat-card">
                <Statistic
                  title="Total Items"
                  value={stats.totalItems}
                  prefix={<InboxOutlined />}
                  className="inventory-stat"
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Card className="stat-card">
                <Statistic
                  title="Low Stock Items"
                  value={stats.lowStock}
                  prefix={<WarningOutlined style={{ color: "#ff4d4f" }} />}
                  className="inventory-stat"
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Card className="stat-card">
                <Statistic
                  title="Categories"
                  value={stats.categories}
                  prefix={<ShoppingOutlined />}
                  className="inventory-stat"
                />
              </Card>
            </Col>
          </Row>

          <Card className="mb-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 gap-4">
              <div className="flex items-center space-x-4">
                <Search
                  placeholder="Search items, brands, categories..."
                  size="large"
                  allowClear
                  onChange={(e) => handleSearch(e.target.value)}
                  className="inventory-search"
                />
                <Button
                  type="primary"
                  icon={<FolderAddOutlined />}
                  onClick={() => setCategoryModalVisible(true)}
                  className="category-button"
                >
                  New Category
                </Button>
              </div>
              <div className="flex items-center space-x-4">
                <Button
                  type="primary"
                  icon={<FilePdfOutlined />}
                  onClick={generatePDFReport}
                  loading={exportLoading}
                  className="report-button"
                >
                  Generate Report
                </Button>
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={handleAdd}
                  size="large"
                  className="add-button"
                >
                  Add New Item
                </Button>
              </div>
            </div>

            <Table
              columns={columns}
              dataSource={filteredItems}
              rowKey="item_id"
              loading={loading}
              pagination={{
                pageSize: 10,
                showSizeChanger: true,
                showTotal: (total, range) =>
                  `${range[0]}-${range[1]} of ${total} items`,
              }}
              className="inventory-table"
            />
          </Card>
        </div>
      </motion.div>

      {/* Item Modal */}
      <Modal
        title={
          <Title level={4}>
            {editingItem ? "Edit Item" : "Add New Item"}
          </Title>
        }
        open={modalVisible}
        onOk={handleModalOk}
        onCancel={() => setModalVisible(false)}
        width={600}
        centered
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="item_name"
            label="Item Name"
            rules={[{ required: true, message: "Please enter item name" }]}
          >
            <Input size="large" className="modal-input" />
          </Form.Item>

          <Form.Item
            name="item_description"
            label="Description"
          >
            <Input.TextArea rows={4} className="modal-input" />
          </Form.Item>

          <Form.Item
            name="category"
            label="Category"
            rules={[{ required: true, message: "Please select a category" }]}
          >
            <Select
              size="large"
              placeholder="Select a category"
              className="modal-select"
            >
              {categories.map((category) => (
                <Option key={category.category_id} value={category.category}>
                  {category.category}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="brand"
            label="Brand"
          >
            <Input size="large" className="modal-input" />
          </Form.Item>

          <Form.Item
            name="unit"
            label="Unit"
            rules={[{ required: true, message: "Please enter the unit" }]}
          >
            <Input
              size="large"
              placeholder="e.g., Piece, Bottle, Liter"
              className="modal-input"
            />
          </Form.Item>

          <Form.Item
            name="restock_level"
            label="Restock Level"
            rules={[
              { required: true, message: "Please enter restock level" },
            ]}
          >
            <Input
              size="large"
              type="number"
              min={0}
              className="modal-input"
            />
          </Form.Item>
        </Form>
      </Modal>

      {/* Category Modal */}
      <Modal
        title={<Title level={4}>Add New Category</Title>}
        open={categoryModalVisible}
        onOk={handleCreateCategory}
        onCancel={() => setCategoryModalVisible(false)}
        width={500}
        centered
      >
        <Form form={categoryForm} layout="vertical">
          <Form.Item
            name="category"
            label="Category Name"
            rules={[{ required: true, message: "Please enter category name" }]}
          >
            <Input size="large" className="modal-input" />
          </Form.Item>

          <Form.Item
            name="description"
            label="Description"
          >
            <Input.TextArea rows={4} className="modal-input" />
          </Form.Item>
        </Form>
      </Modal>
      <style>{`
        /* Standard white theme and font sizes */
        .inventory-table .ant-table-thead > tr > th {
            font-size: 20px;
            padding: 12px 16px;
        }
        
        .inventory-table .ant-table-tbody > tr > td {
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
        
        /* Stat cards */
        .stat-card {
            border-radius: 10px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
        }
        
        .inventory-stat .ant-statistic-title {
            font-size: 18px;
            color: #666;
        }
        
        .inventory-stat .ant-statistic-content {
            font-size: 24px;
            color: #333;
        }
        
        /* Search and buttons */
        .inventory-search {
            width: 350px;
        }
        
        .inventory-search input {
            height: 40px;
            font-size: 18px;
        }
        
        .category-button,
        .report-button,
        .add-button {
            height: 40px;
            font-size: 18px;
            padding: 0 20px;
        }
        
        /* Table styles */
        .category-tag {
            font-size: 16px;
            padding: 4px 8px;
        }
        
        .low-stock {
            color: #ff4d4f;
            font-weight: bold;
        }
        
        .stock-badge {
            margin-right: 5px;
        }
        
        .edit-button,
        .delete-button {
            font-size: 16px;
        }
        
        /* Modal styling */
        .ant-modal-header {
            padding: 16px 24px;
        }
        
        .ant-modal-title h4 {
            font-size: 22px;
            margin: 0;
        }
        
        .ant-form-item-label > label {
            font-size: 18px;
        }
        
        .modal-input,
        .modal-select {
            font-size: 18px;
        }
        
        .ant-input-number {
            width: 100%;
        }
      `}</style>
    </>
  );
};

export default AdminInventoryItem;
