import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
    Table,
    Card,
    Typography,
    Tag,
    Descriptions,
    Empty,
    Spin,
    Alert,
    Button,
    Breadcrumb,
    Divider,
    Row,
    Col,
    Badge,
    Modal,
    List
} from 'antd';
import {
    CarOutlined,
    HistoryOutlined,
    RollbackOutlined,
    ToolOutlined,
    ClockCircleOutlined,
    FileTextOutlined,
    SettingOutlined,
    FilePdfOutlined
} from '@ant-design/icons';
import { motion } from 'framer-motion';
import dayjs from 'dayjs';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

const { Title, Text } = Typography;

const CustomerServiceRecords = () => {
    const navigate = useNavigate();
    const { vehicleNumber } = useParams();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [serviceRecords, setServiceRecords] = useState([]);
    const [vehicleDetails, setVehicleDetails] = useState(null);
    const [detailModalVisible, setDetailModalVisible] = useState(false);
    const [selectedRecord, setSelectedRecord] = useState(null);
    const [recordDetails, setRecordDetails] = useState(null);
    const [loadingDetails, setLoadingDetails] = useState(false);
    const [exportLoading, setExportLoading] = useState(false);

    // Animation variants from Services.jsx
    const fadeIn = {
        hidden: { opacity: 0, y: 20 },
        visible: { 
            opacity: 1, 
            y: 0,
            transition: { duration: 0.6 }
        }
    };

    useEffect(() => {
        const checkAuth = async () => {
            try {
                const user = JSON.parse(localStorage.getItem('user'));
                if (!user) {
                    navigate('/login');
                    return;
                }
                
                // Fetch data once authentication is confirmed
                fetchVehicleDetails();
                fetchServiceRecords();
            } catch (error) {
                console.error('Auth check error:', error);
                localStorage.removeItem('user');
                navigate('/login');
            }
        };

        checkAuth();
    }, [vehicleNumber]);

    const fetchVehicleDetails = async () => {
        try {
            const response = await axios.get(`http://localhost:3000/api/vehicle-profiles/${vehicleNumber}`, {
                withCredentials: true,
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            setVehicleDetails(response.data);
        } catch (error) {
            console.error('Error fetching vehicle details:', error);
            if (error.response?.status === 401 || error.response?.status === 403) {
                localStorage.removeItem('user');
                navigate('/login');
            } else {
                setError(`Failed to fetch vehicle details: ${error.response?.data?.message || error.message}`);
            }
        }
    };

    const fetchServiceRecords = async () => {
        try {
            setLoading(true);
            setError('');
            
            const response = await axios.get(`http://localhost:3000/api/service-records/vehicle/${vehicleNumber}`, {
                withCredentials: true,
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            setServiceRecords(response.data);
        } catch (error) {
            console.error('Error fetching service records:', error);
            if (error.response?.status === 401 || error.response?.status === 403) {
                localStorage.removeItem('user');
                navigate('/login');
            } else {
                setError(`Failed to fetch service records: ${error.response?.data?.message || error.message}`);
            }
        } finally {
            setLoading(false);
        }
    };

    // New function to fetch detailed service record info
    const fetchServiceRecordDetails = async (recordId) => {
        try {
            setLoadingDetails(true);
            
            const response = await axios.get(`http://localhost:3000/api/service-records/${recordId}`, {
                withCredentials: true,
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            setRecordDetails(response.data);
        } catch (error) {
            console.error('Error fetching service record details:', error);
            if (error.response?.status === 401 || error.response?.status === 403) {
                localStorage.removeItem('user');
                navigate('/login');
            } else {
                setError(`Failed to fetch service record details: ${error.response?.data?.message || error.message}`);
            }
        } finally {
            setLoadingDetails(false);
        }
    };

    const handleViewDetails = (record) => {
        setSelectedRecord(record);
        fetchServiceRecordDetails(record.record_id);
        setDetailModalVisible(true);
    };

    const columns = [
        {
            title: 'Service Date',
            dataIndex: 'date_',
            key: 'date_',
            render: (text) => (
                <span className="table-text" style={{ fontSize: '20px' }}>
                    {dayjs(text).format('YYYY-MM-DD')}
                </span>
            ),
            sorter: (a, b) => new Date(b.date_) - new Date(a.date_),
            defaultSortOrder: 'descend',
        },
        {
            title: 'Service Description',
            dataIndex: 'service_description',
            key: 'service_description',
            render: (text) => (
                <div className="service-description" style={{ fontSize: '20px' }}>
                    {text}
                </div>
            ),
        },
        {
            title: 'Mileage (km)',
            dataIndex: 'millage',
            key: 'millage',
            render: (text) => (
                <Tag color="green" className="part-tag" style={{ fontSize: '20px' }}>{text}</Tag>
            ),
        },
    
        {
            title: 'Next Service',
            dataIndex: 'next_service_date',
            key: 'next_service_date',
            render: (text) => (
                text ? (
                    <span className="table-text" style={{ fontSize: '20px' }}>
                        <ClockCircleOutlined className="icon-margin-right" /> {dayjs(text).format('YYYY-MM-DD')}
                    </span>
                ) : (
                    <Text type="secondary" className="table-text">Not specified</Text>
                )
            ),
        },
    
    ];

    // Generate PDF report for service records
    const generatePDFReport = async () => {
        try {
            if (serviceRecords.length === 0) {
                toast.warn("No service records to include in the report");
                return;
            }

            setExportLoading(true);

            // Create new PDF document
            const doc = new jsPDF("portrait", "mm", "a4");

            // Add report title with light blue color
            doc.setTextColor(63, 81, 181); // #3f51b5 - light blue
            doc.setFontSize(22);
            doc.text("Service Records Report", 105, 15, { align: "center" });

            // Add vehicle information
            doc.setTextColor(0, 0, 0); // Black text
            doc.setFontSize(16);
            doc.text(`${vehicleDetails?.make} ${vehicleDetails?.model} (${vehicleNumber})`, 105, 25, { align: "center" });

            // Add generation date
            doc.setFontSize(12);
            doc.text(`Generated on: ${dayjs().format("YYYY-MM-DD HH:mm")}`, 105, 32, { align: "center" });

            let yPosition = 40;
            const pageWidth = doc.internal.pageSize.width;

            // Add vehicle details with white background and black text
            const vehicleDetailsTable = [
                ["Make", vehicleDetails?.make || "N/A", "Model", vehicleDetails?.model || "N/A"],
                ["Year", vehicleDetails?.year_of_manuf || "N/A", "Color", vehicleDetails?.vehicle_colour || "N/A"],
                ["Engine", vehicleDetails?.engine_details || "N/A", "Transmission", vehicleDetails?.transmission_details || "N/A"],
                ["Owner", vehicleDetails?.owner_ || "N/A", "Condition", vehicleDetails?.condition_ || "N/A"]
            ];

            doc.autoTable({
                startY: yPosition,
                body: vehicleDetailsTable,
                theme: "grid",
                styles: { 
                    fontSize: 10,
                    cellPadding: 5,
                    fillColor: [255, 255, 255], // White background
                    textColor: [0, 0, 0], // Black text
                    lineColor: [63, 81, 181] // Light blue border
                },
                columnStyles: { 
                    0: { fontStyle: "bold", fillColor: [232, 240, 254] }, // Lightest blue for label
                    2: { fontStyle: "bold", fillColor: [232, 240, 254] }
                },
                margin: { left: 15, right: 15 },
                tableWidth: pageWidth - 30
            });

            yPosition = doc.lastAutoTable.finalY + 10;

            // Add service records header
            doc.setTextColor(63, 81, 181); // Light blue
            doc.setFontSize(14);
            doc.text("Service History", 15, yPosition);
            yPosition += 6;

            // Prepare service records data
            const serviceRecordsHeaders = ["Date", "Service Description", "Next Service", "Mileage", "Invoice ID"];
            const serviceRecordsData = serviceRecords.map(record => [
                dayjs(record.date_).format("YYYY-MM-DD"),
                record.service_description,
                record.next_service_date ? dayjs(record.next_service_date).format("YYYY-MM-DD") : "N/A",
                record.millage || "N/A",
                record.invoice_id || "No Invoice"
            ]);

            // Add service records table with white background and black text
            doc.autoTable({
                startY: yPosition,
                head: [serviceRecordsHeaders],
                body: serviceRecordsData,
                theme: "striped",
                styles: { 
                    fontSize: 9,
                    cellPadding: 5,
                    fillColor: [255, 255, 255], // White background
                    textColor: [0, 0, 0], // Black text
                    lineColor: [63, 81, 181] // Light blue border
                },
                headStyles: { 
                    fontSize: 10, 
                    fontStyle: "bold",
                    fillColor: [232, 240, 254], // Lightest blue for header
                    textColor: [0, 0, 0] // Black text
                },
                alternateRowStyles: {
                    fillColor: [245, 248, 255] // Very light blue for alternate rows
                },
                margin: { left: 15, right: 15 },
                tableWidth: pageWidth - 30
            });

            yPosition = doc.lastAutoTable.finalY + 10;

            // Add parts used section for each service record
            for (const record of serviceRecords) {
                // Check if we need a new page
                if (yPosition > 250) {
                    doc.addPage();
                    yPosition = 15;
                }

                // Add service record header
                doc.setTextColor(63, 81, 181); // Light blue
                doc.setFontSize(12);
                doc.text(`Service Date: ${dayjs(record.date_).format("YYYY-MM-DD")}`, 15, yPosition);
                yPosition += 6;

                // Add parts used header
                doc.setTextColor(0, 0, 0); // Black text
                doc.setFontSize(10);
                doc.text("Parts Used:", 15, yPosition);
                yPosition += 6;

                // Get parts used data
                let partsData = [];
                if (record.parts_used) {
                    if (Array.isArray(record.parts_used)) {
                        partsData = record.parts_used.map(part => [
                            part.item_name || "N/A",
                            part.brand || "N/A",
                            `${part.quantity_used} ${part.unit || 'units'}`
                        ]);
                    } else if (typeof record.parts_used === 'string') {
                        partsData = record.parts_used.split(',').map(part => [part.trim(), "N/A", "N/A"]);
                    }
                }

                // Always show the parts used table, even if empty
                if (partsData.length > 0) {
                    doc.autoTable({
                        startY: yPosition,
                        head: [["Part Name", "Brand", "Quantity"]],
                        body: partsData,
                        theme: "grid",
                        styles: { 
                            fontSize: 9,
                            cellPadding: 5,
                            fillColor: [255, 255, 255], // White background
                            textColor: [0, 0, 0], // Black text
                            lineColor: [63, 81, 181] // Light blue border
                        },
                        headStyles: { 
                            fontSize: 10, 
                            fontStyle: "bold",
                            fillColor: [232, 240, 254], // Lightest blue for header
                            textColor: [0, 0, 0] // Black text
                        },
                        margin: { left: 15, right: 15 },
                        tableWidth: pageWidth - 30
                    });
                    yPosition = doc.lastAutoTable.finalY + 10;
                } else {
                    doc.setTextColor(0, 0, 0); // Black text
                    doc.text("No parts were used for this service", 15, yPosition);
                    yPosition += 10;
                }
            }

            // Save the PDF
            doc.save(`service_records_${vehicleNumber}_${dayjs().format("YYYY-MM-DD")}.pdf`);
            toast.success("Service records report generated successfully");
        } catch (error) {
            console.error("Error generating PDF:", error);
            toast.error("Failed to generate service records report");
        } finally {
            setExportLoading(false);
        }
    };

    return (        <div className="min-h-screen text-lg">
            <style>
            {`
                .service-records-container {
                    font-size: 16px;
                }
                
                .icon-margin-right {
                    margin-right: 8px;
                }
                
                .service-record-modal .ant-modal-header {
                    background-color: #12133a;
                    color: white;
                    border-bottom: 1px solid #1a1b4b;
                }
                
                .service-record-modal .ant-modal-footer {
                    background-color: #12133a;
                }
                
                .service-record-modal .ant-modal-body {
                    font-size: 16px;
                    background-color: #12133a;
                    color: white;
                }
                
                .service-record-modal .ant-modal-content {
                    background-color: #12133a;
                    border-radius: 10px;
                    overflow: hidden;
                    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
                }
                
                .service-record-modal .ant-modal-title {
                    color: #4ade80;
                }
                
                .service-record-modal .ant-modal-close {
                    color: #ffffff;
                }
                
                .service-record-modal .ant-modal-close:hover {
                    color: #4ade80;
                }

                .modal-section {
                    margin-bottom: 24px;
                    border-radius: 8px;
                    overflow: hidden;
                }
                
                .modal-header {
                    background-color: #1a1b4b;
                    padding: 12px 16px;
                    border-bottom: 1px solid #1a1b4b;
                    margin-bottom: 16px;
                    border-radius: 8px 8px 0 0;
                }
                
                .modal-header-title {
                    color: white;
                    font-size: 21px;
                    font-weight: 500;
                    display: flex;
                    align-items: center;
                }
                
                .service-info-table {
                    width: 100%;
                    border-collapse: separate;
                    border-spacing: 0;
                }
                
                .service-info-table td {
                    padding: 12px 16px;
                    font-size: 19px;
                    color: white;
                }
                
                .service-info-table .label {
                    background-color:rgb(61, 64, 111);
                    font-weight: 500;
                    width: 150px;
                    border-right: 2px solid #0a0b1e;
                }
                
                .service-info-table .value {
                    background-color: #1a1b4b;
                }
                
                .service-info-table tr:not(:last-child) td {
                    border-bottom: 2px solid #0a0b1e;
                }
                
                .service-info-table .full-row {
                    width: 50%;
                }
                
                .service-info-table .half-row {
                    width: 25%;
                }
                
                .parts-list {
                    padding: 0;
                    margin: 0;
                    list-style: none;
                }
                
                .parts-list li {
                    padding: 12px 16px;
                    border-bottom: 1px solid #282a5a;
                }
                
                .parts-list li:last-child {
                    border-bottom: none;
                }
                
                .part-name {
                    font-weight: 500;
                    margin-bottom: 8px;
                    color: white;
                    font-size: 20px;
                }
                
                .part-quantity {
                    margin-top: 8px;
                    color: #ccc;
                    font-size: 18px;
                }
                
                .loading-container {
                    text-align: center;
                    padding: 30px;
                    color: white;
                }
                
                .loading-text {
                    margin-top: 15px;
                    font-size: 16px;
                }
                
                .content-card {
                    margin-bottom: 20px;
                    background-color: #1a1b4b;
                    color: white;
                    border-color: #1a1b4b;
                    border-radius: 10px;
                    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
                }
                
                .details-descriptions .ant-descriptions-item-label {
                    color: white !important;
                    font-size: 20px;
                    background-color: #1a1b4b;
                    font-weight: 500;

                }
                
                .details-descriptions .ant-descriptions-item-content {
                    color: white;
                    font-size: 20px;
                    background-color: #12133a;
                }
                
                .list-item {
                    border-bottom-color: #282a5a;
                }
                
                .quantity-container {
                    margin-top: 8px;
                    color: #ccc;
                    font-size: 14px;
                }
                
                .part-tag {
                    margin: 4px;
                    font-size: 14px;
                }
                
                .breadcrumb-link {
                    cursor: pointer;
                    color: #4ade80;
                }
                
                .breadcrumb-text {
                    color: white;
                }
                
                .breadcrumb-green {
                    color: #4ade80;
                }
                
                .title-container {
                    text-align: left;
                }
                
                .page-title {
                    color: #4ade80;
                    font-size: 28px;
                }
                
                .page-subtitle {
                    color: white;
                    font-size: 18px;
                }
                
                .action-button {
                    height: 45px;
                    font-size: 18px;
                    padding: 0 25px;
                }
                
                .back-button {
                    margin-right: 10px;
                    background-color: #1a1b4b;
                    border-color: #4ade80;
                    color: white;
                    font-size: 16px;
                }
                
                .add-button {
                    background-color: #4ade80;
                    border-color: #4ade80;
                    color: white;
                    font-size: 16px;
                }
                
                .card {
                    background-color: #12133a;
                    border-color: #1a1b4b;
                }
                
                .card-head {
                    background-color: #1a1b4b;
                    border-color: #1a1b4b;
                }
                
                .card-title {
                    color: white;
                    font-size: 21px;
                }
                
                .service-records-table {
                    background-color: black;
                    color:rgb(215, 215, 215);
                    font-size: 20px;
                }
                
                .empty-text {
                    color: white;
                    font-size: 16px;
                }
                
                .table-text {
                    font-size: 16px; 
                    color:rgb(255, 255, 255);
                }
                
                .service-description {
                    max-width: 400px; 
                    white-space: normal; 
                    word-break: break-word; 
                    font-size: 16px; 
                    color:rgb(255, 255, 255);
                }
                
                .details-button {
                    font-size: 14px; 
                    background-color: #1a8a42; 
                    color: #12133a;
                }
                
                .modal-title {
                    font-size: 20px;
                    color: #4ade80;
                    display: flex;
                    align-items: center;
                }
                
                .modal-subtitle {
                    font-size: 16px;
                    color: #aaa;
                    margin-top: 4px;
                }
                
                .modal-button {
                    font-size: 16px;
                    background-color: #1a1b4b;
                    border-color: #4ade80;
                    color: white;
                }
                
                .modal-button:hover {
                    background-color: #4ade80;
                    border-color: #4ade80;
                    color: #12133a;
                }

                .service-card {
                    background-color: #1a1b4b;
                    border: 1px solid #2c2f7c;
                    margin-bottom: 16px;
                    border-radius: 8px;
                }
                
                .service-card .ant-card-head {
                    background-color:rgb(146, 146, 146);
                    border-bottom: 1px solid #2c2f7c;
                    padding: 12px 24px;
                }
                
                .service-card .ant-card-body {
                    padding: 16px;
                }
                
                .service-card .ant-card-head-title {
                    color: #4ade80;
                }

/* Apply font color and font size for all td and th cells */
.custom-service-records-table .ant-table-cell {
    color: #ffffff !important;
    font-size: 20px !important;
}

/* Optional: Header cells specifically */
.custom-service-records-table .ant-table-thead > tr > th {
    background-color: #141852 !important;
    color: #ffffff !important;
    font-size: 20px !important;
    font-weight: 600 !important;
}

/* Optional: Body rows specifically */
.custom-service-records-table .ant-table-tbody > tr > td {
    background-color: #1a1b4b !important;
    border-color: #2c2f7c !important;
    font-size: 19px !important;
}



                .custom-service-records-table .ant-pagination {
                    color: #ffffff;
                }
                
                .invoice-controls {
                    display: flex;
                    margin-bottom: 20px;
                }
            `}
            </style>
            <div className="max-w-8xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Service Record Details Modal */}
                <Modal
                    title={
                        <div>
                            <Title level={3} style={{ color: "#ffffff" }} className="modal-title">
                                <FileTextOutlined className="icon-margin-right" />
                                Service Record Details
                            </Title>
                            {selectedRecord && (
                                <Text className="modal-subtitle" style={{ fontSize: "20px" }}>
                                    Date: {dayjs(selectedRecord.date_).format('YYYY-MM-DD')}
                                </Text>
                            )}
                        </div>
                    }
                    open={detailModalVisible}
                    onCancel={() => setDetailModalVisible(false)}
                    footer={[
                        <Button key="close" onClick={() => setDetailModalVisible(false)} 
                            className="modal-button">
                            Close
                        </Button>
                    ]}
                    width={900}
                    centered
                    className="service-record-modal"
                    closeIcon={<div style={{ color: 'white', fontSize: '16px' }}>×</div>}
                >
                    {loadingDetails ? (
                        <div className="loading-container">
                            <Spin size="large" />
                            <div className="loading-text">Loading details...</div>
                        </div>
                    ) : recordDetails ? (
                        <div>
                            {/* Service Information Section */}
                            <div className="modal-section">
                                <div className="modal-header">
                                    <div className="modal-header-title">
                                        <ToolOutlined className="icon-margin-right" />
                                        Service Information
                                    </div>
                                </div>
                                <table className="service-info-table">
                                    <tbody>
                                        <tr>
                                            <td className="label">Service ID</td>
                                            <td className="value" colSpan="3">#{recordDetails.record_id}</td>
                                        </tr>
                                        <tr>
                                            <td className="label">Date</td>
                                            <td className="value">{dayjs(recordDetails.date_).format('YYYY-MM-DD')}</td>
                                            <td className="label">Vehicle</td>
                                            <td className="value">{recordDetails.vehicle_number}</td>
                                        </tr>
                                        <tr>
                                            <td className="label">Description</td>
                                            <td className="value" colSpan="3">{recordDetails.service_description}</td>
                                        </tr>
                                        <tr>
                                            <td className="label">Mileage</td>
                                            <td className="value">{recordDetails.millage} km</td>
                                            <td className="label">Next Service</td>
                                            <td className="value">
                                                {recordDetails.next_service_date ? 
                                                    dayjs(recordDetails.next_service_date).format('YYYY-MM-DD') : 
                                                    'Not specified'}
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>

                            {/* Parts Used Section */}
                            <div className="modal-section">
                                <div className="modal-header">
                                    <div className="modal-header-title">
                                        <ToolOutlined className="icon-margin-right" />
                                        Parts Used
                                    </div>
                                </div>
                                {recordDetails.parts_used && (Array.isArray(recordDetails.parts_used) ? 
                                    recordDetails.parts_used.length > 0 : recordDetails.parts_used) ? (
                                    Array.isArray(recordDetails.parts_used) ? (
                                        <ul className="parts-list">
                                            {recordDetails.parts_used.map((item, index) => (
                                                <li key={index}>
                                                    <div className="part-name">{item.item_name}</div>
                                                    <div>
  <p style={{ fontSize: '18px', color: '#1890ff', fontWeight: '500', marginBottom: '8px' }}>
    BRAND: {item.brand || 'N/A'}
  </p>
</div>
                                                    <div className="part-quantity">
  <Text strong style={{ color: '#ccc', fontSize: '18px' }}>
    Quantity Used :
  </Text>
  <span style={{ marginLeft: '8px' }}>
    <Text style={{ color: '#ccc', fontSize: '18px' }}>
      {item.quantity_used} {item.unit || 'units'}
    </Text>
  </span>
</div>
                                                </li>
                                            ))}
                                        </ul>
                                    ) : (
                                        <div style={{ padding: '16px' }}>
                                            {typeof recordDetails.parts_used === 'string' && recordDetails.parts_used.split(',').map((part, index) => (
                                                <Tag color="blue" key={index} className="part-tag">
                                                    {part.trim()}
                                                </Tag>
                                            ))}
                                        </div>
                                    )
                                ) : (
                                    <Empty description={<span className="empty-text">No parts were used for this service</span>} />
                                )}
                            </div>
                        </div>
                    ) : (
                        <Empty description={<span className="empty-text">Failed to load service record details</span>} />
                    )}
                </Modal>

                <motion.div 
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2 }}
                    className="title-container"
                >
                   <Title level={1} className="page-title" style={{ color: "#ffffff" }}>
  Vehicle Service Records
</Title>
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
                            onClose={() => setError('')}
                        />
                    </motion.div>
                )}

                <div className="mb-6 mt-6 invoice-controls">
                    <Button 
                        icon={<RollbackOutlined />} 
                        onClick={() => navigate('/my-vehicles')}
                        className="back-button action-button"
                    >
                        Back to My Vehicles
                    </Button>
                    
                    <Button 
                        icon={<ToolOutlined />} 
                        onClick={() => navigate(`/custom-service-records/${vehicleNumber}`)}
                        style={{ backgroundColor: "#22c55e", color: "white", height:"45px",fontSize:"18px"}} // green-500
                    >
                        Add Custom Service Record
                    </Button>
                    <Button
  type="primary"
  icon={<FilePdfOutlined />}
  onClick={generatePDFReport}
  loading={exportLoading}
  className="ml-4 bg-blue-600 hover:bg-blue-700 action-button"
>
  Export PDF
</Button>
                </div>

                Vehicle Details Card
                {vehicleDetails && (
                    <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                        className="mb-6"
                    >
                        <Card 
                            title={
                                <div className="card-title">
                                    <CarOutlined className="icon-margin-right" />
                                    Vehicle Information
                                </div>
                            }
                            className="card content-card"
                            headStyle={{ backgroundColor: '#0a0b1e', borderColor: '#1a1b4b' }}
                        >
                            <Row gutter={[24, 16]}>
                                <Col xs={24} sm={12} md={8}>
                                    <Descriptions 
                                        layout="vertical" 
                                        column={1} 
                                        bordered
                                        className="details-descriptions"
                                    >
                                        <Descriptions.Item label="Vehicle Number">
                                            <strong>{vehicleDetails.vehicle_number}</strong>
                                        </Descriptions.Item>
                                    </Descriptions>
                                </Col>
                                <Col xs={24} sm={12} md={8}>
                                    <Descriptions 
                                        layout="vertical" 
                                        column={1} 
                                        bordered
                                        className="details-descriptions"
                                    >
                                        <Descriptions.Item label="Make & Model">
                                            {vehicleDetails.make} {vehicleDetails.model} ({vehicleDetails.year_of_manuf})
                                        </Descriptions.Item>
                                    </Descriptions>
                                </Col>
                                <Col xs={24} sm={12} md={8}>
                                    <Descriptions 
                                        layout="vertical" 
                                        column={1} 
                                        bordered
                                        className="details-descriptions"
                                    >
                                        <Descriptions.Item label="Color">
                                            <Tag color="blue" className="part-tag">{vehicleDetails.vehicle_colour}</Tag>
                                        </Descriptions.Item>
                                    </Descriptions>
                                </Col>
                                <Col xs={24} sm={12} md={8}>
                                    <Descriptions 
                                        layout="vertical" 
                                        column={1} 
                                        bordered
                                        className="details-descriptions"
                                    >
                                        <Descriptions.Item label="Engine">
                                            {vehicleDetails.engine_details}
                                        </Descriptions.Item>
                                    </Descriptions>
                                </Col>
                                <Col xs={24} sm={12} md={8}>
                                    <Descriptions 
                                        layout="vertical" 
                                        column={1} 
                                        bordered
                                        className="details-descriptions"
                                    >
                                        <Descriptions.Item label="Transmission">
                                            {vehicleDetails.transmission_details}
                                        </Descriptions.Item>
                                    </Descriptions>
                                </Col>
                                <Col xs={24} sm={12} md={8}>
                                    <Descriptions 
                                        layout="vertical" 
                                        column={1} 
                                        bordered
                                        className="details-descriptions"
                                    >
                                        <Descriptions.Item label="Condition">
                                            {vehicleDetails.condition_}
                                        </Descriptions.Item>
                                    </Descriptions>
                                </Col>
                            </Row>
                        </Card>
                    </motion.div>
                )}

                {/* Service Records Table */}
                <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                >
                    <Card 
                        title={
                            <div className="card-title">
                                <ToolOutlined className="icon-margin-right" />
                                Service Records
                            </div>
                        }
                        className="card content-card"
                        headStyle={{ backgroundColor: '#0a0b1e', borderColor: '#1a1b4b' }}
                    >
                        {loading ? (
                            <div className="loading-container">
                                <Spin size="large" />
                                <div className="loading-text">Loading service records...</div>
                            </div>
                        ) : serviceRecords.length > 0 ? (
                            <Table
                                className="custom-service-records-table"
                                columns={columns}
                                dataSource={serviceRecords}
                                rowKey="record_id"
                                pagination={{
                                    defaultPageSize: 5,
                                    showSizeChanger: true,
                                    pageSizeOptions: ['5', '10', '20'],
                                }}
                                onRow={(record) => ({
                                    onClick: () => handleViewDetails(record),
                                    style: { cursor: 'pointer' }
                                })}
                            />
                        ) : (
                            <Empty 
                                description={<span className="empty-text">No service records found for this vehicle.</span>}
                                image={Empty.PRESENTED_IMAGE_SIMPLE}
                            />
                        )}
                    </Card>
                </motion.div>
            </div>
        </div>
    );
};

export default CustomerServiceRecords; 