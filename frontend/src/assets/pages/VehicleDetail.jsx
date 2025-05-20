import React, { useState, useEffect } from "react";
import axios from "axios";
import { useParams, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import {
  Card,
  Typography,
  Button,
  Row,
  Col,
  Tag,
  Descriptions,
  Divider,
  Space,
  Timeline,
  Spin,
  Image,
  Tabs,
  Empty,
  DatePicker,
  Table,
  Alert,
} from "antd";
import {
  CarOutlined,
  ToolOutlined,
  LeftOutlined,
  CalendarOutlined,
  UserOutlined,
  SettingOutlined,
  FileTextOutlined,
  KeyOutlined,
  InfoCircleOutlined,
  FilePdfOutlined,
  DownloadOutlined,
} from "@ant-design/icons";
import { motion } from "framer-motion";
import dayjs from "dayjs";
import { jsPDF } from "jspdf";
import "jspdf-autotable";

const { Title, Text } = Typography;
const { TabPane } = Tabs;
const { RangePicker } = DatePicker;

// Custom styles
const lightThemeStyles = {
  page: {
    backgroundColor: "#ffffff",
    minHeight: "100vh",
    padding: "20px",
    width: "100%",
  },
};

const VehicleDetail = () => {
  const { vehicleNumber } = useParams();
  const navigate = useNavigate();
  const [vehicle, setVehicle] = useState(null);
  const [owner, setOwner] = useState(null);
  const [serviceHistory, setServiceHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState(null);
  const [filteredHistory, setFilteredHistory] = useState([]);
  const [exportLoading, setExportLoading] = useState(false);
  const [detailedPartsLoading, setDetailedPartsLoading] = useState({});

  useEffect(() => {
    const fetchVehicleDetails = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem("token");
        const user = JSON.parse(localStorage.getItem("user"));
        
        if (!user || (user.role !== "admin" && user.role !== "technician")) {
          navigate("/login");
          return;
        }

        // Fetch vehicle details
        const vehicleResponse = await axios.get(
          `http://localhost:3000/api/vehicle-profiles/${vehicleNumber}`,
          {
            withCredentials: true,
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
          }
        );
        setVehicle(vehicleResponse.data);

        // Fetch service history
        const historyResponse = await axios.get(
          `http://localhost:3000/api/service-records/vehicle/${vehicleNumber}`,
          {
            withCredentials: true,
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
          }
        );
        const sortedHistory = historyResponse.data.sort((a, b) => 
          new Date(b.date_) - new Date(a.date_)
        );
        
        // Fetch detailed parts data for each service
        const historyWithDetailedParts = await Promise.all(
          sortedHistory.map(async (record) => {
            try {
              setDetailedPartsLoading(prev => ({ ...prev, [record.record_id]: true }));
              
              // Get detailed service record with parts
              const detailedRecordResponse = await axios.get(
                `http://localhost:3000/api/service-records/${record.record_id}`,
                {
                  withCredentials: true,
                  headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                  },
                }
              );
              
              // Return combined data
              return {
                ...record,
                parts_used: detailedRecordResponse.data.parts_used || []
              };
            } catch (error) {
              console.error(`Error fetching parts for service ${record.record_id}:`, error);
              return record;
            } finally {
              setDetailedPartsLoading(prev => ({ ...prev, [record.record_id]: false }));
            }
          })
        );
        
        setServiceHistory(historyWithDetailedParts);
        setFilteredHistory(historyWithDetailedParts);

        // If we have a user_id, fetch owner details
        if (vehicleResponse.data.user_id) {
          const ownerResponse = await axios.get(
            `http://localhost:3000/api/users/${vehicleResponse.data.user_id}`,
            {
              withCredentials: true,
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
              },
            }
          );
          setOwner(ownerResponse.data);
        }
      } catch (error) {
        console.error("Error fetching vehicle details:", error);
        toast.error("Failed to fetch vehicle details");
        if (error.response?.status === 401 || error.response?.status === 403) {
          navigate("/login");
        }
      } finally {
        setLoading(false);
      }
    };

    fetchVehicleDetails();
  }, [vehicleNumber, navigate]);

  // Filter service history based on date range
  useEffect(() => {
    if (!dateRange || !serviceHistory.length) {
      setFilteredHistory(serviceHistory);
      return;
    }

    const [startDate, endDate] = dateRange;
    const filtered = serviceHistory.filter(record => {
      const recordDate = dayjs(record.date_);
      return recordDate.isAfter(startDate) && recordDate.isBefore(endDate.add(1, 'day'));
    });

    setFilteredHistory(filtered);
  }, [dateRange, serviceHistory]);

  const handleDateRangeChange = (dates) => {
    setDateRange(dates);
  };

  // Generate PDF report
  const generatePDF = () => {
    try {
      if (!vehicle) {
        toast.warn("Vehicle details not available");
        return;
      }

      if (filteredHistory.length === 0) {
        toast.warn("No service records available for the selected period");
        return;
      }

      setExportLoading(true);

      // Create new PDF document
      const doc = new jsPDF("portrait", "mm", "a4");
      const pageWidth = doc.internal.pageSize.width;

      // Add report title
      doc.setFontSize(20);
      doc.text("Vehicle Service History Report", 105, 15, { align: "center" });

      // Add vehicle info
      doc.setFontSize(16);
      doc.text(`${vehicle.make} ${vehicle.model} (${vehicle.vehicle_number})`, 105, 25, { align: "center" });

      // Add date range if selected
      if (dateRange) {
        doc.setFontSize(12);
        doc.text(`Service records from ${dateRange[0].format('YYYY-MM-DD')} to ${dateRange[1].format('YYYY-MM-DD')}`, 105, 32, { align: "center" });
      }

      // Add generation info
      doc.setFontSize(10);
      doc.text(`Generated on: ${dayjs().format("YYYY-MM-DD HH:mm")}`, 105, 38, { align: "center" });

      let yPosition = 45;

      // Add vehicle details
      doc.setFontSize(14);
      doc.setTextColor(44, 62, 80);
      doc.text("Vehicle Details", 15, yPosition);
      yPosition += 8;

      // Create vehicle details table
      const vehicleDetails = [
        ["Make", vehicle.make, "Model", vehicle.model],
        ["Year", vehicle.year_of_manuf || "N/A", "Color", vehicle.vehicle_colour || "N/A"],
        ["Engine", vehicle.engine_details || "N/A", "Transmission", vehicle.transmission_details || "N/A"],
        ["Owner", vehicle.owner_ || "N/A", "Condition", vehicle.condition_ || "N/A"],
      ];

      doc.autoTable({
        startY: yPosition,
        body: vehicleDetails,
        theme: "grid",
        styles: { fontSize: 10 },
        columnStyles: { 0: { fontStyle: "bold" }, 2: { fontStyle: "bold" } },
        margin: { left: 15, right: 15 },
        tableWidth: pageWidth - 30,
      });

      yPosition = doc.lastAutoTable.finalY + 15;

      // Add service history header
      doc.setFontSize(14);
      doc.setTextColor(44, 62, 80);
      doc.text("Service History", 15, yPosition);
      yPosition += 8;

      // Prepare service history data
      const serviceHistoryHeaders = ["Date", "Service Description", "Next Service", "Mileage"];
      const serviceHistoryData = filteredHistory.map((service) => [
        dayjs(service.date_).format("YYYY-MM-DD"),
        service.service_description,
        service.next_service_date ? dayjs(service.next_service_date).format("YYYY-MM-DD") : "N/A",
        service.millage ? `${service.millage} km` : "N/A",
      ]);

      // Add service history table
      doc.autoTable({
        startY: yPosition,
        head: [serviceHistoryHeaders],
        body: serviceHistoryData,
        theme: "striped",
        styles: { fontSize: 11 },
        headStyles: { fontSize: 12, fontStyle: "bold", fillColor: [70, 130, 180] },
        margin: { left: 15, right: 15 },
        tableWidth: pageWidth - 30,
      });

      yPosition = doc.lastAutoTable.finalY + 15;

      // Add parts used details for each service if available
      for (let i = 0; i < filteredHistory.length; i++) {
        const service = filteredHistory[i];

        if (service.parts_used && (Array.isArray(service.parts_used) ? service.parts_used.length > 0 : service.parts_used.length > 0)) {
          // Check if need new page
          if (yPosition > 250) {
            doc.addPage();
            yPosition = 15;
          }

          doc.setFontSize(12);
          doc.setTextColor(44, 62, 80);
          doc.text(`Parts Used in Service on ${dayjs(service.date_).format("YYYY-MM-DD")}`, 15, yPosition);
          yPosition += 6;

          if (Array.isArray(service.parts_used)) {
            // For structured parts data
            const partsHeaders = ["Part", "Brand", "Category", "Quantity"];
            const partsData = service.parts_used.map(part => [
              part.item_name || "Unknown Part",
              part.brand || "N/A",
              part.category || "N/A",
              part.quantity_used || "1"
            ]);
            
            // Add parts table
            doc.autoTable({
              startY: yPosition,
              head: [partsHeaders],
              body: partsData,
              theme: "grid",
              styles: { fontSize: 11 },
              headStyles: { fontSize: 11, fontStyle: "bold", fillColor: [100, 130, 180] },
              margin: { left: 20, right: 15 },
              tableWidth: pageWidth - 35,
            });
          } else {
            // For simple string parts
            const partsUsed = service.parts_used.split(',').map(part => part.trim());
            
            if (partsUsed.length > 0) {
              const partsData = partsUsed.map(part => [part]);
              
              // Add parts table
              doc.autoTable({
                startY: yPosition,
                body: partsData,
                theme: "plain",
                styles: { fontSize: 9 },
                margin: { left: 20, right: 15 },
                tableWidth: pageWidth - 35,
              });
            }
          }
          
          yPosition = doc.lastAutoTable.finalY + 10;
        }
      }

      // Save the PDF
      const fileName = `${vehicle.vehicle_number}_Service_History_${dayjs().format("YYYYMMDD")}.pdf`;
      doc.save(fileName);

      toast.success(`PDF report generated: ${fileName}`);
    } catch (error) {
      console.error("Error generating PDF report:", error);
      toast.error("Failed to generate PDF report");
    } finally {
      setExportLoading(false);
    }
  };

  const handleBack = () => {
    navigate("/admin/vehicles");
  };

  if (loading) {
    return (
      <div className="loading-container">
        <Spin size="large" tip="Loading vehicle details..." />
      </div>
    );
  }

  if (!vehicle) {
    return (
      <div style={lightThemeStyles.page}>
        <Empty 
          description="Vehicle not found" 
          image={Empty.PRESENTED_IMAGE_SIMPLE} 
        />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      style={lightThemeStyles.page}
    >
      <div className="max-w-9xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="vehicle-header">
          <Title level={1} className="vehicle-number">
            {vehicle.vehicle_number}
          </Title>
        </div>

        <Row gutter={[24, 24]} className="content-row">
          <Col xs={24} lg={35}>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <Tabs 
                defaultActiveKey="details" 
                type="card"
                className="vehicle-tabs"
              >
                <TabPane 
                  tab={<span className="tab-title"><InfoCircleOutlined /> Vehicle Details</span>} 
                  key="details"
                >
                  <Card className="details-card shadow-md" bordered={false}>
                    <div className="card-content">
                      {/* Vehicle Make, Model & Year as separate items */}
                      <div className="info-grid">
                        {/* Make */}
                        <div className="info-box">
                          <div className="info-label">Make</div>
                          <div className="info-value">{vehicle.make}</div>
                        </div>

                        {/* Model */}
                        <div className="info-box">
                          <div className="info-label">Model</div>
                          <div className="info-value">{vehicle.model}</div>
                        </div>

                        {/* Year */}
                        <div className="info-box">
                          <div className="info-label">Year</div>
                          <div className="info-value">{vehicle.year_of_manuf}</div>
                        </div>
                      </div>

                      {/* Vehicle details in info cards */}
                      <div className="info-grid">
                        {/* Engine details */}
                        <div className="info-box wide">
                          <div className="info-label">Engine Details</div>
                          <div className="info-value">{vehicle.engine_details || "Not specified"}</div>
                        </div>

                        {/* Transmission details */}
                        <div className="info-box wide">
                          <div className="info-label">Transmission Details</div>
                          <div className="info-value">{vehicle.transmission_details || "Not specified"}</div>
                        </div>
                      </div>

                      {/* Basic specs in a row */}
                      <div className="info-grid">
                        {/* Color */}
                        <div className="info-box">
                          <div className="info-label">Color</div>
                          <div className="info-value">{vehicle.vehicle_colour || "Not specified"}</div>
                        </div>

                        {/* Condition */}
                        <div className="info-box">
                          <div className="info-label">Condition</div>
                          <div className="info-value">{vehicle.condition_ || "Not specified"}</div>
                        </div>
                      </div>

                      {/* Features */}
                      <div className="info-box wide">
                        <div className="info-label">Features</div>
                        <div className="info-value">
                          {vehicle.vehicle_features
                            ? vehicle.vehicle_features.split(",").map((feature, index) => (
                                <div key={index} className="feature-item">
                                  {feature.trim()}
                                </div>
                              ))
                            : "None specified"}
                        </div>
                      </div>
                    </div>
                  </Card>
                </TabPane>
                <TabPane 
                  tab={<span className="tab-title"><UserOutlined /> Owner Information</span>} 
                  key="owner"
                >
                  <Card className="details-card shadow-md" bordered={false}>
                    {owner ? (
                      <div className="owner-info-table">
                        <div className="owner-info-row">
                          <div className="owner-info-label">Name</div>
                          <div className="owner-info-value">{owner.first_name} {owner.last_name}</div>
                          <div className="owner-info-label">Email</div>
                          <div className="owner-info-value">{owner.email}</div>
                        </div>
                        
                        <div className="owner-info-row">
                          <div className="owner-info-label">Phone</div>
                          <div className="owner-info-value">{owner.phone_number || "N/A"}</div>
                          <div className="owner-info-label">Role</div>
                          <div className="owner-info-value">{owner.role || "customer"}</div>
                        </div>
                        
                        <div className="owner-info-row">
                          <div className="owner-info-label">Owner Details</div>
                          <div className="owner-info-value owner-details-full">{vehicle.owner_ || "Jane Smith"}</div>
                        </div>
                      </div>
                    ) : (
                      <Empty 
                        description="Owner information not available" 
                        image={Empty.PRESENTED_IMAGE_SIMPLE} 
                      />
                    )}
                  </Card>
                </TabPane>
                <TabPane 
                  tab={<span className="tab-title"><SettingOutlined /> Service History</span>} 
                  key="history"
                >
                  <Card className="details-card shadow-md" bordered={false}>
                    <div className="service-history-controls">
                      <div className="date-range-picker">
                        <Text className="filter-label">Filter by date range:</Text>
                        <RangePicker onChange={handleDateRangeChange} className="date-picker" />
                      </div>
                      <Button 
                        type="primary"
                        icon={<FilePdfOutlined />}
                        onClick={generatePDF}
                        loading={exportLoading}
                        disabled={!filteredHistory.length}
                        className="generate-pdf-btn"
                      >
                        Generate Service Report
                      </Button>
                    </div>
                    
                    {dateRange && filteredHistory.length === 0 && (
                      <Alert 
                        message="No service records found in selected date range" 
                        type="info" 
                        showIcon
                        className="date-filter-alert"
                      />
                    )}
                    
                    {filteredHistory.length > 0 ? (
                      <div className="service-history-container">
                        <Table
                          dataSource={filteredHistory}
                          rowKey="record_id"
                          pagination={false}
                          className="service-history-table"
                          expandable={{
                            expandedRowRender: (record) => (
                              <div className="expanded-service-details">
                                <div className="detailed-description">
                                  <Text className="detail-title">Service Description:</Text>
                                  <Text className="detail-content">{record.service_description}</Text>
                                </div>
                                
                                {record.parts_used && Array.isArray(record.parts_used) && record.parts_used.length > 0 ? (
                                  <div className="parts-used-section">
                                    <Text className="detail-title">Parts Used:</Text>
                                    <Table
                                      dataSource={record.parts_used}
                                      rowKey={(part) => `${part.item_id}-${part.stock_id}`}
                                      pagination={false}
                                      size="small"
                                      className="parts-table"
                                      columns={[
                                        {
                                          title: 'Part',
                                          dataIndex: 'item_name',
                                          key: 'part',
                                        },
                                        {
                                          title: 'Brand',
                                          dataIndex: 'brand',
                                          key: 'brand',
                                        },
                                        {
                                          title: 'Category',
                                          dataIndex: 'category',
                                          key: 'category',
                                        },
                                        {
                                          title: 'Quantity',
                                          dataIndex: 'quantity_used',
                                          key: 'quantity',
                                        }
                                      ]}
                                    />
                                  </div>
                                ) : record.parts_used && typeof record.parts_used === 'string' ? (
                                  <div className="parts-used-section">
                                    <Text className="detail-title">Parts Used:</Text>
                                    <div className="parts-tag-container">
                                      {record.parts_used.split(",").map((part, index) => (
                                        <Tag 
                                          key={index} 
                                          color="blue" 
                                          className="service-tag"
                                        >
                                          {part.trim()}
                                        </Tag>
                                      ))}
                                    </div>
                                  </div>
                                ) : (
                                  <div className="parts-used-section">
                                    <Text className="detail-title">Parts Used:</Text>
                                    <Text className="detail-content">No parts used</Text>
                                  </div>
                                )}
                                
                                {record.technician_notes && (
                                  <div className="technician-notes">
                                    <Text className="detail-title">Technician Notes:</Text>
                                    <Text className="detail-content">{record.technician_notes}</Text>
                                  </div>
                                )}
                                
                                {record.additional_comments && (
                                  <div className="additional-comments">
                                    <Text className="detail-title">Additional Comments:</Text>
                                    <Text className="detail-content">{record.additional_comments}</Text>
                                  </div>
                                )}
                              </div>
                            )
                          }}
                          columns={[
                            {
                              title: 'Date',
                              dataIndex: 'date_',
                              key: 'date',
                              render: (date) => dayjs(date).format('YYYY-MM-DD'),
                              sorter: (a, b) => new Date(a.date_) - new Date(b.date_),
                              width: '12%',
                            },
                            {
                              title: 'Service Type',
                              dataIndex: 'service_description',
                              key: 'service_type',
                              render: (text) => text.length > 200 ? `${text.substring(0, 200)}...` : text,
                              width: '48%',
                            },
                            {
                              title: 'Mileage',
                              dataIndex: 'millage',
                              key: 'millage',
                              render: (text) => text ? `${text} km` : 'N/A',
                              width: '12%',
                              align: 'center',
                            },
                            {
                              title: 'Next Service',
                              dataIndex: 'next_service_date',
                              key: 'next_service',
                              render: (date) => date ? dayjs(date).format('YYYY-MM-DD') : 'N/A',
                              width: '13%',
                              align: 'center',
                            },
                            {
                              title: 'Details',
                              key: 'actions',
                              render: (_, record) => (
                                <Button type="link" className="view-details-btn">
                                  View Details
                                </Button>
                              ),
                              width: '15%',
                              align: 'center',
                            },
                          ]}
                        />
                      </div>
                    ) : (
                      <Empty 
                        description="No service records found" 
                        image={Empty.PRESENTED_IMAGE_SIMPLE} 
                      />
                    )}
                  </Card>
                </TabPane>
              </Tabs>
            </motion.div>
          </Col>
        </Row>
      </div>

      <style jsx global>{`
        .loading-container {
          display: flex;
          justify-content: center;
          align-items: center;
          min-height: 100vh;
          background-color: #ffffff;
        }
        
        .back-button {
          margin-bottom: 20px;
          border-radius: 8px;
        }
        
        .content-row {
          margin-top: 20px;
        }
        
        .vehicle-card {
          border-radius: 10px;
          margin-bottom: 20px;
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
        }
        
        .vehicle-title {
          margin: 0;
        }
        
        .vehicle-tabs .ant-tabs-nav {
          margin-bottom: 16px;
        }
        
        .vehicle-tabs .ant-tabs-tab {
          padding: 12px 20px;
        }
        
        .tab-title {
          font-size: 18px;
          font-weight: 500;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        
        .tab-title .anticon {
          font-size: 18px;
        }
        
        .vehicle-tabs .ant-tabs-tab.ant-tabs-tab-active .ant-tabs-tab-btn {
          color: #1890ff;
          font-weight: 600;
        }
        
        .details-card {
          border-radius: 10px;
          box-shadow: 0 2px 5px rgba(0, 0, 0, 0.15);
          width: 100%;
          {/* border: 2px solid #1890ff; */}
          overflow: hidden;
          padding: 0;
        }
        
        .details-card .ant-card-body {
          padding: 0;
        }
        
        .card-content {
          padding: 20px;
        }
        
        .info-grid {
          display: flex;
          flex-wrap: wrap;
          gap: 20px;
          margin-bottom: 25px;
        }
        
        .info-box {
          flex: 1 1 200px;
          background: #f9f9f9;
          padding: 15px;
          border-radius: 8px;
          border: 1px solid #e8e8e8;
        }
        
        .info-box.wide {
          flex: 1 1 100%;
        }
        
        .info-label {
          color: #1890ff;
          margin-bottom: 10px;
          font-size: 20px;
          font-weight: 600;
        }
        
        .info-value {
          font-size: 19px;
          color: #333;
        }
        
        .feature-item {
          margin-bottom: 8px;
          font-size: 17px;
        }
        
        .owner-info-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 17px;
          border: 1px solid #f0f0f0;
        }
        
        .owner-info-row {
          display: flex;
          border-bottom: 1px solid #f0f0f0;
        }
        
        .owner-info-row:last-child {
          border-bottom: none;
        }
        
        .owner-info-label {
          width: 15%;
          padding: 16px 20px;
          font-weight: 500;
          background-color: #f8f9fa;
          border-right: 1px solid #f0f0f0;
          color: #333;
        }
        
        .owner-info-value {
          width: 35%;
          padding: 16px 20px;
          border-right: 1px solid #f0f0f0;
          color: #333;
        }
        
        .owner-info-value:nth-child(4) {
          border-right: none;
        }
        
        .owner-details-full {
          width: 85%;
        }
        
        .service-record-card {
          margin: 0;
          border-radius: 8px;
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
        }
        
        .service-title {
          font-weight: bold;
          font-size: 16px;
        }
        
        .service-description {
          margin-bottom: 16px;
        }
        
        .service-label {
          color: #555;
        }
        
        .parts-section {
          margin-top: 16px;
        }
        
        .tag-container {
          margin-top: 8px;
        }
        
        .service-tag {
          font-size: 15px;
          padding: 6px 10px;
          margin: 2px;
        }
        
        .summary-card {
          border-radius: 10px;
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
        }
        
        .summary-box {
          background: #f9f9f9;
          border-radius: 8px;
          padding: 16px;
          margin-bottom: 16px;
          border: 1px solid #e8e8e8;
        }
        
        .summary-header {
          margin-bottom: 8px;
        }
        
        .summary-label {
          color: #555;
        }
        
        .summary-value {
          font-size: 18px;
          display: block;
          margin-bottom: 8px;
        }
        
        .summary-icon {
          font-size: 20px;
        }
        
        .car-icon {
          color: #1890ff;
        }
        
        .calendar-icon {
          color: #52c41a;
        }
        
        .key-icon {
          color: #faad14;
        }
        
        .file-icon {
          color: #722ed1;
        }
        
        /* New styles for service history */
        .service-history-controls {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin: 20px;
          flex-wrap: wrap;
          gap: 16px;
          padding: 15px;
          background-color: #f9f9f9;
          border-radius: 8px;
          border: 1px solid #e8e8e8;
        }
        
        .date-range-picker {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        
        .filter-label {
          font-size: 16px;
          font-weight: 500;
          color: #333;
        }
        
        .date-picker {
          width: 320px;
        }
        
        .generate-pdf-btn {
          height: 40px;
          font-size: 16px;
          font-weight: 500;
          padding: 0 20px;
        }
        
        .date-filter-alert {
          margin-bottom: 16px;
        }
        
        .service-history-container {
          margin-top: 5px;
          width: 100%;
        }
        
        .service-history-table {
          width: 100%;
          border-radius: 0;
        }
        
        .service-history-table .ant-table-container {
          width: 100%;
        }
        
        .service-history-table .ant-table {
          font-size: 18px;
        }

        .ant-table-row-expand-icon {
          transform: scale(1.8); /* increase size */
          margin-right: 8px; /* optional: adjust spacing */
        }
        
        .service-history-table .ant-table-thead > tr > th {
          background-color: #f0f5ff;
          {/* border-bottom: 1px solid #1890ff; */}
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
        
        .view-details-btn {
          color: #1890ff;
          font-weight: 500;
          font-size: 17px;
        }
        
        .expanded-service-details {
          padding: 20px;
          background-color: #f8f9ff;
          border-radius: 0;
          border-top: 1px solid #e8e8e8;
          border-bottom: 1px solid #e8e8e8;
        }
        
        .detailed-description, 
        .parts-used-section,
        .technician-notes,
        .additional-comments {
          margin-bottom: 20px;
        }
        
        .detail-title {
          font-weight: 600;
          margin-right: 8px;
          font-size: 18px;
          display: block;
          margin-bottom: 8px;
          color: #1890ff;
        }
        
        .detail-content {
          font-size: 16px;
          line-height: 1.6;
          color: #333;
        }
        
        .parts-tag-container {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          margin-top: 6px;
        }
        
        .parts-table {
          margin-top: 15px;
          border-radius: 8px;
          overflow: hidden;
          border: 1px solid #e8e8e8;
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
        
        .parts-used-section {
          margin-top: 16px;
          margin-bottom: 16px;
        }
        
        /* Responsive adjustments */
        @media (max-width: 768px) {
          .service-history-table, 
          .parts-table {
            width: 100%;
            overflow-x: auto;
          }
          
          .service-history-table .ant-table-thead > tr > th,
          .service-history-table .ant-table-tbody > tr > td {
            white-space: nowrap;
            font-size: 14px;
            padding: 8px 12px;
          }
          
          .parts-table .ant-table-thead > tr > th,
          .parts-table .ant-table-tbody > tr > td {
            white-space: nowrap;
            font-size: 14px;
            padding: 8px 12px;
          }
          
          .service-history-controls {
            flex-direction: column;
            align-items: flex-start;
          }
          
          .date-range-picker {
            flex-direction: column;
            align-items: flex-start;
            width: 100%;
          }
          
          .date-picker {
            width: 100%;
          }
          
          .generate-pdf-btn {
            width: 100%;
          }
        }
        
        .max-w-8xl {
          max-width: 1440px;
          margin: 0 auto;
          width: 100%;
        }
        
        /* New styles for vehicle header */
        .vehicle-header {
          margin: 20px 0 30px;
        }
        
        .vehicle-number {
          font-size: 42px;
          font-weight: 700;
          color: #1890ff;
          margin: 10px 0 20px;
        }
      `}</style>
    </motion.div>
  );
};

export default VehicleDetail; 