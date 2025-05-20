import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import {Form,Input,Button,Card,Typography,Spin, Alert,Divider,Space} from 'antd';
import {UserOutlined,PhoneOutlined,MailOutlined,IdcardOutlined,LockOutlined} from '@ant-design/icons';
import { motion } from 'framer-motion';
import profileBg from '../../assets/images/bg.jpg'; // Replace with your actual image path

const { Title, Text } = Typography;

const UserProfile = () => {
    const navigate = useNavigate();
    const [form] = Form.useForm();
    const [passwordForm] = Form.useForm();

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [user, setUser] = useState(null);
    const [isEditingPassword, setIsEditingPassword] = useState(false);

    // Animation variants
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
                const userString = localStorage.getItem('user');
                if (!userString) {
                    navigate('/login');
                    return;
                }

                const user = JSON.parse(userString);
                setUser(user);

                // Fetch latest user data
                fetchUserProfile(user.id);
            } catch (error) {
                console.error('Auth check error:', error);
                localStorage.removeItem('user');
                navigate('/login');
            }
        };

        checkAuth();
    }, [navigate]);

    const fetchUserProfile = async (userId) => {
        try {
            setLoading(true);

            const response = await axios.get(`http://localhost:3000/api/users/${userId}`, {
                withCredentials: true,
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            const userData = response.data;
            setUser(userData);

            form.setFieldsValue({
                first_name: userData.first_name,
                last_name: userData.last_name,
                email: userData.email,
                phone_number: userData.phone_number,
                nic: userData.nic
            });

        } catch (error) {
            console.error('Error fetching user profile:', error);
            setError('Failed to load user profile');

            if (error.response?.status === 401 || error.response?.status === 403) {
                localStorage.removeItem('user');
                navigate('/login');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateProfile = async (values) => {
        try {
            setError('');
            setSuccess('');
            setLoading(true);

            await axios.put(`http://localhost:3000/api/users/${user.user_id}`, values, {
                withCredentials: true,
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            const updatedUser = {
                ...user,
                ...values
            };
            localStorage.setItem('user', JSON.stringify(updatedUser));

            setSuccess('Profile updated successfully');
        } catch (error) {
            console.error('Error updating profile:', error);
            setError('Failed to update profile: ' + (error.response?.data?.message || error.message));

            if (error.response?.status === 401 || error.response?.status === 403) {
                localStorage.removeItem('user');
                navigate('/login');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleUpdatePassword = async (values) => {
        try {
            setError('');
            setSuccess('');
            setLoading(true);

            if (values.new_password !== values.confirm_password) {
                setError('Passwords do not match');
                setLoading(false);
                return;
            }

            const passwordData = {
                current_password: values.current_password,
                new_password: values.new_password
            };

            await axios.put(`http://localhost:3000/api/users/${user.user_id}/password`, passwordData, {
                withCredentials: true,
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            setSuccess('Password updated successfully');
            setIsEditingPassword(false);
            passwordForm.resetFields();
        } catch (error) {
            console.error('Error updating password:', error);
            setError('Failed to update password: ' + (error.response?.data?.message || error.message));

            if (error.response?.status === 401 || error.response?.status === 403) {
                localStorage.removeItem('user');
                navigate('/login');
            }
        } finally {
            setLoading(false);
        }
    };

    if (loading && !user) {
        return (
            <div className="min-h-screen flex justify-center items-center bg-[#0a0b1e]">
                <Spin size="large" />
            </div>
        );
    }

    return (
        <div className="min-h-screen text-lg">
            {/* Hero Section */}
            <section className="relative h-[50vh] flex items-center">
                <div 
                    className="absolute inset-0 z-0 bg-cover bg-center"
                    style={{ backgroundImage: `url(${profileBg})` }}
                ></div>
                <div className="absolute inset-0 z-1 bg-gradient-to-b from-black/80 via-black/50 to-black/70"></div>
                <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                    <motion.div 
                        initial="hidden"
                        animate="visible"
                        variants={fadeIn}
                        className="max-w-3xl"
                    >
                        <h1 className="text-5xl font-bold mb-4 text-shadow-lg" style={{ textShadow: "0 4px 8px rgba(0,0,0,0.8)" }}>
                            MY PROFILE
                        </h1>
                        <p className="text-xl mb-8 text-gray-200" style={{ textShadow: "0 2px 4px rgba(0,0,0,0.8)" }}>
                            Manage your personal information and account settings
                        </p>
                    </motion.div>
                </div>
            </section>

            <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-16 -mt-16 relative z-10">
                <motion.div 
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true }}
                    variants={fadeIn}
                    className="max-w-4xl mx-auto"
                >
                    {error && (
                        <Alert
                            message="Error"
                            description={error}
                            type="error"
                            showIcon
                            closable
                            onClose={() => setError('')}
                            className="mb-8 text-base"
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
                            className="mb-8 text-base"
                        />
                    )}

                    <div className="bg-[#12133a] p-8 rounded-lg shadow-2xl mb-10">
                        <h2 className="text-2xl font-bold mb-6 text-green-400">Personal Information</h2>
                        <Form
                            form={form}
                            layout="vertical"
                            onFinish={handleUpdateProfile}
                            className="text-lg"
                        >
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <Form.Item
                                    name="first_name"
                                    label={<span className="text-white text-lg">First Name</span>}
                                    rules={[{ required: true, message: 'First name is required' }]}
                                >
                                    <Input 
                                        prefix={<UserOutlined />} 
                                        placeholder="First Name" 
                                        size="large" 
                                        className="py-2 text-lg bg-[#0d0e24] border-gray-700"
                                    />
                                </Form.Item>

                                <Form.Item
                                    name="last_name"
                                    label={<span className="text-white text-lg">Last Name</span>}
                                    rules={[{ required: true, message: 'Last name is required' }]}
                                >
                                    <Input 
                                        prefix={<UserOutlined />} 
                                        placeholder="Last Name" 
                                        size="large" 
                                        className="py-2 text-lg bg-[#0d0e24] border-gray-700"
                                    />
                                </Form.Item>

                                <Form.Item
                                    name="email"
                                    label={<span className="text-white text-lg">Email</span>}
                                    rules={[
                                        { required: true, message: 'Email is required' },
                                        { type: 'email', message: 'Please enter a valid email address' }
                                    ]}
                                >
                                    <Input 
                                        prefix={<MailOutlined />} 
                                        placeholder="Email" 
                                        size="large" 
                                        disabled
                                        className="py-2 text-lg text-white border-gray-700 rounded-md"
                                        style={{
                                            backgroundColor: '#1a1a2e', // match with the rest or pick a dark shade
                                            color: 'white',
                                            border: '1px solid #4b5563', // Tailwind's border-gray-700
                                            opacity: 1,
                                            cursor: 'not-allowed'
                                        }}
                                    />
                                </Form.Item>

                                <Form.Item
                                    name="phone_number"
                                    label={<span className="text-white text-lg">Phone Number</span>}
                                    rules={[{ required: true, message: 'Phone number is required' }]}
                                >
                                    <Input 
                                        prefix={<PhoneOutlined />} 
                                        placeholder="Phone Number" 
                                        size="large" 
                                        className="py-2 text-lg bg-[#0d0e24] border-gray-700"
                                    />
                                </Form.Item>

                                <Form.Item
                                    name="nic"
                                    label={<span className="text-white text-lg">NIC</span>}
                                    rules={[{ required: true, message: 'NIC is required' }]}
                                >
                                    <Input 
                                        prefix={<IdcardOutlined />} 
                                        placeholder="NIC" 
                                        size="large" 
                                        className="py-2 text-lg bg-[#0d0e24] border-gray-700"
                                    />
                                </Form.Item>
                            </div>

                            <Form.Item className="mt-6">
                                <Button 
                                    type="primary" 
                                    htmlType="submit" 
                                    size="large"
                                    loading={loading}
                                    className="px-8 h-12 text-lg bg-green-600 hover:bg-green-700 border-0 rounded-lg"
                                >
                                    Update Profile
                                </Button>
                            </Form.Item>
                        </Form>
                    </div>

                    <div className="bg-[#12133a] p-8 rounded-lg shadow-2xl">
                        <h2 className="text-2xl font-bold mb-6 text-green-400">Change Password</h2>
                        <Button 
                            onClick={() => setIsEditingPassword(!isEditingPassword)}
                            size="large"
                            className={`px-8 h-12 text-lg rounded-lg mb-6 ${
                                isEditingPassword 
                                    ? 'bg-gray-700 text-white hover:bg-gray-600 border-gray-600' 
                                    : 'bg-transparent text-green-500 hover:text-white border-green-500 hover:bg-green-600'
                            }`}
                        >
                            {isEditingPassword ? 'Cancel' : 'Change Password'}
                        </Button>

                        {isEditingPassword && (
                            <Form
                                form={passwordForm}
                                layout="vertical"
                                onFinish={handleUpdatePassword}
                                className="text-lg"
                            >
                                <Form.Item
                                    name="current_password"
                                    label={<span className="text-white text-lg">Current Password</span>}
                                    rules={[{ required: true, message: 'Current password is required' }]}
                                >
                                    <Input.Password 
                                        prefix={<LockOutlined />} 
                                        placeholder="Current Password" 
                                        size="large" 
                                        className="py-2 text-lg bg-[#0d0e24] border-gray-700"
                                    />
                                </Form.Item>

                                <Form.Item
                                    name="new_password"
                                    label={<span className="text-white text-lg">New Password</span>}
                                    rules={[
                                        { required: true, message: 'New password is required' },
                                        { min: 6, message: 'Password must be at least 6 characters' }
                                    ]}
                                >
                                    <Input.Password 
                                        prefix={<LockOutlined />} 
                                        placeholder="New Password" 
                                        size="large" 
                                        className="py-2 text-lg bg-[#0d0e24] border-gray-700"
                                    />
                                </Form.Item>

                                <Form.Item
                                    name="confirm_password"
                                    label={<span className="text-white text-lg">Confirm Password</span>}
                                    dependencies={['new_password']}
                                    rules={[
                                        { required: true, message: 'Please confirm your password' },
                                        ({ getFieldValue }) => ({
                                            validator(_, value) {
                                                if (!value || getFieldValue('new_password') === value) {
                                                    return Promise.resolve();
                                                }
                                                return Promise.reject(new Error('The two passwords do not match'));
                                            },
                                        }),
                                    ]}
                                >
                                    <Input.Password 
                                        prefix={<LockOutlined />} 
                                        placeholder="Confirm Password" 
                                        size="large" 
                                        className="py-2 text-lg bg-[#0d0e24] border-gray-700"
                                    />
                                </Form.Item>

                                <Form.Item className="mt-6">
                                    <Button 
                                        type="primary" 
                                        htmlType="submit" 
                                        size="large"
                                        loading={loading}
                                        className="px-8 h-12 text-lg bg-green-600 hover:bg-green-700 border-0 rounded-lg"
                                    >
                                        Update Password
                                    </Button>
                                </Form.Item>
                            </Form>
                        )}
                    </div>
                </motion.div>
            </div>

            {/* Footer */}
            <footer className="bg-[#080919] text-white py-12 mt-10">
                <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center">
                    <p className="text-gray-400 text-lg">&copy; 2024 SAS Lanka Service Centre. All rights reserved.</p>
                </div>
            </footer>
        </div>
    );
};

export default UserProfile;
