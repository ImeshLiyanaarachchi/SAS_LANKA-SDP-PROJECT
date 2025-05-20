import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate, useParams } from 'react-router-dom';
import {
    Button,
    Modal,
    Form,
    Input,
    Space,
    Card,
    Typography,
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
    Table,
    Spin
} from 'antd';
import {
    PlusOutlined,
    EditOutlined,
    DeleteOutlined,
    ToolOutlined,
    ArrowLeftOutlined,
    FileTextOutlined,
    FilePdfOutlined
} from '@ant-design/icons';
import { motion } from 'framer-motion';
import dayjs from 'dayjs';
import { toast } from 'react-toastify';

const { Title, Text } = Typography;
const { TextArea } = Input;
const { Option } = Select;

// Custom styles moved to bottom of file

const AdminServiceRecordDetail = () => {
    const navigate = useNavigate();
    const { recordId } = useParams();
    const [loading, setLoading] = useState(true);
    const [serviceRecord, setServiceRecord] = useState(null);
    const [inventoryItems, setInventoryItems] = useState([]);
    const [stockBatches, setStockBatches] = useState({});
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [partsDrawerVisible, setPartsDrawerVisible] = useState(false);
    const [invoiceModalVisible, setInvoiceModalVisible] = useState(false);
    const [partsForm] = Form.useForm();
    const [partsLoading, setPartsLoading] = useState(false);
    const [token, setToken] = useState('');
    const [deletingPart, setDeletingPart] = useState(false);

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
                setToken(token);

                try {
                    setLoading(true);
                    await Promise.all([
                        fetchServiceRecord(token),
                        fetchInventoryItems(token)
                    ]);
                } catch (error) {
                    console.error('Error fetching initial data:', error);
                    if (error.response?.status === 401 || error.response?.status === 403) {
                        navigate('/login');
                    }
                    setError('Failed to fetch service record data');
                } finally {
                    setLoading(false);
                }
            } catch (error) {
                console.error('Auth check error:', error);
                navigate('/login');
            }
        };

        checkAuth();
    }, [navigate, recordId]);

    const fetchServiceRecord = async (authToken) => {
        try {
            const response = await axios.get(`http://localhost:3000/api/service-records/${recordId}`, {
                withCredentials: true,
                headers: {
                    'Authorization': `Bearer ${authToken || token}`,
                    'Content-Type': 'application/json'
                }
            });
            setServiceRecord(response.data);
        } catch (error) {
            console.error('Error fetching service record:', error);
            if (error.response?.status === 401 || error.response?.status === 403) {
                navigate('/login');
                return;
            }
            toast.error('Failed to fetch service record details');
            throw error;
        }
    };

    const fetchInventoryItems = async (authToken) => {
        try {
            // Fetch inventory items 
            const response = await axios.get('http://localhost:3000/api/inventory-items', {
                withCredentials: true,
                headers: {
                    'Authorization': `Bearer ${authToken || token}`,
                    'Content-Type': 'application/json'
                }
            });
            
            setInventoryItems(response.data);
            
            // After getting items, fetch stock details for each item
            const items = response.data;
            const batches = {};
            
            for (const item of items) {
                if (item.total_quantity > 0) {
                    try {
                        const stockResponse = await axios.get(`http://localhost:3000/api/inventory-releases/stock-status/${item.item_id}`, {
                            withCredentials: true,
                            headers: {
                                'Authorization': `Bearer ${authToken || token}`,
                                'Content-Type': 'application/json'
                            }
                        });
                        
                        batches[item.item_id] = stockResponse.data.stock_entries;
                    } catch (err) {
                        console.error(`Error fetching stock for item ${item.item_id}:`, err);
                    }
                }
            }
            
            setStockBatches(batches);
        } catch (error) {
            console.error('Error fetching inventory items:', error);
            if (error.response?.status === 401 || error.response?.status === 403) {
                navigate('/login');
                return;
            }
            toast.error('Failed to fetch inventory items');
            throw error;
        }
    };

    const handleViewInvoice = () => {
        if (serviceRecord.invoice || serviceRecord.status === 'completed') {
            // Show existing invoice
            setInvoiceModalVisible(true);
        } else {
            // Open parts drawer to add service charge and generate invoice
            partsForm.resetFields();
            
            // Set default service charge to 0 or existing value, ensure it's a number
            const initialServiceCharge = serviceRecord.invoice 
                ? parseFloat(serviceRecord.invoice.service_charge || 0) 
                : 0;
                
            partsForm.setFieldsValue({ 
                service_charge: initialServiceCharge,
                parts: []
            });
            
            setPartsDrawerVisible(true);
            
            // Scroll to service charge section
            setTimeout(() => {
                const serviceChargeSection = document.querySelector('.mb-4 .ant-input-number');
                if (serviceChargeSection) {
                    serviceChargeSection.focus();
                    serviceChargeSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            }, 300);
            
            // If there are parts but no invoice, show a specific message
            if (serviceRecord.parts_used && serviceRecord.parts_used.length > 0) {
                toast.info('Please enter service charge to generate the invoice');
            } else {
                toast.info('Please add parts and/or service charge to generate an invoice');
            }
        }
    };

    const handleServiceChargeSubmit = async () => {
        try {
            const values = await partsForm.validateFields(['service_charge']);
            
            setPartsLoading(true);

            // Make sure service_charge is a number, not a string
            const serviceCharge = parseFloat(values.service_charge || 0);
            
            // Use the dedicated invoice generation endpoint
            const payload = {
                service_charge: serviceCharge
            };

            console.log('Generating invoice for record:', recordId, payload);

            const response = await axios.post(
                `http://localhost:3000/api/service-records/${recordId}/generate-invoice`,
                payload,
                {
                    withCredentials: true,
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            console.log('Invoice generation response:', response.data);
            
            toast.success('Invoice generated successfully');
            await fetchServiceRecord(token);
            setPartsDrawerVisible(false);
            partsForm.resetFields();
            setInvoiceModalVisible(true);
        } catch (error) {
            console.error('Error generating invoice:', error);
            if (error.response?.status === 401 || error.response?.status === 403) {
                navigate('/login');
                return;
            }
            
            // Detailed error information for debugging
            if (error.response) {
                console.error('Error response data:', error.response.data);
                console.error('Error response status:', error.response.status);
                console.error('Error response headers:', error.response.headers);
                
                // Show more descriptive error message
                toast.error(error.response.data?.message || 'API error: ' + error.response.status);
            } else {
                toast.error(error.message || 'Failed to generate invoice');
            }
        } finally {
            setPartsLoading(false);
        }
    };

    const handleAddParts = () => {
        // Don't allow adding parts if the service record is completed
        if (serviceRecord.status === 'completed') {
            toast.error('This service record is already completed and cannot be modified');
            return;
        }
        
        partsForm.resetFields();
        setPartsDrawerVisible(true);
        setError(''); // Clear any existing errors
        
        // Set default service charge to 0 or existing value, ensure it's a number
        const initialServiceCharge = serviceRecord.invoice 
            ? parseFloat(serviceRecord.invoice.service_charge || 0) 
            : 0;
            
        partsForm.setFieldsValue({ 
            service_charge: initialServiceCharge,
            parts: []
        });
        
        // Focus to the first field of parts input
        setTimeout(() => {
            const addPartButton = document.querySelector('.ant-btn-dashed');
            if (addPartButton) {
                addPartButton.focus();
            }
        }, 300);
    };

    const handlePartsSubmit = async (generateInvoice = false) => {
        try {
            const values = await partsForm.validateFields();
            
            if (!values.parts || values.parts.length === 0) {
                // If no parts added but we want to generate invoice, proceed with service charge only
                if (generateInvoice) {
                    return handleServiceChargeSubmit();
                } else {
                    toast.error('Please add at least one part');
                    return;
                }
            }

            setPartsLoading(true);

            // Format parts data according to our backend requirements
            // Restructure to handle FIFO batches
            let formattedParts = [];
            
            for (const part of values.parts) {
                const itemId = part.item_id;
                let remainingQuantity = parseInt(part.quantity, 10);
                
                // Get available batches for this item sorted by purchase date (FIFO)
                const availableBatches = stockBatches[itemId] || [];
                
                // Allocate quantity across batches (FIFO)
                for (const batch of availableBatches) {
                    if (remainingQuantity <= 0) break;
                    
                    const quantityFromBatch = Math.min(remainingQuantity, batch.available_qty);
                    if (quantityFromBatch <= 0) continue;
                    
                    formattedParts.push({
                        item_id: itemId,
                        stock_id: batch.stock_id,
                        quantity: quantityFromBatch
                    });
                    
                    remainingQuantity -= quantityFromBatch;
                }
                
                if (remainingQuantity > 0) {
                    // Not enough stock across all batches
                    throw new Error(`Not enough stock available for item ${
                        inventoryItems.find(i => i.item_id === itemId)?.item_name || 'Unknown'
                    }`);
                }
            }

            // Parts-only payload (no service charge)
            const payload = {
                parts_used: formattedParts
            };

            console.log('Adding parts for record:', recordId, payload);

            const response = await axios.post(
                `http://localhost:3000/api/service-records/${recordId}/add-parts`,
                payload,
                {
                    withCredentials: true,
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            console.log('Parts addition response:', response.data);

            toast.success('Parts added successfully');
            await fetchServiceRecord(token);
            
            // Now, decide if we should also generate an invoice
            if (generateInvoice) {
                // Close the parts drawer first to avoid UI confusion
                setPartsDrawerVisible(false);
                partsForm.resetFields();
                
                // Generate invoice
                return handleServiceChargeSubmit();
            } else {
                setPartsDrawerVisible(false);
                partsForm.resetFields();
            }
        } catch (error) {
            console.error('Error adding parts:', error);
            if (error.response?.status === 401 || error.response?.status === 403) {
                navigate('/login');
                return;
            }
            toast.error(error.message || error.response?.data?.message || 'Failed to add parts');
        } finally {
            setPartsLoading(false);
        }
    };

    // Function to preview how quantity will be allocated across batches
    const previewBatchAllocation = (itemId, quantity) => {
        if (!itemId || !quantity || quantity <= 0) return [];
        
        const availableBatches = stockBatches[itemId] || [];
        const allocations = [];
        let remainingQuantity = quantity;
        
        for (const batch of availableBatches) {
            if (remainingQuantity <= 0) break;
            
            const quantityFromBatch = Math.min(remainingQuantity, batch.available_qty);
            if (quantityFromBatch <= 0) continue;
            
            allocations.push({
                stock_id: batch.stock_id,
                quantity: quantityFromBatch,
                purchase_date: batch.purchase_date,
                selling_price: batch.selling_price,
                available_qty: batch.available_qty
            });
            
            remainingQuantity -= quantityFromBatch;
        }
        
        return allocations;
    };

    // Check if we can fulfill the requested quantity
    const canFulfillQuantity = (itemId, quantity) => {
        if (!itemId || !quantity || quantity <= 0) return false;
        
        const availableBatches = stockBatches[itemId] || [];
        let totalAvailable = 0;
        
        for (const batch of availableBatches) {
            totalAvailable += batch.available_qty;
        }
        
        return totalAvailable >= quantity;
    };

    // Handle deletion of a part
    const handleDeletePart = async (itemId, stockId) => {
        try {
            setDeletingPart(true);
            await axios.delete(
                `http://localhost:3000/api/service-records/${recordId}/parts/${itemId}/${stockId}`,
                {
                    withCredentials: true,
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                }
            );
            
            toast.success('Part removed successfully');
            await fetchServiceRecord(token);
        } catch (error) {
            console.error('Error deleting part:', error);
            if (error.response?.status === 401 || error.response?.status === 403) {
                toast.error('Authentication error. Please log in again.');
                navigate('/login');
                return;
            }
            toast.error(error.message || error.response?.data?.message || 'Failed to remove part');
        } finally {
            setDeletingPart(false);
        }
    };

    if (loading) {
        return (
            <div className="loading-container">
                <Spin size="large" />
                <p>Loading service record data...</p>
            </div>
        );
    }

    if (!serviceRecord) {
        return (
            <div style={lightThemeStyles.page}>
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <Alert
                        message="Error"
                        description="Service record not found"
                        type="error"
                        showIcon
                    />
                    <Button 
                        type="primary" 
                        onClick={() => {
                            const user = JSON.parse(localStorage.getItem('user'));
                            const basePath = user.role === "technician" ? "/technician" : "/admin";
                            navigate(`${basePath}/service-records`);
                        }}
                        icon={<ArrowLeftOutlined />}
                        className="action-button"
                        style={{ marginTop: 16 }}
                    >
                        Back to Service Records
                    </Button>
                </div>
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
            <div className="max-w-8xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="mb-8 flex justify-between items-center">
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.2 }}
                    >
                        <Title level={2} className="page-title">
                             Service Record Details
                        </Title>
                    </motion.div>
                    <Button 
                        type="primary" 
                        onClick={() => navigate('/admin/service-records')}
                        icon={<ArrowLeftOutlined />}
                        className="action-button"
                    >
                        Back to Service Records
                    </Button>
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

                {success && (
                    <Alert
                        message="Success"
                        description={success}
                        type="success"
                        showIcon
                        closable
                        onClose={() => setSuccess('')}
                        className="mb-4"
                    />
                )}

                <Card className="mb-8 content-card">
                    <Descriptions 
                        title={<Text className="section-title">Service Information</Text>} 
                        bordered
                        className="details-descriptions"
                        column={{ xxl: 3, xl: 3, lg: 3, md: 2, sm: 1, xs: 1 }}
                    >
                        <Descriptions.Item label="Service ID" span={3}>
                            #{serviceRecord.record_id}
                        </Descriptions.Item>
                        <Descriptions.Item label="Status" span={3}>
                            <Tag color={serviceRecord.status === 'completed' ? 'green' : 'orange'} style={{ fontSize: '16px', padding: '4px 8px' }}>
                                {serviceRecord.status === 'completed' ? 'Completed' : 'Pending'}
                            </Tag>
                        </Descriptions.Item>
                        <Descriptions.Item label="Vehicle" span={3}>
                            {serviceRecord.vehicle_number} - {serviceRecord.make} {serviceRecord.model}
                        </Descriptions.Item>
                        <Descriptions.Item label="Owner" span={3}>
                            {serviceRecord.owner_}
                        </Descriptions.Item>
                        <Descriptions.Item label="Service Description" span={3}>
                            {serviceRecord.service_description}
                        </Descriptions.Item>
                        <Descriptions.Item label="Service Date">
                            {dayjs(serviceRecord.date_).format('YYYY-MM-DD')}
                        </Descriptions.Item>
                        <Descriptions.Item label="Mileage">
                            {serviceRecord.millage} km
                        </Descriptions.Item>
                        <Descriptions.Item label="Next Service Date">
                            {serviceRecord.next_service_date 
                                ? dayjs(serviceRecord.next_service_date).format('YYYY-MM-DD') 
                                : 'Not specified'}
                        </Descriptions.Item>
                    </Descriptions>

                    <Divider />

                    <div className="flex justify-between items-center">
                        <Title level={4} className="section-title">
                            <span>Parts Used</span>
                            <Badge 
                                count={serviceRecord.parts_used?.length || 0} 
                                style={{ marginLeft: '10px' }}
                            />
                        </Title>
                        {serviceRecord.status !== 'completed' && (
                            <Space>
                                <Button
                                    type="primary"
                                    icon={<ToolOutlined />}
                                    onClick={handleAddParts}
                                    className="action-button"
                                >
                                    Add/Edit Parts
                                </Button>
                            </Space>
                        )}
                    </div>

                    {serviceRecord.parts_used && serviceRecord.parts_used.length > 0 ? (
                        <Table 
                            dataSource={serviceRecord.parts_used}
                            rowKey={(record) => `${record.stock_id}`}
                            pagination={false}
                            bordered
                            className="service-history-table mt-4"
                            loading={deletingPart}
                        >
                            <Table.Column title="Part" dataIndex="item_name" />
                            <Table.Column title="Brand" dataIndex="brand" />
                            <Table.Column title="Category" dataIndex="category" />
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
                                className="total-price"
                            />
                            {serviceRecord.status !== 'completed' && (
                                <Table.Column
                                    title="Actions"
                                    key="actions"
                                    render={(_, record) => (
                                        <Popconfirm
                                            title="Delete this part?"
                                            description="This will restore the inventory and update the invoice"
                                            onConfirm={() => handleDeletePart(record.item_id, record.stock_id)}
                                            okText="Yes"
                                            cancelText="No"
                                        >
                                            <Button 
                                                danger
                                                icon={<DeleteOutlined />} 
                                                size="small"
                                                loading={deletingPart}
                                            />
                                        </Popconfirm>
                                    )}
                                />
                            )}
                        </Table>
                    ) : (
                        <Empty description="No parts used" className="my-4" image={Empty.PRESENTED_IMAGE_SIMPLE} />
                    )}

                    <Divider />

                </Card>

                <div className="flex justify-center my-8">
                    <Button 
                        type="primary" 
                        size="large"
                        icon={<FileTextOutlined />}
                        onClick={handleViewInvoice}
                        className="invoice-button"
                    >
                        {serviceRecord.status === 'completed' || serviceRecord.invoice ? 'View Invoice' : 'Enter Service Charge & Generate Invoice'}
                    </Button>
                </div>

                <Drawer
                    title={
                        <div style={{ width: '100%' }}>
                            <div className="modal-title">Add Parts & Service Charges</div>
                            <Text className="drawer-subtitle">
                                Vehicle: {serviceRecord.vehicle_number}
                            </Text>
                        </div>
                    }
                    width={850}
                    open={partsDrawerVisible}
                    onClose={() => {
                        setPartsDrawerVisible(false);
                        setError('');
                        partsForm.resetFields();
                    }}
                    closable={false} 
                    extra={
                        <Space>
                            <Button onClick={() => setPartsDrawerVisible(false)} size="large">
                                Cancel
                            </Button>
                            <Button 
                                type="primary" 
                                onClick={() => {
                                    // This button now only saves the parts without generating invoice
                                    handlePartsSubmit(false);
                                }}
                                loading={partsLoading}
                                icon={<ToolOutlined />}
                                className="action-button"
                                size="large"
                            >
                                Add Parts Only
                            </Button>
                        </Space>
                    }
                >
                    {error && (
                        <Alert
                            message="Error"
                            description={error}
                            type="error"
                            showIcon
                            style={{ marginBottom: 16 }}
                            closable
                            onClose={() => setError('')}
                        />
                    )}
                    
                    {/* Display existing parts */}
                    {serviceRecord.parts_used && serviceRecord.parts_used.length > 0 && (
                        <>
                            <Title level={4} className="section-title" style={{ marginBottom: 20 }}>
                                Existing Parts Used
                            </Title>
                            <Table 
                                dataSource={serviceRecord.parts_used}
                                rowKey={(record) => `${record.stock_id}`}
                                pagination={false}
                                bordered
                                size="middle"
                                style={{ marginBottom: 30 }}
                                loading={deletingPart}
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
                                {serviceRecord.status !== 'completed' && (
                                    <Table.Column
                                        title="Actions"
                                        key="actions"
                                        render={(_, record) => (
                                            <Popconfirm
                                                title="Delete this part?"
                                                description="This will restore the inventory and update the invoice"
                                                onConfirm={() => handleDeletePart(record.item_id, record.stock_id)}
                                                okText="Yes"
                                                cancelText="No"
                                            >
                                                <Button 
                                                    danger 
                                                    icon={<DeleteOutlined />} 
                                                    size="middle"
                                                    loading={deletingPart}
                                                />
                                            </Popconfirm>
                                        )}
                                    />
                                )}
                            </Table>
                            <Divider style={{ margin: '30px 0 20px' }}>Add New Parts</Divider>
                        </>
                    )}
                    
                    <Form 
                        form={partsForm} 
                        layout="vertical"
                        initialValues={{ 
                            parts: [], 
                            service_charge: serviceRecord.invoice ? serviceRecord.invoice.service_charge : 0 
                        }}
                    >
                        <Divider>Parts Used</Divider>
                        
                        <Form.List name="parts">
                            {(fields, { add, remove }) => (
                                <>
                                    {fields.map(({ key, name, ...restField }, index) => (
                                        <Card 
                                            key={key} 
                                            style={{ marginBottom: 16 }}
                                            className="part-card"
                                            title={<Text className="part-title">{`Part ${index + 1}`}</Text>}
                                            extra={
                                                fields.length > 0 ? (
                                                    <Button 
                                                        type="text" 
                                                        danger 
                                                        onClick={() => remove(name)}
                                                        icon={<DeleteOutlined />}
                                                    />
                                                ) : null
                                            }
                                        >
                                            <Row gutter={16}>
                                                <Col span={24}>
                                                    <Form.Item
                                                        {...restField}
                                                        name={[name, 'item_id']}
                                                        label="Select Item"
                                                        rules={[{ required: true, message: 'Please select an item' }]}
                                                    >
                                                        <Select
                                                            showSearch
                                                            placeholder="Search and select item"
                                                            optionFilterProp="children"
                                                            filterOption={(input, option) =>
                                                                option?.children?.toLowerCase().indexOf(input.toLowerCase()) >= 0
                                                            }
                                                            onChange={(value) => {
                                                                // Clear quantity when item changes
                                                                partsForm.setFieldsValue({
                                                                    parts: {
                                                                        ...partsForm.getFieldValue('parts'),
                                                                        [name]: {
                                                                            ...partsForm.getFieldValue('parts')[name],
                                                                            quantity: undefined
                                                                        }
                                                                    }
                                                                });
                                                            }}
                                                            className="item-select"
                                                        >
                                                            {inventoryItems.map(item => (
                                                                <Option 
                                                                    key={item.item_id} 
                                                                    value={item.item_id}
                                                                    disabled={item.total_quantity === 0}
                                                                >
                                                                    {item.item_name} ({item.brand}) - {item.total_quantity || 0} available
                                                                </Option>
                                                            ))}
                                                        </Select>
                                                    </Form.Item>
                                                </Col>
                                            </Row>
                                            <Form.Item
                                                {...restField}
                                                name={[name, 'quantity']}
                                                label="Quantity"
                                                rules={[
                                                    { required: true, message: 'Please enter quantity' },
                                                    {
                                                        validator: (_, value) => {
                                                            const itemId = partsForm.getFieldValue(['parts', name, 'item_id']);
                                                            
                                                            if (!value || value < 1) {
                                                                return Promise.reject('Quantity must be at least 1');
                                                            }
                                                            
                                                            if (!canFulfillQuantity(itemId, value)) {
                                                                const item = inventoryItems.find(i => i.item_id === itemId);
                                                                const availableQty = item?.total_quantity || 0;
                                                                return Promise.reject(`Only ${availableQty} units available in total`);
                                                            }
                                                            
                                                            return Promise.resolve();
                                                        }
                                                    }
                                                ]}
                                            >
                                                <InputNumber 
                                                    min={1} 
                                                    style={{ width: '100%' }}
                                                    placeholder="Enter quantity"
                                                    className="quantity-input"
                                                />
                                            </Form.Item>
                                            
                                            {/* Show batch allocation preview */}
                                            {partsForm.getFieldValue(['parts', name, 'item_id']) && 
                                             partsForm.getFieldValue(['parts', name, 'quantity']) > 0 && (
                                                <div style={{ marginTop: 8 }}>
                                                    <Divider style={{ margin: '12px 0' }}>Batch Allocation (FIFO)</Divider>
                                                    <Table
                                                        size="small"
                                                        pagination={false}
                                                        dataSource={previewBatchAllocation(
                                                            partsForm.getFieldValue(['parts', name, 'item_id']),
                                                            partsForm.getFieldValue(['parts', name, 'quantity'])
                                                        )}
                                                        rowKey="stock_id"
                                                        className="parts-table"
                                                        columns={[
                                                            {
                                                                title: 'Batch #',
                                                                dataIndex: 'stock_id',
                                                                render: (id) => `#${id}`
                                                            },
                                                            {
                                                                title: 'Purchase Date',
                                                                dataIndex: 'purchase_date',
                                                                render: (date) => dayjs(date).format('YYYY-MM-DD')
                                                            },
                                                            {
                                                                title: 'Allocated Qty',
                                                                dataIndex: 'quantity'
                                                            },
                                                            {
                                                                title: 'Available Qty',
                                                                dataIndex: 'available_qty'
                                                            },
                                                            {
                                                                title: 'Unit Price',
                                                                dataIndex: 'selling_price',
                                                                render: (price) => price ? `Rs ${Number(price).toFixed(2)}` : 'N/A',
                                                                className: "price-column"
                                                            }
                                                        ]}
                                                    />
                                                </div>
                                            )}
                                        </Card>
                                    ))}
                                    <Button
                                        type="dashed"
                                        onClick={() => add()}
                                        block
                                        icon={<PlusOutlined />}
                                        className="add-part-button"
                                        size="large"
                                    >
                                        Add Part
                                    </Button>
                                </>
                            )}
                        </Form.List>

                        <Divider>Service Charge Details</Divider>
                        <Card className="mb-4 service-card">
                            <Title level={4} className="section-title">Service Charge Details</Title>
                            <Text type="secondary" className="mb-4 block service-text">
                                Enter the service charge amount to be added to the invoice
                            </Text>
                            <Form.Item
                                name="service_charge"
                                label="Service Charge (Rs)"
                                rules={[
                                    { required: true, message: 'Please enter service charge' },
                                    { 
                                        validator: (_, value) => {
                                            if (value === undefined || value === null || value === '') {
                                                return Promise.reject('Service charge is required');
                                            }
                                            
                                            const numValue = parseFloat(value);
                                            if (isNaN(numValue)) {
                                                return Promise.reject('Service charge must be a number');
                                            }
                                            
                                            if (numValue < 0) {
                                                return Promise.reject('Service charge cannot be negative');
                                            }
                                            
                                            return Promise.resolve();
                                        } 
                                    }
                                ]}
                            >
                                <InputNumber
                                    style={{ width: '100%' }}
                                    min={0}
                                    size="large"
                                    placeholder="Enter service charge amount"
                                    addonAfter="Rs"
                                    precision={2}
                                    step={100}
                                    className="charge-input"
                                />
                            </Form.Item>
                        </Card>

                        <Divider />
                        
                        <Button 
                            type="primary" 
                            size="large"
                            block
                            onClick={() => handleServiceChargeSubmit()}
                            loading={partsLoading}
                            icon={<FileTextOutlined />}
                            className="generate-invoice-button"
                        >
                            Generate Invoice with Service Charge
                        </Button>
                    </Form>
                    
                    {inventoryItems.length === 0 && (
                        <Empty
                            description={<span style={{ fontSize: '18px' }}>No parts available in inventory</span>}
                            image={Empty.PRESENTED_IMAGE_SIMPLE}
                        />
                    )}
                </Drawer>

                <Modal
                    title={<Title level={4} className="modal-title">Invoice Details</Title>}
                    open={invoiceModalVisible}
                    onCancel={() => setInvoiceModalVisible(false)}
                    footer={[
                        <Button key="close" onClick={() => setInvoiceModalVisible(false)}>
                            Close
                        </Button>,
                        <Button 
                            key="print" 
                            type="primary" 
                            icon={<FilePdfOutlined />}
                            onClick={() => window.print()}
                            className="print-button"
                        >
                            Print Invoice
                        </Button>
                    ]}
                    width={800}
                >
                    {serviceRecord && serviceRecord.invoice && (
                        <div>
                            <Descriptions 
                                title={<Text className="section-title">Service Information</Text>} 
                                bordered
                                className="details-descriptions"
                                column={{ xxl: 3, xl: 3, lg: 3, md: 2, sm: 1, xs: 1 }}
                            >
                                <Descriptions.Item label="Invoice ID" span={3}>
                                    {serviceRecord.invoice.invoice_id}
                                </Descriptions.Item>
                                <Descriptions.Item label="Vehicle" span={3}>
                                    {serviceRecord.vehicle_number} - {serviceRecord.make} {serviceRecord.model}
                                </Descriptions.Item>
                                <Descriptions.Item label="Service Description" span={3}>
                                    {serviceRecord.service_description}
                                </Descriptions.Item>
                                <Descriptions.Item label="Service Date">
                                    {dayjs(serviceRecord.date_).format('YYYY-MM-DD')}
                                </Descriptions.Item>
                                <Descriptions.Item label="Mileage">
                                    {serviceRecord.millage} km
                                </Descriptions.Item>
                                <Descriptions.Item label="Invoice Date">
                                    {dayjs(serviceRecord.invoice.created_date).format('YYYY-MM-DD')}
                                </Descriptions.Item>
                            </Descriptions>

                            <Divider>
                                <Text className="section-title">Parts Used</Text>
                            </Divider>
                            
                            {serviceRecord.parts_used && serviceRecord.parts_used.length > 0 ? (
                                <Table 
                                    dataSource={serviceRecord.parts_used}
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
                                        className="total-price"
                                    />
                                </Table>
                            ) : (
                                <Empty 
                                    description="No parts used"
                                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                                />
                            )}

                            <Divider>
                                <Text className="section-title">Invoice Summary</Text>
                            </Divider>

                            <Descriptions 
                                bordered
                                className="details-descriptions"
                            >
                                <Descriptions.Item label="Parts Total" span={2}>
                                    Rs {serviceRecord.invoice.parts_total_price ? Number(serviceRecord.invoice.parts_total_price).toFixed(2) : '0.00'}
                                </Descriptions.Item>
                                <Descriptions.Item label="Service Charge">
                                    Rs {serviceRecord.invoice.service_charge ? Number(serviceRecord.invoice.service_charge).toFixed(2) : '0.00'}
                                </Descriptions.Item>
                                <Descriptions.Item label="Total Amount" span={3}>
                                    <Text strong className="total-price">
                                        Rs {serviceRecord.invoice.total_price ? Number(serviceRecord.invoice.total_price).toFixed(2) : '0.00'}
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
                
                .invoice-button {
                    height: 50px;
                    font-size: 18px;
                }
                
                .print-button {
                    background: #1d39c4;
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
                
                .drawer-subtitle {
                    font-size: 18px;
                    color: #666;
                    margin-top: 8px;
                    text-align: left;
                    width: 100%;
                }
                
                .part-title {
                    font-size: 19px;
                }
                
                .part-card {
                    border: 1px solid #f0f0f0;
                    border-radius: 8px;
                }
                
                .part-card .ant-card-head {
                    padding: 16px 24px;
                }
                
                .part-card .ant-card-body {
                    padding: 20px;
                }
                
                .modal-title {
                    font-size: 23px;
                    margin: 0;
                    width: 100%;
                    text-align: left;
                    font-weight: 600;
                }
                
                .total-price {
                    font-size: 19px;
                    font-weight: bold;
                    color: #52c41a;
                }
                
                .add-part-button {
                    height: 45px;
                    font-size: 18px;
                    margin-bottom: 15px;
                }
                
                .generate-invoice-button {
                    margin-top: 16px;
                    height: 55px;
                    font-size: 18px;
                }
                
                .service-text {
                    font-size: 18px;
                    color: #666;
                    display: block;
                    margin-bottom: 15px;
                }
                
                /* Drawer specific styles */
                .ant-drawer-header {
                    padding: 20px 24px;
                }
                
                .ant-drawer-header-title {
                    flex-direction: column;
                    align-items: flex-start;
                    width: 100%;
                    display: flex;
                }
                
                .ant-drawer-extra {
                    position: absolute;
                    right: 24px;
                    top: 16px;
                }
                
                .ant-drawer-title {
                    margin-bottom: 8px;
                    width: 100%;
                    text-align: left;
                }
                
                .charge-input {
                    font-size: 20px !important;
                    height: 55px;
                }
                
                .item-select, .quantity-input {
                    font-size: 18px;
                }
                
                .ant-drawer-body {
                    padding: 24px;
                }
                
                .ant-form-item-label > label {
                    font-size: 18px;
                }
                
                .ant-input-number, .ant-select {
                    font-size: 18px;
                }
                
                .ant-select-selection-item, .ant-select-item {
                    font-size: 18px;
                }
                
                .ant-btn {
                    font-size: 18px;
                }
                
                .ant-divider-inner-text {
                    font-size: 18px;
                    font-weight: 500;
                }
                
                .service-card {
                    padding: 20px;
                }
                
                .service-card .ant-card-body {
                    padding: 20px;
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

export default AdminServiceRecordDetail; 