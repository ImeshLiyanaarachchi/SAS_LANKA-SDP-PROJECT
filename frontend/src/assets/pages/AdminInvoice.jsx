import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import {
    Button,
    Table,
    Typography,
    Card,
    Input,
    Space,
    Tag,
    Spin,
    DatePicker,
    Alert,
    Modal,
    Descriptions,
    Divider,
    Empty
} from 'antd';
import {
    SearchOutlined,
    FilePdfOutlined,
    EyeOutlined,
    CalendarOutlined,
    ArrowLeftOutlined
} from '@ant-design/icons';
import { motion } from 'framer-motion';
import dayjs from 'dayjs';
import { toast } from 'react-toastify';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

const AdminInvoice = () => {
    const navigate = useNavigate();
    const [invoices, setInvoices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [searchText, setSearchText] = useState('');
    const [dateRange, setDateRange] = useState(null);
    const [currentInvoice, setCurrentInvoice] = useState(null);
    const [viewModalVisible, setViewModalVisible] = useState(false);

    // Authentication check and fetch data on mount
    useEffect(() => {
        const checkAuth = async () => {
            try {
                const user = JSON.parse(localStorage.getItem('user'));
                if (!user || (user.role !== "admin" && user.role !== "technician")) {
                    console.log('Unauthorized access attempt');
                    navigate('/login');
                    return;
                }
                
                const token = user.token;
                fetchInvoices(token);
            } catch (error) {
                console.error('Auth check error:', error);
                navigate('/login');
            }
        };

        checkAuth();
    }, [navigate]);

    const fetchInvoices = async (token) => {
        try {
            setLoading(true);
            const response = await axios.get('http://localhost:3000/api/invoices', {
                withCredentials: true,
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            setInvoices(response.data);
        } catch (error) {
            console.error('Error fetching invoices:', error);
            if (error.response?.status === 401 || error.response?.status === 403) {
                navigate('/login');
                return;
            }
            setError('Failed to fetch invoices');
            toast.error('Failed to fetch invoices');
        } finally {
            setLoading(false);
        }
    };

    const handleView = async (invoiceId) => {
        try {
            setLoading(true);
            const user = JSON.parse(localStorage.getItem('user'));
            const response = await axios.get(`http://localhost:3000/api/invoices/${invoiceId}`, {
                withCredentials: true,
                headers: {
                    'Authorization': `Bearer ${user.token}`,
                    'Content-Type': 'application/json'
                }
            });
            
            setCurrentInvoice(response.data);
            setViewModalVisible(true);
        } catch (error) {
            console.error('Error fetching invoice details:', error);
            toast.error('Failed to fetch invoice details');
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = (value) => {
        setSearchText(value);
    };

    const handleDateRangeChange = (dates) => {
        setDateRange(dates);
    };

    const filteredInvoices = invoices.filter((invoice) => {
        // Filter by search text
        const searchFilter = 
            !searchText ||
            invoice.invoice_id.toLowerCase().includes(searchText.toLowerCase()) ||
            invoice.vehicle_number.toLowerCase().includes(searchText.toLowerCase()) ||
            invoice.service_description.toLowerCase().includes(searchText.toLowerCase()) ||
            (invoice.make && invoice.make.toLowerCase().includes(searchText.toLowerCase())) || 
            (invoice.model && invoice.model.toLowerCase().includes(searchText.toLowerCase()));

        // Filter by date range
        let dateFilter = true;
        if (dateRange && dateRange[0] && dateRange[1]) {
            const invoiceDate = dayjs(invoice.created_date);
            dateFilter = 
                invoiceDate.isAfter(dateRange[0].startOf('day')) && 
                invoiceDate.isBefore(dateRange[1].endOf('day'));
        }

        return searchFilter && dateFilter;
    });

    const columns = [
        {
            title: 'Invoice ID',
            dataIndex: 'invoice_id',
            key: 'invoice_id',
            render: (text) => <Tag color="blue">{text}</Tag>
        },
        {
            title: 'Vehicle',
            key: 'vehicle',
            render: (_, record) => (
                <span>
                    {record.vehicle_number} - {record.make} {record.model}
                </span>
            )
        },
        {
            title: 'Service Date',
            dataIndex: 'service_date',
            key: 'service_date',
            render: (date) => dayjs(date).format('YYYY-MM-DD')
        },
        {
            title: 'Invoice Date',
            dataIndex: 'created_date',
            key: 'created_date',
            render: (date) => dayjs(date).format('YYYY-MM-DD')
        },
        {
            title: 'Service Charge',
            dataIndex: 'service_charge',
            key: 'service_charge',
            render: (amount) => `Rs ${parseFloat(amount).toFixed(2)}`
        },
        {
            title: 'Parts Total',
            dataIndex: 'parts_total_price',
            key: 'parts_total_price',
            render: (amount) => `Rs ${parseFloat(amount).toFixed(2)}`
        },
        {
            title: 'Total',
            dataIndex: 'total_price',
            key: 'total_price',
            render: (amount) => (
              <span style={{ fontWeight: 'bold' }}>
                {`Rs ${parseFloat(amount).toFixed(2)}`}
              </span>
            )
          },
        {
            title: 'Actions',
            key: 'actions',
            render: (_, record) => (
                <Space size="small">
                    <Button 
                        type="primary" 
                        icon={<EyeOutlined />} 
                        size="small" 
                        onClick={() => handleView(record.invoice_id)}
                    >
                        View
                    </Button>
                </Space>
            )
        }
    ];

    if (loading && invoices.length === 0) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Spin size="large" />
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
                style={{ backgroundColor: "#ffffff" }}  // ✅ Add this line
            >
                <div className="max-w-8xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="mb-8 flex justify-between items-center">
                        <motion.div
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.2 }}
                        >
                            <Title level={2}>Invoice Management</Title>
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

                    <Card className="mb-8">
                        <div className="invoice-controls flex flex-col md:flex-row justify-between items-start md:items-center mb-4 gap-4">
                            <Space size="middle">
                                <Input
                                    placeholder="Search invoice, vehicle..."
                                    onChange={(e) => handleSearch(e.target.value)}
                                    style={{ width: 250 }}
                                    prefix={<SearchOutlined />}
                                    allowClear
                                />
                                <RangePicker 
                                    onChange={handleDateRangeChange}
                                    placeholder={['Start date', 'End date']}
                                    style={{ width: 250 }}
                                    format="YYYY-MM-DD"
                                />
                            </Space>
                        </div>

                        <Table
                            columns={columns}
                            dataSource={filteredInvoices}
                            rowKey="invoice_id"
                            loading={loading}
                            pagination={{
                                showSizeChanger: true,
                                defaultPageSize: 10,
                                pageSizeOptions: ['10', '20', '50']
                            }}
                            className="invoice-table"
                        />
                    </Card>

                    <Modal
                        title={<Title level={4}>Invoice Details</Title>}
                        open={viewModalVisible}
                        onCancel={() => setViewModalVisible(false)}
                        footer={[
                            <Button key="close" onClick={() => setViewModalVisible(false)}>
                                Close
                            </Button>
                        ]}
                        width={800}
                    >
                        {currentInvoice && (
                            <div>
                                <Descriptions title="Service Information" bordered className="details-descriptions">
                                    <Descriptions.Item label="Invoice ID" span={3}>
                                        {currentInvoice.invoice_id}
                                    </Descriptions.Item>
                                    <Descriptions.Item label="Vehicle" span={3}>
                                        {currentInvoice.vehicle_number} - {currentInvoice.make} {currentInvoice.model}
                                    </Descriptions.Item>
                                    <Descriptions.Item label="Owner" span={3}>
                                        {currentInvoice.owner}
                                    </Descriptions.Item>
                                    <Descriptions.Item label="Service Description" span={3}>
                                        {currentInvoice.description}
                                    </Descriptions.Item>
                                    <Descriptions.Item label="Service Date">
                                        {dayjs(currentInvoice.service_date).format('YYYY-MM-DD')}
                                    </Descriptions.Item>
                                    <Descriptions.Item label="Mileage">
                                        {currentInvoice.millage} km
                                    </Descriptions.Item>
                                    <Descriptions.Item label="Invoice Date">
                                        {dayjs(currentInvoice.created_date).format('YYYY-MM-DD')}
                                    </Descriptions.Item>
                                </Descriptions>

                                <Divider>Parts Used</Divider>
                                
                                {currentInvoice.parts_used && currentInvoice.parts_used.length > 0 ? (
                                    <Table 
                                        dataSource={currentInvoice.parts_used}
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
                                            dataIndex="selling_price" 
                                            render={(price) => price ? `Rs ${parseFloat(price).toFixed(2)}` : 'N/A'}
                                        />
                                        <Table.Column 
                                            title="Total" 
                                            render={(_, record) => record.quantity_used && record.selling_price 
                                                ? `Rs ${(record.quantity_used * parseFloat(record.selling_price)).toFixed(2)}`
                                                : 'N/A'}
                                        />
                                    </Table>
                                ) : (
                                    <Empty description="No parts used" />
                                )}

                                <Divider>Invoice Summary</Divider>

                                <Descriptions bordered className="details-descriptions">
                                    <Descriptions.Item label="Parts Total" span={2}>
                                        Rs {currentInvoice.parts_total_price ? Number(currentInvoice.parts_total_price).toFixed(2) : '0.00'}
                                    </Descriptions.Item>
                                    <Descriptions.Item label="Service Charge">
                                        Rs {currentInvoice.service_charge ? Number(currentInvoice.service_charge).toFixed(2) : '0.00'}
                                    </Descriptions.Item>
                                    <Descriptions.Item label="Total Amount" span={3}>
                                        <Text strong style={{ fontSize: '20px' }}>
                                            Rs {currentInvoice.total_price ? Number(currentInvoice.total_price).toFixed(2) : '0.00'}
                                        </Text>
                                    </Descriptions.Item>
                                </Descriptions>
                            </div>
                        )}
                    </Modal>
                </div>
            </motion.div>
            <style>{`
                /* Standard white theme and font sizes */
                .invoice-table .ant-table-thead > tr > th {
                    font-size: 20px;
                    padding: 12px 16px;
                }
                
                .invoice-table .ant-table-tbody > tr > td {
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
                
                .details-descriptions .ant-descriptions-item-label {
                    font-size: 20px;
                    font-weight: 500;
                }
                
                .details-descriptions .ant-descriptions-item-content {
                    font-size: 20px;
                }
                
                .ant-divider-inner-text {
                    font-size: 20px;
                    font-weight: 500;
                }
                /* Enlarged Search Input and Date Picker */
                    .invoice-controls .ant-input {
                    height: 35px;
                    font-size: 18px;
                    padding: 10px 14px;
                }

                .invoice-controls .ant-picker {
                    height: 48px;
                    font-size: 18px;
                    padding: 10px 14px;
                }
                .invoice-controls .ant-input::placeholder,
                .invoice-controls .ant-picker-input > input::placeholder {
                    font-size: 17px;
                } 



            `}</style>
        </>
    );
};

export default AdminInvoice; 