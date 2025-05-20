import React, { useState, useEffect, useRef } from "react";
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
  Divider,
  Tag,
  Spin,
  Descriptions,
  Badge,
  Empty,
} from "antd";
import {
  CarOutlined,
  HistoryOutlined,
  FileTextOutlined,
  SearchOutlined,
  FilePdfOutlined,
} from "@ant-design/icons";
import { jsPDF } from "jspdf";
import "jspdf-autotable";
import dayjs from "dayjs";

const { Title, Text } = Typography;

const VehicleProfileReport = () => {
  const navigate = useNavigate();
  const [vehicles, setVehicles] = useState([]);
  const [filteredVehicles, setFilteredVehicles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [exportLoading, setExportLoading] = useState(false);

  // Authentication check on component mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const user = JSON.parse(localStorage.getItem("user"));
        if (!user || user.role !== "admin") {
          navigate("/login");
          return;
        }
        fetchDetailedVehicles();
      } catch (error) {
        console.error("Auth check error:", error);
        navigate("/login");
      }
    };

    checkAuth();
  }, [navigate]);

  // Fetch detailed vehicles with service history
  const fetchDetailedVehicles = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const response = await axios.get(
        "http://localhost:3000/api/vehicle-profiles/detailed",
        {
          withCredentials: true,
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );

      // Sort vehicles by make and model
      const sortedVehicles = response.data.sort((a, b) => {
        const nameA = `${a.make} ${a.model}`.toLowerCase();
        const nameB = `${b.make} ${b.model}`.toLowerCase();
        return nameA.localeCompare(nameB);
      });

      setVehicles(sortedVehicles);
      setFilteredVehicles(sortedVehicles);
    } catch (error) {
      console.error("Error fetching detailed vehicles:", error);
      toast.error("Failed to fetch vehicle details");
      if (error.response?.status === 401 || error.response?.status === 403) {
        navigate("/login");
      }
    } finally {
      setLoading(false);
    }
  };

  // Filter vehicles based on search term
  const handleSearch = () => {
    if (!searchTerm.trim()) {
      setFilteredVehicles(vehicles);
      return;
    }

    const filtered = vehicles.filter((vehicle) => {
      const vehicleName = `${vehicle.make} ${vehicle.model}`.toLowerCase();
      return vehicleName.includes(searchTerm.toLowerCase());
    });

    setFilteredVehicles(filtered);

    if (filtered.length === 0) {
      toast.info("No vehicles found matching your search");
    } else {
      toast.success(
        `Found ${filtered.length} vehicles matching "${searchTerm}"`
      );
    }
  };

  // Generate PDF report
  const generatePDFReport = async () => {
    try {
      if (filteredVehicles.length === 0) {
        toast.warn("No vehicles to include in the report");
        return;
      }

      setExportLoading(true);

      // Create new PDF document
      const doc = new jsPDF("portrait", "mm", "a4");

      // Add report title
      doc.setFontSize(22); // Larger title font
      doc.text("Vehicle Profile Report", 105, 15, { align: "center" });

      // Add generation date
      doc.setFontSize(12); // Larger date font
      doc.text(`Generated on: ${dayjs().format("YYYY-MM-DD HH:mm")}`, 105, 25, {
        align: "center",
      });

      if (searchTerm) {
        doc.text(`Search: ${searchTerm}`, 105, 32, { align: "center" });
      }

      let yPosition = 40;
      const pageWidth = doc.internal.pageSize.width;

      // Loop through filtered vehicles
      for (let i = 0; i < filteredVehicles.length; i++) {
        const vehicle = filteredVehicles[i];

        // Check if enough space is available on current page
        if (yPosition > 250) {
          doc.addPage();
          yPosition = 15;
        }

        // Add vehicle header
        doc.setFontSize(16); // Larger vehicle header font
        doc.setTextColor(44, 62, 80);
        doc.text(
          `${vehicle.make} ${vehicle.model} (${vehicle.vehicle_number})`,
          15,
          yPosition
        );
        yPosition += 8;

        // Add vehicle details
        doc.setFontSize(11); // Larger details font
        doc.setTextColor(0, 0, 0);

        // Create vehicle details table
        const vehicleDetails = [
          ["Make", vehicle.make, "Model", vehicle.model],
          [
            "Year",
            vehicle.year_of_manuf || "N/A",
            "Color",
            vehicle.vehicle_colour || "N/A",
          ],
          [
            "Engine",
            vehicle.engine_details || "N/A",
            "Transmission",
            vehicle.transmission_details || "N/A",
          ],
          [
            "Owner",
            vehicle.owner_ || "N/A",
            "Condition",
            vehicle.condition_ || "N/A",
          ],
        ];

        doc.autoTable({
          startY: yPosition,
          body: vehicleDetails,
          theme: "grid",
          styles: { fontSize: 10 }, // Larger table font
          columnStyles: { 0: { fontStyle: "bold" }, 2: { fontStyle: "bold" } },
          margin: { left: 15, right: 15 },
          tableWidth: pageWidth - 30,
        });

        yPosition = doc.lastAutoTable.finalY + 10;

        // Add service history header
        doc.setFontSize(14); // Larger section header font
        doc.text("Service History", 15, yPosition);
        yPosition += 6;

        // Check if vehicle has service history
        if (vehicle.service_history && vehicle.service_history.length > 0) {
          // Prepare service history data
          const serviceHistoryHeaders = [
            "Date",
            "Service Description",
            "Next Service",
            "Mileage",
            "Invoice ID",
          ];
          const serviceHistoryData = vehicle.service_history.map((service) => [
            dayjs(service.date_).format("YYYY-MM-DD"),
            service.service_description,
            service.next_service_date
              ? dayjs(service.next_service_date).format("YYYY-MM-DD")
              : "N/A",
            service.millage ? service.millage : "N/A",
            service.invoice_id || "No Invoice",
          ]);

          // Add service history table
          doc.autoTable({
            startY: yPosition,
            head: [serviceHistoryHeaders],
            body: serviceHistoryData,
            theme: "striped",
            styles: { fontSize: 9 }, // Larger table content font
            headStyles: { fontSize: 10, fontStyle: "bold" }, // Larger header font
            margin: { left: 15, right: 15 },
            tableWidth: pageWidth - 30,
          });

          yPosition = doc.lastAutoTable.finalY + 5;

          // Add parts used details for each service
          for (let j = 0; j < vehicle.service_history.length; j++) {
            const service = vehicle.service_history[j];

            if (service.parts_used && service.parts_used.length > 0) {
              // Check if need new page
              if (yPosition > 250) {
                doc.addPage();
                yPosition = 15;
              }

              doc.setFontSize(11); // Larger parts section font
              doc.setTextColor(76, 175, 80);
              doc.text(
                `Parts Used in Service (${dayjs(service.date_).format(
                  "YYYY-MM-DD"
                )})`,
                15,
                yPosition
              );
              yPosition += 5;

              // Prepare parts data
              const partsHeaders = [
                "Part Name",
                "Brand",
                "Category",
                "Quantity",
                "Price",
                "Total",
              ];
              const partsData = service.parts_used.map((part) => [
                part.item_name,
                part.brand || "N/A",
                part.category || "N/A",
                part.quantity_used,
                `$${parseFloat(part.selling_price).toFixed(2)}`,
                `$${(
                  parseFloat(part.selling_price) * part.quantity_used
                ).toFixed(2)}`,
              ]);

              // Add parts table
              doc.autoTable({
                startY: yPosition,
                head: [partsHeaders],
                body: partsData,
                theme: "grid",
                styles: { fontSize: 8 }, // Slightly larger parts table font
                headStyles: { fontSize: 9, fontStyle: "bold" },
                margin: { left: 20, right: 15 },
                tableWidth: pageWidth - 35,
              });

              yPosition = doc.lastAutoTable.finalY + 10;
            }
          }
        } else {
          // No service history message
          doc.setFontSize(10);
          doc.setTextColor(150, 150, 150);
          doc.text("No service history for this vehicle", 15, yPosition);
          yPosition += 15;
        }

        // Add separator between vehicles
        if (i < filteredVehicles.length - 1) {
          doc.setDrawColor(200, 200, 200);
          doc.line(15, yPosition - 5, pageWidth - 15, yPosition - 5);
          yPosition += 10;
        }

        // Add new page if needed for next vehicle
        if (yPosition > 240 && i < filteredVehicles.length - 1) {
          doc.addPage();
          yPosition = 15;
        }
      }

      // Save the PDF
      const fileName = searchTerm
        ? `Vehicle_Report_${searchTerm.replace(/\s+/g, "_")}_${dayjs().format(
            "YYYYMMDD"
          )}.pdf`
        : `Vehicle_Report_${dayjs().format("YYYYMMDD")}.pdf`;

      doc.save(fileName);

      toast.success(`PDF report generated: ${fileName}`);
    } catch (error) {
      console.error("Error generating PDF report:", error);
      toast.error("Failed to generate PDF report");
    } finally {
      setExportLoading(false);
    }
  };

  // Render individual vehicle card with service history
  const renderVehicleCard = (vehicle) => {
    const serviceHistory = vehicle.service_history || [];

    return (
      <Card
        className="mb-4 content-card"
        title={
          <Space size="middle">
            <Text strong>
              {vehicle.vehicle_number}
            </Text>
            <Tag color="blue">
              {vehicle.make} {vehicle.model} ({vehicle.year_of_manuf})
            </Tag>
          </Space>
        }
        extra={
          <Space>
            <Badge 
              count={serviceHistory.length} 
              overflowCount={99}
            >
              <HistoryOutlined />
              <Text style={{ marginLeft: "8px" }}>
                Services
              </Text>
            </Badge>
          </Space>
        }
      >
        <div style={{ marginBottom: "20px" }}>
          <Text className="section-title">
            Vehicle Details
          </Text>
          
          <div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
            {/* Left column */}
            <div style={{ flex: "1", minWidth: "300px" }}>
              <Table
                pagination={false}
                showHeader={false}
                size="middle"
                dataSource={[
                  { key: "Make", value: vehicle.make },
                  { key: "Year", value: vehicle.year_of_manuf },
                  { key: "Engine", value: vehicle.engine_details },
                  { key: "Owner", value: vehicle.owner_ }
                ]}
                columns={[
                  {
                    title: "Key",
                    dataIndex: "key",
                    key: "key",
                    width: "40%",
                    render: (text) => (
                      <div className="table-key">
                        {text}
                      </div>
                    )
                  },
                  {
                    title: "Value",
                    dataIndex: "value",
                    key: "value", 
                    render: (text, record) => (
                      <div className="table-value">
                        {text}
                      </div>
                    )
                  }
                ]}
              />
            </div>
            
            {/* Right column */}
            <div style={{ flex: "1", minWidth: "300px" }}>
              <Table
                pagination={false}
                showHeader={false}
                size="middle"
                dataSource={[
                  { key: "Model", value: vehicle.model },
                  { key: "Color", value: vehicle.vehicle_colour },
                  { key: "Transmission", value: vehicle.transmission_details },
                  { 
                    key: "Condition", 
                    value: <Badge
                      status={
                        vehicle.condition_ === "Excellent"
                          ? "success"
                          : vehicle.condition_ === "Good"
                          ? "processing"
                          : vehicle.condition_ === "Fair"
                          ? "warning"
                          : "default"
                      }
                      text={<Text>{vehicle.condition_}</Text>}
                    />
                  }
                ]}
                columns={[
                  {
                    title: "Key",
                    dataIndex: "key",
                    key: "key",
                    width: "40%",
                    render: (text) => (
                      <div className="table-key">
                        {text}
                      </div>
                    )
                  },
                  {
                    title: "Value",
                    dataIndex: "value",
                    key: "value", 
                    render: (text, record) => (
                      <div className="table-value">
                        {text}
                      </div>
                    )
                  }
                ]}
              />
            </div>
          </div>
        </div>

        <Divider orientation="left">
          <Text className="section-title">
            <HistoryOutlined style={{ marginRight: "8px" }} /> Service History
          </Text>
        </Divider>

        {serviceHistory.length > 0 ? (
          <Table
            dataSource={serviceHistory}
            rowKey="record_id"
            pagination={false}
            size="middle"
            style={{ marginTop: "10px" }}
            className="service-history-table"
            expandable={{
              expandedRowRender: (record) => (
                <div className="expanded-row">
                  <Text strong className="parts-title">
                    Parts Used:
                  </Text>
                  {record.parts_used && record.parts_used.length > 0 ? (
                    <Table
                      dataSource={record.parts_used}
                      rowKey={(r) => `${r.item_id}-${r.stock_id}`}
                      pagination={false}
                      size="middle"
                      className="parts-table"
                      columns={[
                        {
                          title: "Part Name",
                          key: "item_name",
                          dataIndex: "item_name",
                        },
                        {
                          title: "Brand",
                          key: "brand",
                          dataIndex: "brand",
                        },
                        {
                          title: "Category",
                          key: "category",
                          dataIndex: "category",
                        },
                        {
                          title: "Quantity",
                          key: "quantity_used",
                          dataIndex: "quantity_used",
                        },
                        {
                          title: "Price",
                          key: "selling_price",
                          dataIndex: "selling_price",
                          render: (price) => (
                            <Text className="price-text">
                              ${parseFloat(price).toFixed(2)}
                            </Text>
                          ),
                        },
                        {
                          title: "Total",
                          key: "total",
                          render: (_, record) => (
                            <Text className="total-price">
                              ${(
                                parseFloat(record.selling_price) *
                                record.quantity_used
                              ).toFixed(2)}
                            </Text>
                          ),
                        },
                      ]}
                    />
                  ) : (
                    <Empty 
                      description={<Text className="empty-text">No parts used in this service</Text>}
                      image={Empty.PRESENTED_IMAGE_SIMPLE} 
                    />
                  )}
                </div>
              ),
            }}
            columns={[
              {
                title: "Service Date",
                dataIndex: "date_",
                key: "date_",
                render: (date) => (
                  dayjs(date).format("YYYY-MM-DD")
                ),
              },
              {
                title: "Service Description",
                dataIndex: "service_description",
                key: "service_description",
              },
              {
                title: "Next Service",
                dataIndex: "next_service_date",
                key: "next_service_date",
                render: (date) => (
                  date ? dayjs(date).format("YYYY-MM-DD") : "N/A"
                ),
              },
              {
                title: "Mileage",
                dataIndex: "millage",
                key: "millage",
              },
              {
                title: "Invoice",
                dataIndex: "invoice_id",
                key: "invoice_id",
                render: (id) =>
                  id ? (
                    <Tag color="green" className="invoice-tag">
                      {id}
                    </Tag>
                  ) : (
                    <Tag color="red" className="invoice-tag">
                      No Invoice
                    </Tag>
                  ),
              },
            ]}
          />
        ) : (
          <Empty 
            description={<Text className="empty-text">No service history for this vehicle</Text>}
            image={Empty.PRESENTED_IMAGE_SIMPLE} 
          />
        )}
      </Card>
    );
  };

  return (
    <div className="page">
      <div className="mb-4">
        <Title level={2} className="page-title">
         Vehicle Profile Report
        </Title>
      </div>
      <Card
        className="mb-4 content-card"
        bodyStyle={{ padding: "20px" }}
      >
        <Space size="large">
          <Input
            placeholder="Enter vehicle make or model (e.g., Honda Civic)"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onPressEnter={handleSearch}
            prefix={<SearchOutlined />}
            allowClear
            className="search-input"
          />
          <Button 
            type="primary" 
            onClick={handleSearch} 
            loading={loading}
            size="large"
            className="action-button"
          >
            Search
          </Button>
          <Button
            type="primary"
            icon={<FilePdfOutlined />}
            onClick={generatePDFReport}
            loading={exportLoading}
            disabled={filteredVehicles.length === 0}
            size="large"
            className="action-button print-button"
          >
            Generate PDF Report
          </Button>
        </Space>
      </Card>

      {loading ? (
        <div className="loading-container">
          <Spin size="large" />
          <p>Loading vehicle data...</p>
        </div>
      ) : (
        <div>
          {filteredVehicles.length > 0 ? (
            <div>
              {filteredVehicles.map((vehicle) => renderVehicleCard(vehicle))}
            </div>
          ) : (
            <Empty 
              description={<Text className="empty-text">No vehicles found</Text>} 
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              style={{ marginTop: "80px" }}
            />
          )}
        </div>
      )}

      {/* Add global styles */}
      <style jsx global>{`
        .page {
          background-color: #ffffff;
          min-height: 100vh;
          padding: 20px;
        }
        
        .page-title {
          font-size: 32px;
          margin-bottom: 15px;
          color: #333;
        }
        
        .subtitle {
          font-size: 18px;
          color: #666;
        }
        
        .content-card {
          border-radius: 10px;
          margin-bottom: 20px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
        }
        
        .search-input {
          width: 350px;
          height: 40px;
          font-size: 16px;
        }
        
        .action-button {
          height: 40px;
          font-size: 16px;
          padding: 0 20px;
        }
        
        .print-button {
          background: #1d39c4;
        }
        
        .loading-container {
          text-align: center;
          margin: 80px 0;
        }
        
        .loading-container p {
          font-size: 18px;
          margin-top: 15px;
        }
        
        .section-title {
          color: #1890ff;
          font-size: 20px;
          font-weight: bold;
          display: block;
          margin-bottom: 15px;
        }
        
        .table-key {
          background-color: #f5f5f5;
          padding: 10px 16px;
          font-size: 19px;
          font-weight: 500;
          color: #333;
        }
        
        .table-value {
          padding: 10px 16px;
          font-size: 19px;
          color: #333;
        }
        
        .expanded-row {
          background-color: #f9f9f9;
          padding: 15px;
        }
        
        .parts-title {
          font-size: 17px;
          color: #1890ff;
          display: block;
          margin-bottom: 15px;
        }
        
        .invoice-tag {
          font-size: 14px;
          padding: 4px 8px;
        }
        
        .price-text {
          color: #52c41a;
          font-size: 19px;
        }
        
        .total-price {
          color: #52c41a;
          font-size: 19px;
          font-weight: bold;
        }
        
        .empty-text {
          font-size: 16px;
          color: #999;
        }
        
        .service-history-table .ant-table-thead > tr > th {
          font-size: 20px;
          padding: 12px 16px;
          background-color: #f5f5f5;
        }
        
        .service-history-table .ant-table-tbody > tr > td {
          font-size: 19px;
          padding: 12px 16px;
        }
        
        .parts-table .ant-table-thead > tr > th {
          font-size: 20px;
          padding: 12px 16px;
        }
        
        .parts-table .ant-table-tbody > tr > td {
          font-size: 19px;
          padding: 12px 16px;
        }
      `}</style>
    </div>
  );
};

export default VehicleProfileReport;
