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
    InputNumber,
    Tooltip,
    Popconfirm,
    Statistic,
    Row,
    Col,
    Badge,
    Tag,
    Tabs,
    Alert,
    Drawer,
    Empty
} from 'antd';
import {
    PlusOutlined,
    EditOutlined,
    HistoryOutlined,
    WarningOutlined,
    ShoppingCartOutlined,
    DollarOutlined,
    ShopOutlined,
    AlertOutlined
} from '@ant-design/icons';
import { motion } from 'framer-motion';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { Option } = Select;
const { TabPane } = Tabs;

const AdminStock = () => {
    const navigate = useNavigate();
    const [stocks, setStocks] = useState([]);
    const [lowStockItems, setLowStockItems] = useState([]);
    const [items, setItems] = useState([]);
    const [purchases, setPurchases] = useState([]);
    const [loading, setLoading] = useState(false);
    const [modalVisible, setModalVisible] = useState(false);
    const [historyDrawerVisible, setHistoryDrawerVisible] = useState(false);
    const [selectedStock, setSelectedStock] = useState(null);
    const [usageHistory, setUsageHistory] = useState([]);
    const [stats, setStats] = useState({
        totalStock: 0,
        lowStockCount: 0,
        totalValue: 0,
        averagePrice: 0
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
                fetchStocks();
                fetchLowStockItems();
                fetchItems();
                fetchPurchases();
            } catch (error) {
                console.error('Auth check error:', error);
                navigate('/login');
            }
        };

        checkAuth();
    }, [navigate]);

    // Calculate statistics when stocks change
    useEffect(() => {
        const totalStock = stocks.reduce((sum, stock) => sum + stock.quantity_available, 0);
        const lowStockCount = lowStockItems.length;
        const totalValue = stocks.reduce((sum, stock) => sum + (stock.quantity_available * stock.selling_price), 0);
        const averagePrice = stocks.length > 0 ? totalValue / totalStock : 0;

        setStats({
            totalStock,
            lowStockCount,
            totalValue,
            averagePrice
        });
    }, [stocks, lowStockItems]);

    const fetchStocks = async () => {
        try {
            setLoading(true);
            const response = await axios.get('http://localhost:3000/api/stock', {
                withCredentials: true,
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            setStocks(response.data);
        } catch (error) {
            console.error('Error fetching stocks:', error);
            toast.error('Failed to fetch stocks');
            if (error.response?.status === 401 || error.response?.status === 403) {
                navigate('/login');
            }
        } finally {
            setLoading(false);
        }
    };

    const fetchLowStockItems = async () => {
        try {
            const response = await axios.get('http://localhost:3000/api/stock/low-stock', {
                withCredentials: true,
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            setLowStockItems(response.data);
        } catch (error) {
            console.error('Error fetching low stock items:', error);
            toast.error('Failed to fetch low stock items');
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
        }
    };

    const fetchPurchases = async () => {
        try {
            const response = await axios.get('http://localhost:3000/api/purchases', {
                withCredentials: true,
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            setPurchases(response.data);
        } catch (error) {
            console.error('Error fetching purchases:', error);
            toast.error('Failed to fetch purchases');
        }
    };

    const fetchStockHistory = async (stockId) => {
        try {
            const response = await axios.get(`http://localhost:3000/api/stock/${stockId}/usage-history`, {
                withCredentials: true,
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            setUsageHistory(response.data);
        } catch (error) {
            console.error('Error fetching stock history:', error);
            toast.error('Failed to fetch stock history');
        }
    };

    const handleAdd = () => {
        setSelectedStock(null);
        form.resetFields();
        setModalVisible(true);
    };

    const handleEdit = (record) => {
        setSelectedStock(record);
        form.setFieldsValue({
            item_id: record.item_id,
            quantity_available: record.quantity_available,
            selling_price: record.selling_price,
            purchase_id: record.purchase_id
        });
        setModalVisible(true);
    };

    const handleViewHistory = (record) => {
        setSelectedStock(record);
        fetchStockHistory(record.stock_id);
        setHistoryDrawerVisible(true);
    };

    const handleModalOk = async () => {
        try {
            const values = await form.validateFields();
            
            if (selectedStock) {
                await axios.put(`http://localhost:3000/api/stock/${selectedStock.stock_id}`, values, {
                    withCredentials: true,
                    headers: {
                        'Content-Type': 'application/json'
                    }
                });
                toast.success('Stock updated successfully');
            } else {
                await axios.post('http://localhost:3000/api/stock', values, {
                    withCredentials: true,
                    headers: {
                        'Content-Type': 'application/json'
                    }
                });
                toast.success('Stock added successfully');
            }
            setModalVisible(false);
            fetchStocks();
            fetchLowStockItems();
        } catch (error) {
            console.error('Error saving stock:', error);
            toast.error(error.response?.data?.message || 'Operation failed');
        }
    };

    const columns = [
        {
            title: 'Item Details',
            dataIndex: 'item_name',
            key: 'item_name',
            render: (text, record) => (
                <div>
                    <Text strong>{text}</Text>
                    <br />
                    <Text type="secondary">{record.brand} - {record.category}</Text>
                    <br />
                    <Text type="secondary">Unit: {record.unit}</Text>
                </div>
            ),
        },
        {
            title: 'Quantity',
            dataIndex: 'quantity_available',
            key: 'quantity_available',
            render: (quantity, record) => {
                const isLowStock = quantity <= record.restock_level;
                return (
                    <div>
                        <Badge
                            count={quantity}
                            style={{
                                backgroundColor: isLowStock ? '#ff4d4f' : '#52c41a',
                                color: 'white',
                            }}
                        />
                        {isLowStock && (
                            <Tag color="error" style={{ marginLeft: 8 }}>
                                Low Stock
                            </Tag>
                        )}
                    </div>
                );
            },
        },
        {
            title: 'Price Details',
            key: 'price',
            render: (_, record) => (
                <div>
                    <div>
                        <Text type="secondary">Selling: </Text>
                        <Text strong style={{ color: '#389e0d' }}>
                            Rs. {record.selling_price.toFixed(2)}
                        </Text>
                    </div>
                    <div>
                        <Text type="secondary">Buying: </Text>
                        <Text strong style={{ color: '#cf1322' }}>
                            Rs. {record.buying_price.toFixed(2)}
                        </Text>
                    </div>
                </div>
            ),
        },
        {
            title: 'Purchase Info',
            key: 'purchase',
            render: (_, record) => (
                <div>
                    <Text type="secondary">Date: </Text>
                    <Text>{dayjs(record.purchase_date).format('YYYY-MM-DD')}</Text>
                    <br />
                    <Text type="secondary">Supplier: </Text>
                    <Tag color="blue">{record.supplier}</Tag>
                </div>
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
                            style={{ borderRadius: '50%' }}
                        />
                    </Tooltip>
                    <Tooltip title="Usage History">
                        <Button
                            icon={<HistoryOutlined />}
                            onClick={() => handleViewHistory(record)}
                            style={{ borderRadius: '50%' }}
                        />
                    </Tooltip>
                </Space>
            ),
        },
    ];

    const lowStockColumns = [
        {
            title: 'Item Details',
            dataIndex: 'item_name',
            key: 'item_name',
            render: (text, record) => (
                <div>
                    <Text strong>{text}</Text>
                    <br />
                    <Text type="secondary">{record.brand} - {record.category}</Text>
                </div>
            ),
        },
        {
            title: 'Current Stock',
            dataIndex: 'total_quantity',
            key: 'total_quantity',
            render: (quantity) => (
                <Badge
                    count={quantity || 0}
                    style={{
                        backgroundColor: '#ff4d4f',
                        color: 'white',
                    }}
                />
            ),
        },
        {
            title: 'Restock Level',
            dataIndex: 'restock_level',
            key: 'restock_level',
        },
        {
            title: 'Action',
            key: 'action',
            render: (_, record) => (
                <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    onClick={() => {
                        setSelectedStock(null);
                        form.setFieldsValue({
                            item_id: record.item_id
                        });
                        setModalVisible(true);
                    }}
                >
                    Add Stock
                </Button>
            ),
        },
    ];

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="min-h-screen bg-gray-50 py-8"
        >
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="mb-8">
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.2 }}
                    >
                        <Title level={2}>Stock Management</Title>
                        <Text type="secondary">
                            Track and manage your inventory stock levels
                        </Text>
                    </motion.div>
                </div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                >
                    <Row gutter={16} className="mb-6">
                        <Col xs={24} sm={12} md={6}>
                            <Card>
                                <Statistic
                                    title="Total Stock Items"
                                    value={stats.totalStock}
                                    prefix={<ShoppingCartOutlined />}
                                    valueStyle={{ color: '#1890ff' }}
                                />
                            </Card>
                        </Col>
                        <Col xs={24} sm={12} md={6}>
                            <Card>
                                <Statistic
                                    title="Low Stock Items"
                                    value={stats.lowStockCount}
                                    prefix={<WarningOutlined />}
                                    valueStyle={{ color: '#ff4d4f' }}
                                />
                            </Card>
                        </Col>
                        <Col xs={24} sm={12} md={6}>
                            <Card>
                                <Statistic
                                    title="Total Stock Value"
                                    value={stats.totalValue.toFixed(2)}
                                    prefix={<DollarOutlined />}
                                    valueStyle={{ color: '#52c41a' }}
                                />
                            </Card>
                        </Col>
                        <Col xs={24} sm={12} md={6}>
                            <Card>
                                <Statistic
                                    title="Average Price"
                                    value={stats.averagePrice.toFixed(2)}
                                    prefix={<ShopOutlined />}
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
                    <Card className="shadow-sm">
                        <Tabs defaultActiveKey="1">
                            <TabPane
                                tab={
                                    <span>
                                        <ShoppingCartOutlined />
                                        All Stock
                                    </span>
                                }
                                key="1"
                            >
                                <div className="flex justify-between items-center mb-6">
                                    <div />
                                    <Button
                                        type="primary"
                                        icon={<PlusOutlined />}
                                        onClick={handleAdd}
                                        size="large"
                                        style={{
                                            background: '#1890ff',
                                            borderRadius: '8px',
                                            boxShadow: '0 2px 4px rgba(24,144,255,0.35)'
                                        }}
                                    >
                                        Add New Stock
                                    </Button>
                                </div>

                                <Table
                                    columns={columns}
                                    dataSource={stocks}
                                    rowKey="stock_id"
                                    loading={loading}
                                    pagination={{
                                        pageSize: 10,
                                        showSizeChanger: true,
                                        showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} stock items`
                                    }}
                                />
                            </TabPane>
                            <TabPane
                                tab={
                                    <span>
                                        <AlertOutlined />
                                        Low Stock Items
                                    </span>
                                }
                                key="2"
                            >
                                <Alert
                                    message="Low Stock Warning"
                                    description="These items are at or below their restock levels and need attention."
                                    type="warning"
                                    showIcon
                                    className="mb-4"
                                />
                                <Table
                                    columns={lowStockColumns}
                                    dataSource={lowStockItems}
                                    rowKey="item_id"
                                    pagination={false}
                                />
                            </TabPane>
                        </Tabs>
                    </Card>
                </motion.div>

                <Modal
                    title={
                        <div style={{ textAlign: 'center', margin: '12px 0' }}>
                            <Title level={3}>{selectedStock ? 'Edit Stock' : 'Add New Stock'}</Title>
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
                            <Select
                                size="large"
                                disabled={!!selectedStock}
                                showSearch
                                optionFilterProp="children"
                            >
                                {items.map(item => (
                                    <Option key={item.item_id} value={item.item_id}>
                                        {item.item_name} - {item.brand} ({item.category})
                                    </Option>
                                ))}
                            </Select>
                        </Form.Item>

                        <Form.Item
                            name="quantity_available"
                            label="Quantity Available"
                            rules={[{ required: true, message: 'Please enter quantity' }]}
                        >
                            <InputNumber min={0} size="large" style={{ width: '100%' }} />
                        </Form.Item>

                        <Form.Item
                            name="selling_price"
                            label="Selling Price"
                            rules={[{ required: true, message: 'Please enter selling price' }]}
                        >
                            <InputNumber
                                min={0}
                                size="large"
                                style={{ width: '100%' }}
                                prefix="Rs."
                                step={0.01}
                            />
                        </Form.Item>

                        {!selectedStock && (
                            <Form.Item
                                name="purchase_id"
                                label="Link to Purchase"
                                extra="Optional: Link this stock to an existing purchase"
                            >
                                <Select
                                    size="large"
                                    allowClear
                                    showSearch
                                    optionFilterProp="children"
                                >
                                    {purchases.map(purchase => (
                                        <Option key={purchase.purchase_id} value={purchase.purchase_id}>
                                            {purchase.item_name} - {dayjs(purchase.purchase_date).format('YYYY-MM-DD')} (Rs. {purchase.buying_price})
                                        </Option>
                                    ))}
                                </Select>
                            </Form.Item>
                        )}
                    </Form>
                </Modal>

                <Drawer
                    title={
                        <div>
                            <Title level={4}>Stock Usage History</Title>
                            {selectedStock && (
                                <Text type="secondary">
                                    {selectedStock.item_name} - {selectedStock.brand}
                                </Text>
                            )}
                        </div>
                    }
                    placement="right"
                    width={600}
                    onClose={() => setHistoryDrawerVisible(false)}
                    open={historyDrawerVisible}
                >
                    {usageHistory.length > 0 ? (
                        usageHistory.map((record) => (
                            <Card 
                                key={`${record.service_id}-${record.stock_id}`} 
                                style={{ marginBottom: 16 }}
                            >
                                <div>
                                    <Text strong>Service Date: </Text>
                                    <Text>{dayjs(record.service_date).format('YYYY-MM-DD')}</Text>
                                </div>
                                <div>
                                    <Text strong>Vehicle: </Text>
                                    <Text>{record.vehicle_number} ({record.make} {record.model})</Text>
                                </div>
                                <div>
                                    <Text strong>Quantity Used: </Text>
                                    <Badge count={record.quantity_used} style={{ backgroundColor: '#1890ff' }} />
                                </div>
                                <div>
                                    <Text strong>Service Description: </Text>
                                    <Text>{record.service_description}</Text>
                                </div>
                            </Card>
                        ))
                    ) : (
                        <Empty description="No usage history found" />
                    )}
                </Drawer>
            </div>
        </motion.div>
    );
};

export default AdminStock; 