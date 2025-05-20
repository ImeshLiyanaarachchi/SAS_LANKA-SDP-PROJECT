import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate, useParams } from "react-router-dom";
import {
  Table,
  Card,
  Typography,
  Tag,
  Button,
  Modal,
  Form,
  Input,
  DatePicker,
  InputNumber,
  Popconfirm,
  Breadcrumb,
  Spin,
  Alert,
  Divider,
  Space,
  List,
  Empty,
  ConfigProvider,
  theme as antTheme,
} from "antd";
import {
  CarOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  RollbackOutlined,
  ToolOutlined,
  HistoryOutlined,
} from "@ant-design/icons";
import { motion } from "framer-motion";
import dayjs from "dayjs";

const { Title, Text } = Typography;
const { TextArea } = Input;

// Create a global style object to increase font size
const globalStyle = {
  fontSize: "16px", // Larger base font size
  ".ant-typography": {
    fontSize: "1.1em",
  },
  ".ant-form-item-label > label": {
    fontSize: "1.1em",
  },
  ".ant-btn": {
    fontSize: "1.05em",
  },
  ".ant-table": {
    fontSize: "1.05em",
  },
  ".ant-list-item": {
    fontSize: "1.05em",
  },
  ".ant-breadcrumb": {
    fontSize: "1.1em",
  },
  ".ant-alert-message": {
    fontSize: "1.1em",
  },
  ".ant-alert-description": {
    fontSize: "1.05em",
  },
};

const CustomServiceRecords = () => {
  const navigate = useNavigate();
  const { vehicleNumber } = useParams();
  const [form] = Form.useForm();
  const [partForm] = Form.useForm();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [customServiceRecords, setCustomServiceRecords] = useState([]);
  const [vehicleDetails, setVehicleDetails] = useState(null);

  const [modalVisible, setModalVisible] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);

  const [partModalVisible, setPartModalVisible] = useState(false);
  const [selectedPartId, setSelectedPartId] = useState(null);
  const [partEditMode, setPartEditMode] = useState(false);

  // Define theme consistent with Services.jsx
  const darkTheme = {
    colorBgBase: "#0a0b1e",
    colorTextBase: "#ffffff",
    colorBgElevated: "#12133a",
    colorPrimary: "#4ade80", // Green-500 equivalent to green-600 in Tailwind
    colorLink: "#4ade80",
    colorSuccess: "#4ade80",
    colorWarning: "#f59e0b",
    colorError: "#ef4444",
    colorInfo: "#3b82f6",
    borderRadius: 8,
  };

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const user = JSON.parse(localStorage.getItem("user"));
        if (!user) {
          navigate("/login");
          return;
        }

        // Fetch data once authentication is confirmed
        fetchVehicleDetails();
        fetchCustomServiceRecords();
      } catch (error) {
        console.error("Auth check error:", error);
        localStorage.removeItem("user");
        navigate("/login");
      }
    };

    checkAuth();
  }, [vehicleNumber]);

  const fetchVehicleDetails = async () => {
    try {
      const response = await axios.get(
        `http://localhost:3000/api/vehicle-profiles/${vehicleNumber}`,
        {
          withCredentials: true,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      setVehicleDetails(response.data);
    } catch (error) {
      console.error("Error fetching vehicle details:", error);
      if (error.response?.status === 401 || error.response?.status === 403) {
        localStorage.removeItem("user");
        navigate("/login");
      } else {
        setError(
          `Failed to fetch vehicle details: ${
            error.response?.data?.message || error.message
          }`
        );
      }
    }
  };

  const fetchCustomServiceRecords = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await axios.get(
        `http://localhost:3000/api/custom-service-records/vehicle/${vehicleNumber}`,
        {
          withCredentials: true,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      console.log("Custom service records response:", response.data);
      setCustomServiceRecords(response.data);
    } catch (error) {
      console.error("Error fetching custom service records:", error);
      if (error.response?.status === 401 || error.response?.status === 403) {
        localStorage.removeItem("user");
        navigate("/login");
      } else {
        setError(
          `Failed to fetch custom service records: ${
            error.response?.data?.message || error.message
          }`
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAddServiceRecord = () => {
    form.resetFields();
    setEditMode(false);
    setSelectedRecord(null);
    setModalVisible(true);
  };

  const handleEditServiceRecord = (record) => {
    setSelectedRecord(record);
    form.setFieldsValue({
      service_date: dayjs(record.service_date),
      place_of_service: record.place_of_service,
      description: record.description,
    });
    setEditMode(true);
    setModalVisible(true);
  };

  const handleDeleteServiceRecord = async (recordId) => {
    try {
      await axios.delete(
        `http://localhost:3000/api/custom-service-records/${recordId}`,
        {
          withCredentials: true,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      setSuccess("Service record deleted successfully");
      fetchCustomServiceRecords();
    } catch (error) {
      console.error("Error deleting service record:", error);
      if (error.response?.status === 401 || error.response?.status === 403) {
        localStorage.removeItem("user");
        navigate("/login");
      } else {
        setError(
          `Failed to delete service record: ${
            error.response?.data?.message || error.message
          }`
        );
      }
    }
  };

  const handleModalOk = async () => {
    try {
      const values = await form.validateFields();
      const formattedValues = {
        ...values,
        service_date: values.service_date.format("YYYY-MM-DD"),
        vehicle_number: vehicleNumber,
      };

      if (editMode && selectedRecord) {
        await axios.put(
          `http://localhost:3000/api/custom-service-records/${selectedRecord.custom_service_id}`,
          formattedValues,
          {
            withCredentials: true,
            headers: {
              "Content-Type": "application/json",
            },
          }
        );

        setSuccess("Service record updated successfully");
      } else {
        await axios.post(
          "http://localhost:3000/api/custom-service-records",
          formattedValues,
          {
            withCredentials: true,
            headers: {
              "Content-Type": "application/json",
            },
          }
        );

        setSuccess("Service record added successfully");
      }

      setModalVisible(false);
      fetchCustomServiceRecords();
    } catch (error) {
      console.error("Error saving service record:", error);
      if (error.response?.status === 401 || error.response?.status === 403) {
        localStorage.removeItem("user");
        navigate("/login");
      } else {
        setError(
          `Failed to save service record: ${
            error.response?.data?.message || error.message
          }`
        );
      }
    }
  };

  const handleAddPart = (record) => {
    partForm.resetFields();
    setSelectedRecord(record);
    setPartEditMode(false);
    setSelectedPartId(null);
    setPartModalVisible(true);
  };

  const handleEditPart = (record, part) => {
    setSelectedRecord(record);
    setSelectedPartId(part.part_id);
    partForm.setFieldsValue({
      part_name: part.part_name,
      brand: part.brand,
      quantity: part.quantity,
      unit_price: part.unit_price,
    });
    setPartEditMode(true);
    setPartModalVisible(true);
  };

  const handleDeletePart = async (recordId, partId) => {
    try {
      await axios.delete(
        `http://localhost:3000/api/custom-service-records/${recordId}/parts/${partId}`,
        {
          withCredentials: true,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      setSuccess("Part deleted successfully");
      fetchCustomServiceRecords();
    } catch (error) {
      console.error("Error deleting part:", error);
      if (error.response?.status === 401 || error.response?.status === 403) {
        localStorage.removeItem("user");
        navigate("/login");
      } else {
        setError(
          `Failed to delete part: ${
            error.response?.data?.message || error.message
          }`
        );
      }
    }
  };

  const handlePartModalOk = async () => {
    try {
      const values = await partForm.validateFields();

      if (partEditMode && selectedPartId) {
        await axios.put(
          `http://localhost:3000/api/custom-service-records/${selectedRecord.custom_service_id}/parts/${selectedPartId}`,
          values,
          {
            withCredentials: true,
            headers: {
              "Content-Type": "application/json",
            },
          }
        );

        setSuccess("Part updated successfully");
      } else {
        await axios.post(
          `http://localhost:3000/api/custom-service-records/${selectedRecord.custom_service_id}/parts`,
          values,
          {
            withCredentials: true,
            headers: {
              "Content-Type": "application/json",
            },
          }
        );

        setSuccess("Part added successfully");
      }

      setPartModalVisible(false);
      fetchCustomServiceRecords();
    } catch (error) {
      console.error("Error saving part:", error);
      if (error.response?.status === 401 || error.response?.status === 403) {
        localStorage.removeItem("user");
        navigate("/login");
      } else {
        setError(
          `Failed to save part: ${
            error.response?.data?.message || error.message
          }`
        );
      }
    }
  };

  const columns = [
    {
      title: <span style={{ fontSize: "19px" }}>Service Date</span>,
      dataIndex: "service_date",
      key: "service_date",
      render: (text) => (
        <span style={{ fontSize: "18px" }}>
          {dayjs(text).format("YYYY-MM-DD")}
        </span>
      ),
      sorter: (a, b) => new Date(b.service_date) - new Date(a.service_date),
      defaultSortOrder: "descend",
    },
    {
      title: <span style={{ fontSize: "19px" }}>Place of Service</span>,
      dataIndex: "place_of_service",
      key: "place_of_service",
      render: (text) => <span style={{ fontSize: "18px" }}>{text}</span>,
    },
    {
      title: <span style={{ fontSize: "19px" }}>Description</span>,
      dataIndex: "description",
      key: "description",
      render: (text) => (
        <div
          style={{
            maxWidth: "300px",
            whiteSpace: "normal",
            wordBreak: "break-word",
            fontSize: "18px",
          }}
        >
          {text || "N/A"}
        </div>
      ),
    },
    {
      title: <span style={{ fontSize: "19px" }}>Parts Used</span>,
      dataIndex: "parts",
      key: "parts",
      render: (parts) => (
        <div style={{ fontSize: "18px" }}>
          {parts && parts.length ? (
            <Tag color="blue" style={{ fontSize: "18px" }}>
              {parts.length} parts
            </Tag>
          ) : (
            <Text type="secondary" style={{ fontSize: "18px" }}>
              None
            </Text>
          )}
        </div>
      ),
    },
    {
      title: <span style={{ fontSize: "19px" }}>Total Cost</span>,
      dataIndex: "total_cost",
      key: "total_cost",
      render: (cost) => (
        <Text strong style={{ fontSize: "18px" }}>
          {`Rs. ${cost.toFixed(2)}`}
        </Text>
      ),
    },
    {
      title: <span style={{ fontSize: "19px" }}>Actions</span>,
      key: "actions",
      render: (_, record) => (
        <Space>
          <Button
            icon={<PlusOutlined />}
            onClick={() => handleAddPart(record)}
            size="small"
            style={{ fontSize: "18px" }}
          >
            Add Part
          </Button>
          <Button
            icon={<EditOutlined />}
            onClick={() => handleEditServiceRecord(record)}
            size="medium"
            type="primary"
            style={{ fontSize: "14px" }}
          />
          <Popconfirm
            title="Are you sure you want to delete this record?"
            onConfirm={() =>
              handleDeleteServiceRecord(record.custom_service_id)
            }
            okText="Yes"
            cancelText="No"
          >
            <Button
              icon={<DeleteOutlined />}
              size="medium"
              danger
              style={{ fontSize: "14px" }}
            />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <ConfigProvider
      theme={{
        algorithm: antTheme.darkAlgorithm,
        token: darkTheme,
        components: {
          Table: {
            colorBgContainer: "#12133a",
            colorBgElevated: "#1a1b4b",
          },
          Card: {
            colorBgContainer: "#12133a",
          },
          Modal: {
            colorBgElevated: "#1a1b4b",
          },
          Button: {
            colorPrimary: "#4ade80",
            colorPrimaryHover: "#22c55e",
          },
        },
      }}
    >
      <div className="min-h-screen text-lg">
        <div className="max-w-8xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Add/Edit Service Record Modal */}
          <Modal
            title={
              <div>
                <Title
                  level={4}
                  style={{ color: "#ffffff", fontSize: "20px" }}
                >
                  {editMode
                    ? "Edit Service Record"
                    : "Add New Service Record"}
                </Title>
              </div>
            }
            open={modalVisible}
            onCancel={() => setModalVisible(false)}
            onOk={handleModalOk}
            okText={editMode ? "Update" : "Add"}
            width={800}
            centered
            okButtonProps={{
              style: {
                fontSize: "16px",
                height: "40px",
                padding: "0 24px",
              },
            }}
            cancelButtonProps={{
              style: {
                fontSize: "16px",
                height: "40px",
                padding: "0 24px",
              },
            }}
          >
            <Form form={form} layout="vertical" style={{ fontSize: "18px" }}>
              <Form.Item
                name="service_date"
                label={<span style={{ fontSize: "18px" }}>Service Date</span>}
                rules={[
                  { required: true, message: "Please select a service date" },
                ]}
              >
                <DatePicker
                  style={{
                    width: "100%",
                    fontSize: "18px",
                    padding: "6px 11px",
                  }}
                  format="YYYY-MM-DD"
                />
              </Form.Item>

              <Form.Item
                name="place_of_service"
                label={
                  <span style={{ fontSize: "18px" }}>Place of Service</span>
                }
              >
                <Input
                  placeholder="e.g., Local Mechanic Workshop"
                  style={{ fontSize: "18px" }}
                />
              </Form.Item>

              <Form.Item
                name="description"
                label={<span style={{ fontSize: "18px" }}>Description</span>}
              >
                <TextArea
                  placeholder="Describe the service performed"
                  rows={4}
                  style={{ fontSize: "18px" }}
                />
              </Form.Item>
            </Form>
          </Modal>

          {/* Add/Edit Part Modal */}
          <Modal
            title={
              <div>
                <Title
                  level={4}
                  style={{ color: "#ffffff", fontSize: "25px" }}
                >
                  {partEditMode ? "Edit Part" : "Add New Part"}
                </Title>
                {selectedRecord && (
                  <Text type="secondary" style={{ fontSize: "18px" }}>
                    For service on{" "}
                    {dayjs(selectedRecord.service_date).format("YYYY-MM-DD")}
                  </Text>
                )}
              </div>
            }
            open={partModalVisible}
            onCancel={() => setPartModalVisible(false)}
            onOk={handlePartModalOk}
            okText={partEditMode ? "Update" : "Add"}
            width={800}
            centered
            okButtonProps={{
              style: {
                fontSize: "16px",
                height: "40px",
                padding: "0 24px",
              },
            }}
            cancelButtonProps={{
              style: {
                fontSize: "16px",
                height: "40px",
                padding: "0 24px",
              },
            }}
          >
            <Form
              form={partForm}
              layout="vertical"
              style={{ fontSize: "18px" }}
            >
              <Form.Item
                name="part_name"
                label={<span style={{ fontSize: "18px" }}>Part Name</span>}
                rules={[
                  { required: true, message: "Please enter part name" },
                ]}
              >
                <Input
                  placeholder="e.g., Oil Filter"
                  style={{ fontSize: "18px" }}
                />
              </Form.Item>

              <Form.Item
                name="brand"
                label={<span style={{ fontSize: "18px" }}>Brand</span>}
              >
                <Input
                  placeholder="e.g., Bosch"
                  style={{ fontSize: "18px" }}
                />
              </Form.Item>

              <Form.Item
                name="quantity"
                label={<span style={{ fontSize: "18px" }}>Quantity</span>}
                initialValue={1}
                rules={[{ required: true, message: "Please enter quantity" }]}
              >
                <InputNumber
                  min={1}
                  step={1} // ⬅️ step size of 1 ensures integers only
                  precision={0} // ⬅️ forces no decimal places
                  style={{ width: "100%", fontSize: "18px" }}
                />
              </Form.Item>

              <Form.Item
                name="unit_price"
                label={
                  <span style={{ fontSize: "18px" }}>Unit Price (Rs.)</span>
                }
                initialValue={0}
                rules={[
                  { required: true, message: "Please enter unit price" },
                ]}
              >
                <InputNumber
                  min={0}
                  step={1}
                  precision={0}
                  style={{ width: "100%", fontSize: "18px" }}
                />
              </Form.Item>
            </Form>
          </Modal>

          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Title level={2} style={{ color: "white" }}>
              Custom Service Records
            </Title>
            <Text type="secondary" style={{ fontSize: "1.1em" }}>
              Manage your own service records for this vehicle
            </Text>
          </motion.div>

          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-4 mt-4"
            >
              <Alert
                message="Error"
                description={error}
                type="error"
                showIcon
                closable
                onClose={() => setError("")}
              />
            </motion.div>
          )}

          {success && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-4 mt-4"
            >
              <Alert
                message="Success"
                description={success}
                type="success"
                showIcon
                closable
                onClose={() => setSuccess("")}
              />
            </motion.div>
          )}

          <div className="mb-6 mt-6">
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={handleAddServiceRecord}
              style={{
                backgroundColor: "#4ade80",
                fontSize: "18px",
                height: "42px",
              }}
              className="hover:bg-green-700"
            >
              Add New Service Record
            </Button>
          </div>

          {/* Service Records Table */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Card
              title={
                <div style={{ fontSize: "1.2em" }}>
                  <ToolOutlined
                    style={{ marginRight: "8px", color: "#4ade80" }}
                  />
                  Custom Service Records
                </div>
              }
              className="shadow-lg"
              style={{ backgroundColor: "#12133a", borderColor: "#1a1b4b" }}
            >
              {loading ? (
                <div className="text-center py-10">
                  <Spin size="large" />
                  <div className="mt-3" style={{ fontSize: "1.1em" }}>
                    Loading records...
                  </div>
                </div>
              ) : customServiceRecords.length > 0 ? (
                <Table
                  columns={columns}
                  dataSource={customServiceRecords}
                  rowKey="custom_service_id"
                  expandable={{
                    expandedRowRender: (record) => (
                      <List
                        header={
                          <div style={{ color: "#4ade80", fontSize: "19px" }}>
                            <strong>Parts Used</strong>
                          </div>
                        }
                        bordered
                        dataSource={record.parts || []}
                        renderItem={(part) => (
                          <List.Item
                            actions={[
                              <Button
                                icon={<EditOutlined />}
                                size="medium"
                                onClick={() => handleEditPart(record, part)}
                              />,
                              <Popconfirm
                                title="Are you sure you want to delete this part?"
                                onConfirm={() =>
                                  handleDeletePart(
                                    record.custom_service_id,
                                    part.part_id
                                  )
                                }
                                okText="Yes"
                                cancelText="No"
                              >
                                <Button
                                  icon={<DeleteOutlined />}
                                  size="medium"
                                  danger
                                />
                              </Popconfirm>,
                            ]}
                          >
                            <List.Item.Meta
                              title={
                                <span style={{ fontSize: "18px" }}>
                                  {part.part_name}
                                </span>
                              }
                              description={
                                part.brand ? (
                                  <span style={{ fontSize: "18px" }}>
                                    Brand: {part.brand}
                                  </span>
                                ) : (
                                  "No brand specified"
                                )
                              }
                            />
                            <div>
                              <Text style={{ fontSize: "18px" }}>
                                Qty: {part.quantity}
                              </Text>
                              <Divider type="vertical" />
                              <Text style={{ fontSize: "18px" }}>
                                Price: Rs.{" "}
                                {isNaN(Number(part.unit_price))
                                  ? "0.00"
                                  : Number(part.unit_price).toFixed(2)}
                              </Text>
                              <Divider type="vertical" />
                              <Text
                                strong
                                style={{ fontSize: "18px", color: "#4ade80" }}
                              >
                                Total: Rs.{" "}
                                {isNaN(
                                  Number(part.quantity * part.unit_price)
                                )
                                  ? "0.00"
                                  : (
                                      Number(part.quantity) *
                                      Number(part.unit_price)
                                    ).toFixed(2)}
                              </Text>
                            </div>
                          </List.Item>
                        )}
                        style={{
                          backgroundColor: "#1a1b4b",
                          borderColor: "#12133a",
                        }}
                      />
                    ),
                  }}
                  pagination={{
                    defaultPageSize: 5,
                    showSizeChanger: true,
                    pageSizeOptions: ["5", "10", "20"],
                  }}
                />
              ) : (
                <Empty
                  description={
                    <span style={{ color: "#ffffff", fontSize: "1.1em" }}>
                      No custom service records found for this vehicle. Click
                      "Add New Service Record" to create one.
                    </span>
                  }
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                />
              )}
            </Card>
          </motion.div>
        </div>
      </div>
    </ConfigProvider>
  );
};

export default CustomServiceRecords;
