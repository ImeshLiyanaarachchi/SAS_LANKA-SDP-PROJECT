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
    Space,
    Card,
    Typography,
    InputNumber,
    Tooltip,
    Drawer,
    Descriptions,
    Empty,
    Row,
    Col,
    Alert
} from 'antd';
import {
    CarOutlined,
    HistoryOutlined,
    SettingOutlined,
    PlusOutlined
} from '@ant-design/icons';
import { motion } from 'framer-motion';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { TextArea } = Input;

const CustomerVehicleProfiles = () => {
    const navigate = useNavigate();
    const [vehicles, setVehicles] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [modalVisible, setModalVisible] = useState(false);
    const [selectedVehicle, setSelectedVehicle] = useState(null);
    const [form] = Form.useForm();

    // Animation variants
    const fadeIn = {
        hidden: { opacity: 0, y: 20 },
        visible: { 
            opacity: 1, 
            y: 0,
            transition: { duration: 0.6 }
        }
    };

    // Authentication check and fetch vehicles on mount
    useEffect(() => {
        const checkAuth = async () => {
            try {
                const user = JSON.parse(localStorage.getItem('user'));
                if (!user) {
                    console.log('No user found in localStorage');
                    navigate('/login');
                    return;
                }
                console.log('User found in localStorage:', user);
                
                // If we have user data, fetch vehicles
                fetchVehicles(user.id);
            } catch (error) {
                console.error('Auth check error:', error);
                localStorage.removeItem('user');
                navigate('/login');
            }
        };

        checkAuth();
    }, []);

    const fetchVehicles = async (userId) => {
        try {
            setLoading(true);
            setError('');
            console.log('Fetching vehicles for user:', userId);

            const response = await axios.get(`http://localhost:3000/api/vehicle-profiles/user/${userId}`, {
                withCredentials: true,
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            console.log('Vehicles fetched successfully:', response.data);
            setVehicles(response.data);
        } catch (error) {
            console.error('Error fetching vehicles:', error);
            if (error.response?.status === 401 || error.response?.status === 403) {
                console.log('Unauthorized/Forbidden - redirecting to login');
                localStorage.removeItem('user');
                navigate('/login');
            } else {
                setError(`Failed to fetch vehicles: ${error.response?.data?.message || error.message}`);
            }
        } finally {
            setLoading(false);
        }
    };

    const handleViewHistory = (record) => {
        navigate(`/vehicle-service-records/${record.vehicle_number}`);
    };

    const handleModalOk = async () => {
        try {
            setError('');
            const values = await form.validateFields();
            
            await axios.put(`http://localhost:3000/api/vehicle-profiles/${selectedVehicle.vehicle_number}`, values, {
                withCredentials: true,
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            setSuccess('Vehicle profile updated successfully');
            setModalVisible(false);
            const user = JSON.parse(localStorage.getItem('user'));
            fetchVehicles(user.user_id);
        } catch (error) {
            console.error('Error updating vehicle:', error);
            if (error.response?.status === 401 || error.response?.status === 403) {
                localStorage.removeItem('user');
                navigate('/login');
            } else {
                setError(error.response?.data?.message || 'Failed to update vehicle');
            }
        }
    };

    return (
        <div className="min-h-screen text-lg">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
                <motion.div 
                    initial="hidden"
                    animate="visible"
                    variants={fadeIn}
                    className="mb-12 text-center"
                >
                    <h1 className="text-4xl font-bold text-white mb-4">My Vehicles</h1>
                    <p className="mt-2 text-xl text-gray-300">
                        View and manage your registered vehicles
                    </p>
                </motion.div>

                {error && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mb-8"
                    >
                        <Alert
                            message="Error"
                            description={error}
                            type="error"
                            showIcon
                            closable
                            onClose={() => setError('')}
                            className="bg-red-900/30 text-red-400 border border-red-500/30"
                        />
                    </motion.div>
                )}

                {success && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mb-8"
                    >
                        <Alert
                            message="Success"
                            description={success}
                            type="success"
                            showIcon
                            closable
                            onClose={() => setSuccess('')}
                            className="bg-green-900/30 text-green-400 border border-green-500/30"
                        />
                    </motion.div>
                )}

                <motion.div
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true }}
                    variants={fadeIn}
                    className="mb-12"
                >
                    <Card 
                        className="bg-[#0a0b1e] border-0 rounded-xl shadow-xl overflow-hidden"
                        styles={{
                            body: { 
                                padding: '0',
                                backgroundColor: '#0a0b1e'
                            }
                        }}
                    >
                        <div className="p-6 bg-[#141852] rounded-lg m-4 shadow-inner">
                            {/* Table Header */}
                            <div className="grid grid-cols-5 bg-[#1a1b4b] text-white py-4 px-6 rounded-t-lg font-semibold" style={{ fontSize: '19px' }}>
                                <div>Vehicle Number</div>
                                <div>Make</div>
                                <div>Model</div>
                                <div>YOM</div>
                                <div>Actions</div>
                            </div>
                            
                            {vehicles.length > 0 ? (
                                vehicles.map(vehicle => (
                                    <div key={vehicle.vehicle_number} className="grid grid-cols-5 bg-[#141852] py-5 px-6 border-b border-[#222a5f] text-white" style={{ fontSize: '19px' }}>
                                        <div className="font-semibold text-white">{vehicle.vehicle_number}</div>
                                        <div>{vehicle.make}</div>
                                        <div>{vehicle.model}</div>
                                        <div>{vehicle.year_of_manuf}</div>
                                        <div>
                                            <Space size="middle">
                                                <Tooltip title="Service History">
                                                    <Button
                                                        icon={<HistoryOutlined />}
                                                        onClick={() => handleViewHistory(vehicle)}
                                                        size="large"
                                                        className="bg-[#1a1b4b] hover:bg-[#282a6d] text-white border-0 shadow-md"
                                                        style={{ width: "42px", height: "42px", borderRadius: '8px' }}
                                                    />
                                                </Tooltip>
                                            </Space>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="bg-[#141852] py-16 text-center rounded-b-lg">
                                    <Empty
                                        description={
                                            <div className="text-gray-300" style={{ fontSize: '19px' }}>
                                                No vehicles registered yet. Please visit our service center to register your vehicle.
                                            </div>
                                        }
                                        image={Empty.PRESENTED_IMAGE_SIMPLE}
                                        className="text-gray-300"
                                    />
                                </div>
                            )}
                        </div>
                    </Card>
                </motion.div>

                <Modal
                    title={
                        <div className="text-center py-3">
                            <Title level={3} className="text-gray-100 text-2xl">Edit Vehicle Details</Title>
                            <Text className="text-gray-400" style={{ fontSize: '19px' }}>
                                {selectedVehicle?.vehicle_number} - {selectedVehicle?.make} {selectedVehicle?.model}
                            </Text>
                        </div>
                    }
                    open={modalVisible}
                    onOk={handleModalOk}
                    onCancel={() => setModalVisible(false)}
                    width={800}
                    centered
                    styles={{ 
                        content: { 
                            backgroundColor: '#12133a',
                            borderRadius: '12px' 
                        },
                        header: { 
                            backgroundColor: '#12133a',
                            borderBottom: '1px solid #252761',
                            padding: '16px'
                        },
                        body: { 
                            padding: '24px',
                            fontSize: '19px' 
                        },
                        footer: { 
                            backgroundColor: '#0d0e24',
                            borderTop: '1px solid #252761',
                            padding: '16px 24px'
                        }
                    }}
                    okButtonProps={{ 
                        style: { 
                            backgroundColor: '#059669',
                            borderColor: '#059669',
                            fontSize: '19px',
                            height: '40px',
                            borderRadius: '8px'
                        } 
                    }}
                    cancelButtonProps={{ 
                        style: { 
                            fontSize: '19px',
                            height: '40px',
                            borderRadius: '8px'
                        } 
                    }}
                >
                    <Form
                        form={form}
                        layout="vertical"
                        className="text-white"
                    >
                        <Row gutter={24}>
                            <Col span={8}>
                                <Form.Item
                                    name="make"
                                    label={<span className="text-white" style={{ fontSize: '19px' }}>Make</span>}
                                    rules={[{ required: true, message: 'Please enter make' }]}
                                >
                                    <Input 
                                        placeholder="e.g., Toyota" 
                                        className="py-2 bg-[#0d0e24] border-gray-700 text-white rounded-lg"
                                        style={{ fontSize: '19px' }}
                                    />
                                </Form.Item>
                            </Col>
                            <Col span={8}>
                                <Form.Item
                                    name="model"
                                    label={<span className="text-white" style={{ fontSize: '19px' }}>Model</span>}
                                    rules={[{ required: true, message: 'Please enter model' }]}
                                >
                                    <Input 
                                        placeholder="e.g., Corolla" 
                                        className="py-2 bg-[#0d0e24] border-gray-700 text-white rounded-lg"
                                        style={{ fontSize: '19px' }}
                                    />
                                </Form.Item>
                            </Col>
                            <Col span={8}>
                                <Form.Item
                                    name="year_of_manuf"
                                    label={<span className="text-white" style={{ fontSize: '19px' }}>Year</span>}
                                    rules={[{ required: true, message: 'Please enter year' }]}
                                >
                                    <InputNumber
                                        style={{ width: '100%', fontSize: '19px' }}
                                        min={1900}
                                        max={new Date().getFullYear()}
                                        className="py-2 bg-[#0d0e24] border-gray-700 text-white rounded-lg"
                                    />
                                </Form.Item>
                            </Col>
                        </Row>

                        <Row gutter={24}>
                            <Col span={12}>
                                <Form.Item
                                    name="engine_details"
                                    label={<span className="text-white" style={{ fontSize: '19px' }}>Engine Details</span>}
                                    rules={[{ required: true, message: 'Please enter engine details' }]}
                                >
                                    <TextArea
                                        placeholder="e.g., 2.0L 4-cylinder DOHC"
                                        autoSize={{ minRows: 2, maxRows: 4 }}
                                        className="py-2 bg-[#0d0e24] border-gray-700 text-white rounded-lg"
                                        style={{ fontSize: '19px' }}
                                    />
                                </Form.Item>
                            </Col>
                            <Col span={12}>
                                <Form.Item
                                    name="transmission_details"
                                    label={<span className="text-white" style={{ fontSize: '19px' }}>Transmission Details</span>}
                                    rules={[{ required: true, message: 'Please enter transmission details' }]}
                                >
                                    <TextArea
                                        placeholder="e.g., 6-speed automatic"
                                        autoSize={{ minRows: 2, maxRows: 4 }}
                                        className="py-2 bg-[#0d0e24] border-gray-700 text-white rounded-lg"
                                        style={{ fontSize: '19px' }}
                                    />
                                </Form.Item>
                            </Col>
                        </Row>

                        <Row gutter={24}>
                            <Col span={8}>
                                <Form.Item
                                    name="vehicle_colour"
                                    label={<span className="text-white" style={{ fontSize: '19px' }}>Color</span>}
                                    rules={[{ required: true, message: 'Please enter color' }]}
                                >
                                    <Input 
                                        placeholder="e.g., Silver" 
                                        className="py-2 bg-[#0d0e24] border-gray-700 text-white rounded-lg"
                                        style={{ fontSize: '19px' }}
                                    />
                                </Form.Item>
                            </Col>
                            <Col span={16}>
                                <Form.Item
                                    name="vehicle_features"
                                    label={<span className="text-white" style={{ fontSize: '19px' }}>Features</span>}
                                >
                                    <TextArea
                                        placeholder="e.g., Leather seats, Sunroof, Navigation"
                                        autoSize={{ minRows: 2, maxRows: 4 }}
                                        className="py-2 bg-[#0d0e24] border-gray-700 text-white rounded-lg"
                                        style={{ fontSize: '19px' }}
                                    />
                                </Form.Item>
                            </Col>
                        </Row>

                        <Row gutter={24}>
                            <Col span={12}>
                                <Form.Item
                                    name="condition_"
                                    label={<span className="text-white" style={{ fontSize: '19px' }}>Condition</span>}
                                    rules={[{ required: true, message: 'Please enter condition' }]}
                                >
                                    <TextArea
                                        placeholder="e.g., Good condition, regular maintenance"
                                        autoSize={{ minRows: 2, maxRows: 4 }}
                                        className="py-2 bg-[#0d0e24] border-gray-700 text-white rounded-lg"
                                        style={{ fontSize: '19px' }}
                                    />
                                </Form.Item>
                            </Col>
                            <Col span={12}>
                                <Form.Item
                                    name="owner_"
                                    label={<span className="text-white" style={{ fontSize: '19px' }}>Owner Details</span>}
                                    rules={[{ required: true, message: 'Please enter owner details' }]}
                                >
                                    <TextArea
                                        placeholder="e.g., First owner, all service records available"
                                        autoSize={{ minRows: 2, maxRows: 4 }}
                                        className="py-2 bg-[#0d0e24] border-gray-700 text-white rounded-lg"
                                        style={{ fontSize: '19px' }}
                                    />
                                </Form.Item>
                            </Col>
                        </Row>
                    </Form>
                </Modal>
            </div>

            {/* Footer */}
            <footer className="bg-[#080919] text-white py-12 mt-10">
                <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center">
                    <p className="text-gray-400" style={{ fontSize: '19px' }}>&copy; 2024 SAS Lanka Service Centre. All rights reserved.</p>
                </div>
            </footer>
        </div>
    );
};

export default CustomerVehicleProfiles; 