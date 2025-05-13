import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
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
    DatePicker,
    InputNumber,
    Tooltip,
    Popconfirm,
    Statistic,
    Row,
    Col,
    Badge,
    Tag,
    Alert
} from 'antd';
import {
    PlusOutlined,
    EditOutlined,
    DeleteOutlined,
    ShoppingCartOutlined,
    DollarOutlined,
    ShopOutlined,
    CalendarOutlined
} from '@ant-design/icons';
import { motion } from 'framer-motion';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { Option } = Select;

const AdminPurchase = () => {
    const navigate = useNavigate();
    const [purchases, setPurchases] = useState([]);
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [modalVisible, setModalVisible] = useState(false);
    const [editingPurchase, setEditingPurchase] = useState(null);
    const [stats, setStats] = useState({
        totalPurchases: 0,
        totalSpent: 0,
        totalItems: 0,
        uniqueItems: 0
    });
    const [form] = Form.useForm();

    // Authentication check on component mount
    useEffect(() => {
        const checkAuth = async () => {
            try {
                const user = JSON.parse(localStorage.getItem('user'));
                if (!user || user.role !== 'admin') {
                    navigate('/login');
                    return;
                }
                fetchPurchases();
                fetchItems();
            } catch (error) {
                console.error('Auth check error:', error);
                navigate('/login');
            }
        };

        checkAuth();
    }, [navigate]);

    // Calculate statistics when purchases change
    useEffect(() => {
        const totalPurchases = purchases.length;
        const totalSpent = purchases.reduce((sum, purchase) => sum + (purchase.buying_price * purchase.quantity), 0);
        const totalItems = purchases.reduce((sum, purchase) => sum + purchase.quantity, 0);
        const uniqueItems = new Set(purchases.map(purchase => purchase.item_id)).size;

        setStats({
            totalPurchases,
            totalSpent,
            totalItems,
            uniqueItems
        });
    }, [purchases]);

    const fetchPurchases = async () => {
        try {
            setLoading(true);
            setError('');
            const response = await axios.get('http://localhost:3000/api/purchases', {
                withCredentials: true,
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            setPurchases(response.data);
        } catch (error) {
            console.error('Error fetching purchases:', error);
            setError('Failed to fetch purchases');
            if (error.response?.status === 401 || error.response?.status === 403) {
                navigate('/login');
            }
        } finally {
            setLoading(false);
        }
    };

    const fetchItems = async () => {
        try {
            const response = await axios.get('http://localhost:3000/api/inventory-items', {
                withCredentials: true,
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            setItems(response.data);
        } catch (error) {
            console.error('Error fetching items:', error);
            toast.error('Failed to fetch items');
            if (error.response?.status === 401 || error.response?.status === 403) {
                navigate('/login');
            }
        }
    };

    const handleAdd = () => {
        setEditingPurchase(null);
        form.resetFields();
        form.setFieldsValue({
            purchase_date: dayjs()
        });
        setModalVisible(true);
    };

    const handleEdit = (record) => {
        setEditingPurchase(record);
        form.setFieldsValue({
            ...record,
            purchase_date: dayjs(record.purchase_date)
        });
        setModalVisible(true);
    };

    const handleDelete = async (purchaseId) => {
        try {
            await axios.delete(`http://localhost:3000/api/purchases/${purchaseId}`, {
                withCredentials: true,
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            toast.success('Purchase deleted successfully');
            fetchPurchases();
        } catch (error) {
            console.error('Error deleting purchase:', error);
            toast.error(error.response?.data?.message || 'Failed to delete purchase');
            if (error.response?.status === 401 || error.response?.status === 403) {
                navigate('/login');
            }
        }
    };

    const handleModalOk = async () => {
        try {
            const values = await form.validateFields();
            const formData = {
                ...values,
                purchase_date: values.purchase_date.format('YYYY-MM-DD')
            };

            if (editingPurchase) {
                await axios.put(`http://localhost:3000/api/purchases/${editingPurchase.purchase_id}`, formData, {
                    withCredentials: true,
                    headers: {
                        'Content-Type': 'application/json'
                    }
                });
                toast.success('Purchase updated successfully');
            } else {
                await axios.post('http://localhost:3000/api/purchases', formData, {
                    withCredentials: true,
                    headers: {
                        'Content-Type': 'application/json'
                    }
                });
                toast.success('Purchase created successfully');
            }
            setModalVisible(false);
            fetchPurchases();
        } catch (error) {
            console.error('Error saving purchase:', error);
            toast.error(error.response?.data?.message || 'Operation failed');
            if (error.response?.status === 401 || error.response?.status === 403) {
                navigate('/login');
            }
        }
    };

    const columns = [
        {
            title: 'Item Details',
            dataIndex: 'item_name',
            key: 'item_name',
            render: (text, record) => (
                <div key={`item-${record.purchase_id}`}>
                    <Text strong>{text}</Text>
                    <br />
                    <Text type="secondary">{record.brand} - {record.category}</Text>
                </div>
            ),
        },
        {
            title: 'Purchase Date',
            dataIndex: 'purchase_date',
            key: 'purchase_date',
            render: (date) => dayjs(date).format('YYYY-MM-DD'),
        },
        {
            title: 'Quantity',
            dataIndex: 'quantity',
            key: 'quantity',
            render: (quantity) => (
                <Text  className="table-text">
                    {quantity}
                </Text>
            ),
        },
        {
            title: 'Buying Price',
            dataIndex: 'buying_price',
            key: 'buying_price',
            render: (price) => (
                <Text  className="table-text">
                    Rs. {Number(price).toFixed(2)}
                </Text>
            ),
        },
        {
            title: 'Selling Price',
            dataIndex: 'selling_price',
            key: 'selling_price',
            render: (price) => (
                <Text  className="table-text">
                    Rs. {Number(price).toFixed(2)}
                </Text>
            ),
        },
        {
            title: 'Total Cost',
            key: 'total_cost',
            render: (_, record) => (
                <Text strong className="table-text">
                    Rs. {(Number(record.quantity) * Number(record.buying_price)).toFixed(2)}
                </Text>
            ),
        },
        {
            title: 'Actions',
            key: 'actions',
            render: (_, record) => (
                <Space>
                    <Tooltip title="Edit">
                        <Button
                            type="primary"
                            icon={<EditOutlined />}
                            onClick={() => handleEdit(record)}
                            className="action-button-round"
                        />
                    </Tooltip>
                    <Popconfirm
                        title="Are you sure you want to delete this purchase?"
                        description="This will also remove the corresponding inventory stock. Cannot be undone if stock has been used."
                        onConfirm={() => handleDelete(record.purchase_id)}
                        okText="Yes"
                        cancelText="No"
                    >
                        <Tooltip title="Delete">
                            <Button
                                danger
                                icon={<DeleteOutlined />}
                                className="action-button-round"
                            />
                        </Tooltip>
                    </Popconfirm>
                </Space>
            ),
        },
    ];

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="page"
        >
            <div className="content-container">
                <div className="mb-8">
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.2 }}
                        className="header-container"
                    >
                        <Title level={2} className="page-title">Purchase Management</Title>
                        <Text type="secondary" className="page-subtitle">
                            Track and manage your inventory purchases
                        </Text>
                    </motion.div>
                </div>

                {error && (
                    <Alert 
                        message="Error" 
                        description={error} 
                        type="error" 
                        showIcon 
                        closable
                        className="mb-4"
                        onClose={() => setError('')}
                    />
                )}

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                >
                    <Row gutter={16} className="stats-row">
                        <Col xs={24} sm={12} md={6} lg={6} xl={6}>
                            <Card className="content-card stats-card">
                                <Statistic
                                    title="Total Purchases"
                                    value={stats.totalPurchases}
                                    prefix={<ShoppingCartOutlined />}
                                    valueStyle={{ color: '#1890ff' }}
                                />
                            </Card>
                        </Col>
                        <Col xs={24} sm={12} md={6} lg={6} xl={6}>
                            <Card className="content-card stats-card">
                                <Statistic
                                    title="Total Spent"
                                    value={stats.totalSpent.toFixed(2)}
                                    prefix={<DollarOutlined />}
                                    valueStyle={{ color: '#cf1322' }}
                                />
                            </Card>
                        </Col>
                        <Col xs={24} sm={12} md={6} lg={6} xl={6}>
                            <Card className="content-card stats-card">
                                <Statistic
                                    title="Total Items"
                                    value={stats.totalItems}
                                    prefix={<ShopOutlined />}
                                    valueStyle={{ color: '#52c41a' }}
                                />
                            </Card>
                        </Col>
                        <Col xs={24} sm={12} md={6} lg={6} xl={6}>
                            <Card className="content-card stats-card">
                                <Statistic
                                    title="Unique Items"
                                    value={stats.uniqueItems}
                                    prefix={<CalendarOutlined />}
                                    valueStyle={{ color: '#722ed1' }}
                                />
                            </Card>
                        </Col>
                    </Row>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                >
                    <Card className="content-card table-card">
                        <div className="table-header">
                            <div></div>
                            <Button
                                type="primary"
                                icon={<PlusOutlined />}
                                onClick={handleAdd}
                                size="large"
                                className="add-button"
                            >
                                Add New Purchase
                            </Button>
                        </div>

                        <Table
                            columns={columns}
                            dataSource={purchases}
                            rowKey="purchase_id"
                            loading={loading}
                            pagination={{
                                pageSize: 10,
                                showSizeChanger: true,
                                showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} purchases`
                            }}
                            className="purchases-table"
                        />
                    </Card>
                </motion.div>

                <Modal
                    title={
                        <div className="modal-title-container">
                            <Title level={3} className="modal-title">{editingPurchase ? 'Edit Purchase' : 'Add New Purchase'}</Title>
                        </div>
                    }
                    open={modalVisible}
                    onOk={handleModalOk}
                    onCancel={() => setModalVisible(false)}
                    width={600}
                    centered
                    bodyStyle={{ padding: '24px' }}
                >
                    <Form
                        form={form}
                        layout="vertical"
                    >
                        <Form.Item
                            name="item_id"
                            label="Item"
                            rules={[{ required: true, message: 'Please select an item' }]}
                        >
                            <Select size="large" className="item-select">
                                {items.map(item => (
                                    <Option key={item.item_id} value={item.item_id}>
                                        {item.item_name} - {item.brand} ({item.category})
                                    </Option>
                                ))}
                            </Select>
                        </Form.Item>

                        <Form.Item
                            name="purchase_date"
                            label="Purchase Date"
                            rules={[{ required: true, message: 'Please select purchase date' }]}
                        >
                            <DatePicker size="large" className="date-picker" />
                        </Form.Item>

                        <Form.Item
                            name="quantity"
                            label="Quantity"
                            rules={[{ required: true, message: 'Please enter quantity' }]}
                        >
                            <InputNumber min={1} size="large" className="quantity-input" />
                        </Form.Item>

                        <Form.Item
                            name="buying_price"
                            label="Buying Price"
                            rules={[{ required: true, message: 'Please enter buying price' }]}
                        >
                            <InputNumber
                                min={0}
                                size="large"
                                className="price-input"
                                prefix="Rs."
                                step={0.01}
                            />
                        </Form.Item>

                        <Form.Item
                            name="selling_price"
                            label="Selling Price"
                            rules={[{ required: true, message: 'Please enter selling price' }]}
                        >
                            <InputNumber
                                min={0}
                                size="large"
                                className="price-input"
                                prefix="Rs."
                                step={0.01}
                            />
                        </Form.Item>

                        <Form.Item
                            label="Total Cost"
                            dependencies={['quantity', 'buying_price']}
                        >
                            {({ getFieldValue }) => {
                                const quantity = getFieldValue('quantity') || 0;
                                const buyingPrice = getFieldValue('buying_price') || 0;
                                const totalCost = quantity * buyingPrice;
                                return (
                                    <Text className="total-cost-text">
                                        Rs. {totalCost.toFixed(2)}
                                    </Text>
                                )
                            }}
                        </Form.Item>

                        <Form.Item
                            label="Total Value"
                            dependencies={['quantity', 'selling_price']}
                        >
                            {({ getFieldValue }) => {
                                const quantity = getFieldValue('quantity') || 0;
                                const sellingPrice = getFieldValue('selling_price') || 0;
                                const totalValue = quantity * sellingPrice;
                                return (
                                    <Text className="total-value-text">
                                        Rs. {totalValue.toFixed(2)}
                                    </Text>
                                )
                            }}
                        </Form.Item>

                        <Form.Item
                            label="Estimated Profit"
                            dependencies={['quantity', 'buying_price', 'selling_price']}
                        >
                            {({ getFieldValue }) => {
                                const quantity = getFieldValue('quantity') || 0;
                                const buyingPrice = getFieldValue('buying_price') || 0;
                                const sellingPrice = getFieldValue('selling_price') || 0;
                                const profit = quantity * (sellingPrice - buyingPrice);
                                return (
                                    <Text className={profit >= 0 ? "profit-positive-text" : "profit-negative-text"}>
                                        Rs. {profit.toFixed(2)}
                                    </Text>
                                )
                            }}
                        </Form.Item>
                    </Form>
                </Modal>
            </div>

            <style jsx>{`
                .page {
                    background-color: #ffffff;
                    min-height: 100vh;
                    padding: 20px;
                    width: 100%;
                }
                
                .content-container {
                    width: 100%;
                    margin: 0 auto;
                    padding: 0 16px;
                }
                
                .header-container {
                    text-align: left;
                    padding-left: 8px;
                }
                
                .mb-8 {
                    margin-bottom: 24px;
                }
                
                .mb-6 {
                    margin-bottom: 16px;
                }
                
                .mb-4 {
                    margin-bottom: 12px;
                }
                
                .flex {
                    display: flex;
                }
                
                .justify-between {
                    justify-content: space-between;
                }
                
                .items-center {
                    align-items: center;
                }
                
                .purchases-table {
                    width: 100%;
                }
                
                .purchases-table .ant-table-thead > tr > th {
                    font-size: 20px;
                    padding: 12px 16px;
                }
                
                .purchases-table .ant-table-tbody > tr > td {
                    font-size: 19px;
                    padding: 12px 16px;
                    color: #000000;
                }
                
                .purchases-table .ant-table-tbody > tr > td * {
                    font-size: 19px;
                    color: #000000;
                }
                
                .purchases-table .ant-typography.ant-typography-secondary {
                    font-size: 19px;
                    color: #000000;
                }
                
                .page-title {
                    font-size: 32px;
                    margin-bottom: 15px;
                    color: #333;
                }
                
                .page-subtitle {
                    font-size: 18px;
                    color: #666;
                }
                
                .content-card {
                    border-radius: 10px;
                    margin-bottom: 20px;
                    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
                }
                
                .action-button-round {
                    border-radius: 50%;
                }
                
                .add-button {
                    background: #1890ff;
                    border-radius: 8px;
                    box-shadow: 0 2px 4px rgba(24,144,255,0.35);
                    height: 45px;
                    font-size: 18px;
                }
                
                .buying-price {
                    color: #000000;
                }
                
                .selling-price {
                    color: #000000;
                }
                
                .modal-title-container {
                    text-align: center;
                    margin: 12px 0;
                }
                
                .modal-title {
                    font-size: 23px;
                    margin: 0;
                    font-weight: 600;
                }
                
                .item-select, .date-picker, .quantity-input, .price-input {
                    width: 100%;
                    font-size: 18px;
                }
                
                .stats-row {
                    display: flex;
                    justify-content: space-between;
                    flex-wrap: wrap;
                }
                
                .stats-card {
                    height: 100%;
                    margin-bottom: 16px;
                }
                
                .table-card {
                    width: 100%;
                }
                
                .table-header {
                    display: flex;
                    justify-content: flex-end;
                    margin-bottom: 16px;
                }
                
                .table-text {
                    color: #000000;
                }
            `}</style>
        </motion.div>
    );
};

export default AdminPurchase; 