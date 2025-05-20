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
  Space,
  Card,
  Typography,
  DatePicker,
  InputNumber,
  Select,
  Tag,
  Tooltip,
  Drawer,
  Alert,
  Row,
  Col,
  Descriptions,
  Popconfirm,
  Divider,
  Empty,
  Badge,
  Spin,
} from "antd";
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  ToolOutlined,
  CarOutlined,
  HistoryOutlined,
  SettingOutlined,
  FileTextOutlined,
  SearchOutlined,
} from "@ant-design/icons";
import { motion } from "framer-motion";
import dayjs from "dayjs";

const { Title, Text } = Typography;
const { TextArea } = Input;
const { Option } = Select;

// Custom styles moved to bottom of file

const AdminServiceRecord = () => {
  const navigate = useNavigate();
  const [serviceRecords, setServiceRecords] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [inventoryItems, setInventoryItems] = useState([]);
  const [stockBatches, setStockBatches] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [partsDrawerVisible, setPartsDrawerVisible] = useState(false);
  const [invoiceModalVisible, setInvoiceModalVisible] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [form] = Form.useForm();
  const [partsForm] = Form.useForm();
  const [partsLoading, setPartsLoading] = useState(false);
  const [token, setToken] = useState("");

  // Authentication check and fetch data on mount
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
          await Promise.all([
            fetchServiceRecords(token),
            fetchVehicles(token),
            fetchInventoryItems(token),
          ]);
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

  const fetchServiceRecords = async (authToken) => {
    try {
      const response = await axios.get(
        "http://localhost:3000/api/service-records",
        {
          withCredentials: true,
          headers: {
            Authorization: `Bearer ${authToken || token}`,
            "Content-Type": "application/json",
          },
        }
      );
      setServiceRecords(response.data);
    } catch (error) {
      console.error("Error fetching service records:", error);
      if (error.response?.status === 401 || error.response?.status === 403) {
        navigate("/login");
        return;
      }
      toast.error("Failed to fetch service records");
      throw error;
    }
  };

  const fetchVehicles = async (authToken) => {
    try {
      const response = await axios.get(
        "http://localhost:3000/api/vehicle-profiles",
        {
          withCredentials: true,
          headers: {
            Authorization: `Bearer ${authToken || token}`,
            "Content-Type": "application/json",
          },
        }
      );
      setVehicles(response.data);
    } catch (error) {
      console.error("Error fetching vehicles:", error);
      if (error.response?.status === 401 || error.response?.status === 403) {
        navigate("/login");
        return;
      }
      toast.error("Failed to fetch vehicles");
      throw error;
    }
  };

  const fetchInventoryItems = async (authToken) => {
    try {
      // Fetch inventory items
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

      setInventoryItems(response.data);

      // After getting items, fetch stock details for each item
      const items = response.data;
      const batches = {};

      for (const item of items) {
        if (item.total_quantity > 0) {
          try {
            const stockResponse = await axios.get(
              `http://localhost:3000/api/inventory-releases/stock-status/${item.item_id}`,
              {
                withCredentials: true,
                headers: {
                  Authorization: `Bearer ${authToken || token}`,
                  "Content-Type": "application/json",
                },
              }
            );

            batches[item.item_id] = stockResponse.data.stock_entries;
          } catch (err) {
            console.error(
              `Error fetching stock for item ${item.item_id}:`,
              err
            );
          }
        }
      }

      setStockBatches(batches);
    } catch (error) {
      console.error("Error fetching inventory items:", error);
      if (error.response?.status === 401 || error.response?.status === 403) {
        navigate("/login");
        return;
      }
      toast.error("Failed to fetch inventory items");
      throw error;
    }
  };

  const handleCreate = () => {
    setSelectedRecord(null);
    form.resetFields();
    setModalVisible(true);
  };

  const handleEdit = (record) => {
    console.log("Editing record:", record); // Debug log

    // Don't allow editing of completed records
    if (record.status === "completed") {
      toast.error("This service record is completed and cannot be modified");
      return;
    }

    setSelectedRecord(record);

    // Parse dates with error handling
    let serviceDate = null;
    let nextServiceDate = null;

    try {
      serviceDate = record.date_ ? dayjs(record.date_) : null;
      nextServiceDate = record.next_service_date
        ? dayjs(record.next_service_date)
        : null;

      // Validate date parsing
      if (serviceDate && !serviceDate.isValid()) {
        console.error("Invalid service date format:", record.date_);
        serviceDate = null;
      }

      if (nextServiceDate && !nextServiceDate.isValid()) {
        console.error(
          "Invalid next service date format:",
          record.next_service_date
        );
        nextServiceDate = null;
      }
    } catch (error) {
      console.error("Error parsing dates:", error);
    }

    // Set form values
    form.setFieldsValue({
      vehicle_number: record.vehicle_number,
      service_description: record.service_description,
      date_: serviceDate,
      next_service_date: nextServiceDate,
      millage: record.millage,
    });

    setModalVisible(true);
  };

  const handleModalOk = async () => {
    try {
      const values = await form.validateFields();

      // Convert and format dates properly for the API
      const formattedValues = {
        ...values,
        date_: values.date_ ? values.date_.format("YYYY-MM-DD") : null,
        next_service_date: values.next_service_date
          ? values.next_service_date.format("YYYY-MM-DD")
          : null,
      };

      // Ensure we have a valid date before submitting
      if (!formattedValues.date_) {
        toast.error("Service date is required");
        return;
      }

      // Debug output
      console.log("Submitting service record:", formattedValues);

      if (selectedRecord) {
        // Log the API call for debugging
        console.log(`Updating service record ${selectedRecord.record_id}`);

        await axios.put(
          `http://localhost:3000/api/service-records/${selectedRecord.record_id}`,
          formattedValues,
          {
            withCredentials: true,
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          }
        );
        toast.success("Service record updated successfully");
      } else {
        await axios.post(
          "http://localhost:3000/api/service-records",
          formattedValues,
          {
            withCredentials: true,
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          }
        );
        toast.success("Service record created successfully");
      }

      setModalVisible(false);
      fetchServiceRecords(token);
    } catch (error) {
      console.error("Error saving service record:", error);
      if (error.response?.status === 401 || error.response?.status === 403) {
        navigate("/login");
        return;
      }
      toast.error(
        error.response?.data?.message || "Failed to save service record"
      );
    }
  };

  const handleViewInvoice = async (record) => {
    try {
      setLoading(true);
      const response = await axios.get(
        `http://localhost:3000/api/service-records/${record.record_id}`,
        {
          withCredentials: true,
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      setSelectedInvoice(response.data);
      setInvoiceModalVisible(true);
    } catch (error) {
      console.error("Error fetching invoice details:", error);
      toast.error("Failed to fetch invoice details");
    } finally {
      setLoading(false);
    }
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

  const columns = [
    {
      title: "Vehicle",
      dataIndex: "vehicle_number",
      key: "vehicle_number",
      render: (text, record) => (
        <Space>
          <CarOutlined style={{ color: "#1890ff", fontSize: "16px" }} />
          <span>
            {text} - {record.make} {record.model}
          </span>
        </Space>
      ),
    },
    {
      title: "Service Description",
      dataIndex: "service_description",
      key: "service_description",
      render: (text) => (
        <Tooltip title={text}>
          <div
            style={{
              maxWidth: "300px",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {text}
          </div>
        </Tooltip>
      ),
    },
    {
      title: "Service Date",
      dataIndex: "date_",
      key: "date_",
      render: (date) => dayjs(date).format("YYYY-MM-DD"),
    },
    {
      title: "Mileage (km)",
      dataIndex: "millage",
      key: "millage",
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      render: (status) => (
        <Tag color={status === "completed" ? "green" : "orange"}>
          {status === "completed" ? "Completed" : "Pending"}
        </Tag>
      ),
    },
    {
      title: "Actions",
      key: "actions",
      render: (_, record) => (
        <Space onClick={(e) => e.stopPropagation()}>
          {" "}
          {/* Prevent row click */}
          <Tooltip
            title={
              record.status === "completed"
                ? "This record is completed and cannot be edited"
                : "Edit Record"
            }
          >
            <Button
              type="primary"
              icon={<EditOutlined />}
              onClick={() => handleEdit(record)}
              size="large"
              disabled={record.status === "completed"}
            />
          </Tooltip>
        </Space>
      ),
    },
  ];

  // Handle row click to navigate to detail page
  const handleRowClick = (record) => {
    const user = JSON.parse(localStorage.getItem("user"));
    const basePath = user.role === "technician" ? "/technician" : "/admin";
    navigate(`${basePath}/service-records/${record.record_id}`);
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
              Service Records
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
            onClose={() => setError("")}
            className="mb-4"
          />
        )}

        {success && (
          <Alert
            message="Success"
            description={success}
            type="success"
            showIcon
            closable
            onClose={() => setSuccess("")}
            className="mb-4"
          />
        )}

        <Card className="mb-8 content-card" bodyStyle={{ padding: "20px" }}>
          <div className="flex justify-between items-center mb-4">
            <Title level={4} className="section-title">
              All Service Records
            </Title>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={handleCreate}
              size="large"
              className="action-button"
            >
              New Service Record
            </Button>
          </div>

          {loading ? (
            <div className="loading-container">
              <Spin size="large" />
              <p>Loading service records...</p>
            </div>
          ) : (
            <Table
              columns={columns}
              dataSource={serviceRecords}
              rowKey="record_id"
              className="service-history-table"
              onRow={(record) => ({
                onClick: () => handleRowClick(record),
                style: { cursor: "pointer" },
              })}
              pagination={{
                pageSize: 10,
                position: ["bottomCenter"],
                showTotal: (total) => <Text>Total {total} records</Text>,
              }}
              scroll={{ x: 1100 }}
            />
          )}
        </Card>

        <Modal
          title={
            <Title level={3} className="modal-title">
              {selectedRecord ? "Edit Service Record" : "New Service Record"}
            </Title>
          }
          open={modalVisible}
          onOk={handleModalOk}
          onCancel={() => setModalVisible(false)}
          width={950}
          className="styled-modal"
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
          <Form form={form} layout="vertical">
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  name="vehicle_number"
                  label="Vehicle"
                  rules={[
                    { required: true, message: "Please select a vehicle" },
                  ]}
                >
                  <Select
                    placeholder="Select vehicle"
                    showSearch
                    optionFilterProp="children"
                    disabled={!!selectedRecord}
                  >
                    {vehicles.map((vehicle) => (
                      <Option
                        key={vehicle.vehicle_number}
                        value={vehicle.vehicle_number}
                      >
                        {vehicle.vehicle_number} - {vehicle.make}{" "}
                        {vehicle.model}
                      </Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name="millage"
                  label="Mileage (km)"
                  rules={[
                    { required: true, message: "Please enter mileage" },
                    {
                      type: "number",
                      min: 10,
                      max: 1500000,
                      message: "Mileage must be between 10 and 1,500,000 km",
                    },
                  ]}
                >
                  <InputNumber
                    style={{ width: "100%" }}
                    min={0}
                    placeholder="Enter current mileage"
                  />
                </Form.Item>
              </Col>
            </Row>

            <Form.Item
              name="service_description"
              label="Service Description"
              rules={[
                { required: true, message: "Please enter service description" },
              ]}
            >
              <TextArea rows={4} placeholder="Enter service details" />
            </Form.Item>

            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  name="date_"
                  label="Service Date"
                  rules={[
                    { required: true, message: "Please select service date" },
                  ]}
                >
                  <DatePicker
                    style={{ width: "100%" }}
                    format="YYYY-MM-DD"
                    allowClear={false}
                    placeholder="Select service date"
                    disabledDate={(current) => {
                      const today = dayjs().startOf("day");
                      return current && !current.isSame(today, "day");
                    }}
                  />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="next_service_date" label="Next Service Date">
                  <DatePicker
                    style={{ width: "100%" }}
                    format="YYYY-MM-DD"
                    placeholder="Select next service date (optional)"
                    disabledDate={(current) => {
                      // Disable dates less than 3 months from today
                      // For example, if today is May 16, 2023, dates before August 16, 2023 will be disabled
                      return (
                        current &&
                        current < dayjs().add(3, "month").startOf("day")
                      );
                    }}
                  />
                </Form.Item>
              </Col>
            </Row>
          </Form>
        </Modal>

        <Modal
          title={
            <Title level={4} className="modal-title">
              Invoice Details
            </Title>
          }
          open={invoiceModalVisible}
          onCancel={() => setInvoiceModalVisible(false)}
          footer={[
            <Button key="close" onClick={() => setInvoiceModalVisible(false)}>
              Close
            </Button>,
          ]}
          width={800}
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
          {selectedInvoice && selectedInvoice.invoice && (
            <div>
              <Descriptions
                title={
                  <Text
                    className="section-title"
                    style={{ marginBottom: "15px" }}
                  >
                    Service Information
                  </Text>
                }
                bordered
                column={3}
                className="details-descriptions"
              >
                <Descriptions.Item label="Invoice ID" span={3}>
                  {selectedInvoice.invoice.invoice_id}
                </Descriptions.Item>
                <Descriptions.Item label="Vehicle" span={3}>
                  {selectedInvoice.vehicle_number} - {selectedInvoice.make}{" "}
                  {selectedInvoice.model}
                </Descriptions.Item>
                <Descriptions.Item label="Service Description" span={3}>
                  {selectedInvoice.service_description}
                </Descriptions.Item>
                <Descriptions.Item label="Service Date">
                  {dayjs(selectedInvoice.date_).format("YYYY-MM-DD")}
                </Descriptions.Item>
                <Descriptions.Item label="Mileage">
                  {selectedInvoice.millage} km
                </Descriptions.Item>
                <Descriptions.Item label="Invoice Date">
                  {dayjs(selectedInvoice.invoice.created_date).format(
                    "YYYY-MM-DD"
                  )}
                </Descriptions.Item>
              </Descriptions>

              <Divider>
                <Text className="divider-text">Parts Used</Text>
              </Divider>

              {selectedInvoice.parts_used &&
              selectedInvoice.parts_used.length > 0 ? (
                <Table
                  dataSource={selectedInvoice.parts_used}
                  rowKey={(record) => `${record.stock_id}`}
                  pagination={false}
                  bordered
                  className="parts-table"
                >
                  <Table.Column title="Part" dataIndex="item_name" />
                  <Table.Column title="Brand" dataIndex="brand" />
                  <Table.Column title="Quantity" dataIndex="quantity_used" />
                  <Table.Column
                    title="Unit Price"
                    dataIndex="unit_price"
                    render={(price) => `Rs ${price.toFixed(2)}`}
                  />
                  <Table.Column
                    title="Total"
                    render={(_, record) =>
                      `Rs ${(record.quantity_used * record.unit_price).toFixed(
                        2
                      )}`
                    }
                  />
                </Table>
              ) : (
                <Empty
                  description="No parts used"
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                />
              )}

              <Divider>
                <Text className="divider-text">Invoice Summary</Text>
              </Divider>

              <Descriptions
                bordered
                column={3}
                className="details-descriptions"
              >
                <Descriptions.Item label="Parts Total" span={2}>
                  Rs {selectedInvoice.invoice.parts_total_price.toFixed(2)}
                </Descriptions.Item>
                <Descriptions.Item label="Service Charge">
                  Rs {selectedInvoice.invoice.service_charge.toFixed(2)}
                </Descriptions.Item>
                <Descriptions.Item label="Total Amount" span={3}>
                  <Text strong className="total-price">
                    Rs {selectedInvoice.invoice.total_price.toFixed(2)}
                  </Text>
                </Descriptions.Item>
              </Descriptions>
            </div>
          )}
        </Modal>
      </div>

      <style jsx global>{`
        .service-history-table .ant-table-thead > tr > th {
          background-color: #f0f5ff;
          font-size: 20px;
          font-weight: 600;
          padding: 15px 20px;
          color: #333;
        }

        .service-history-table .ant-table-tbody > tr > td {
          font-size: 19px;
          padding: 15px 20px;
        }

        .service-history-table .ant-table-tbody > tr:nth-child(odd) {
          background-color: #fafafa;
        }

        .service-history-table .ant-table-tbody > tr:hover > td {
          background-color: #e6f7ff;
        }

        .parts-table .ant-table-thead > tr > th {
          background-color: #f0f7ff;
          font-weight: 600;
          font-size: 20px;
          padding: 12px 16px;
        }

        .parts-table .ant-table-tbody > tr > td {
          font-size: 19px;
          padding: 12px 16px;
        }

        /* Increase form label font sizes */
        .styled-modal .ant-form-item-label > label {
          font-size: 19px !important;
        }

        /* Increase input placeholder font sizes */
        .styled-modal .ant-input::placeholder,
        .styled-modal .ant-input-number-input::placeholder {
          font-size: 18px !important;
        }

        /* Increase select placeholder font size */
        .styled-modal .ant-select-selection-placeholder {
          font-size: 18px !important;
        }

        /* Increase select option text size */
        .ant-select-item-option-content {
          font-size: 18px !important;
        }

        /* Increase selected item text size */
        .ant-select-selection-item {
          font-size: 18px !important;
        }

        /* Increase input text size */
        .styled-modal .ant-input,
        .styled-modal .ant-input-number-input {
          font-size: 18px !important;
        }

        /* Increase date picker text size */
        .ant-picker-input > input {
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

export default AdminServiceRecord;
