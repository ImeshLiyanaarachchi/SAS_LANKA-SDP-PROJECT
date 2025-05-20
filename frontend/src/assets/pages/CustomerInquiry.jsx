import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Input, Button, message, Typography, Modal, Popconfirm, List, Tag } from 'antd';
import { QuestionCircleOutlined, EditOutlined, DeleteOutlined, SendOutlined } from '@ant-design/icons';
import { motion } from 'framer-motion';
import axios from 'axios';
import './CustomerInquiry.css'; // Import custom CSS

const { TextArea } = Input;
const { Title, Text, Paragraph } = Typography;

const CustomerInquiry = () => {
  const [description, setDescription] = useState('');
  const [userInquiries, setUserInquiries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [currentInquiry, setCurrentInquiry] = useState(null);
  const [editDescription, setEditDescription] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [userId, setUserId] = useState(null);
  
  const navigate = useNavigate();

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
    // Check if user is authenticated
    const userString = localStorage.getItem('user');
    if (!userString) {
      message.error('Please login to submit an inquiry');
      navigate('/login');
      return;
    }

    try {
      const user = JSON.parse(userString);
      if (user && user.id) {
        setUserId(user.id);
        fetchUserInquiries(user.id);
      } else {
        message.error('User information is incomplete');
        navigate('/login');
      }
    } catch (error) {
      console.error('Error parsing user data:', error);
      message.error('Error with user session');
      navigate('/login');
    }
  }, [navigate]);

  const fetchUserInquiries = async (id) => {
    if (!id) return;
    
    setLoading(true);
    setError('');
    try {
      const response = await axios.get(`http://localhost:3000/api/inquiries/user/${id}`, {
        withCredentials: true
      });
      setUserInquiries(response.data);
    } catch (error) {
      console.error('Error fetching user inquiries:', error);
      setError('Failed to load your inquiries');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!description.trim()) {
      setError('Please enter your inquiry details');
      return;
    }

    setSubmitting(true);
    setError('');
    setSuccess('');
    try {
      await axios.post('http://localhost:3000/api/inquiries', {
        description
      }, {
        withCredentials: true
      });
      
      setSuccess('✅ Inquiry submitted successfully!');
      setDescription('');
      if (userId) {
        fetchUserInquiries(userId); // Refresh the list
      }
    } catch (error) {
      console.error('Error submitting inquiry:', error);
      setError('Failed to submit inquiry');
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending':
        return 'orange';
      case 'resolved':
        return 'green';
      case 'closed':
        return 'blue';
      default:
        return 'default';
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
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
          <h1 className="text-4xl font-bold text-white mb-4">Customer Support</h1>
          <p className="mt-2 text-xl text-gray-300">
            Have a question or need assistance? Submit an inquiry and our team will get back to you.
          </p>
        </motion.div>

        {error && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-4 bg-red-900/30 border border-red-500/30 text-red-400 rounded-lg text-lg"
          >
            {error}
          </motion.div>
        )}

        {success && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-4 bg-green-900/30 border border-green-500/30 text-green-400 rounded-lg text-lg"
          >
            {success}
          </motion.div>
        )}
        
        {/* Inquiry Form */}
        <motion.div 
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={fadeIn}
          className="bg-[#12133a] rounded-xl shadow-xl p-8 mb-12 border border-gray-800"
        >
          <h2 className="text-2xl font-bold text-[#00ff85] mb-6">New Inquiry</h2>
          
          <div className="space-y-8">
            <div>
              <label className="block text-lg font-medium text-white mb-2">
                How can we help you?
              </label>
              <TextArea
                rows={6}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe your issue or question in detail..."
                maxLength={1000}
                showCount
                className="w-full px-5 py-3 bg-[#12133a] border border-gray-700 rounded-lg focus:ring-[#00ff85] focus:border-[#00ff85] text-white text-lg"
                style={{ color: 'white', backgroundColor: '#1e293b', resize: 'none' }}
              />
            </div>
            
            <div>
              <Button
                type="primary"
                size="large"
                onClick={handleSubmit}
                loading={submitting}
                className="w-full bg-[#0078ff] text-white py-4 px-6 rounded-lg hover:bg-[#0065d9] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#0078ff] flex justify-center items-center text-lg font-semibold shadow-lg transition-all duration-300 h-auto border-0"
                icon={<SendOutlined className="mr-3 text-xl" />}
              >
                Submit Inquiry
              </Button>
            </div>
          </div>
        </motion.div>

        {/* Previous Inquiries */}
        <motion.div 
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={fadeIn}
          className="mb-12"
        >
          <h2 className="text-3xl font-bold text-[#00ff85] mb-8">My Inquiries</h2>
          
          {loading ? (
            <div className="bg-[#12133a] rounded-lg shadow-xl p-8 text-center text-gray-400 text-lg border border-gray-800">
              Loading your inquiries...
            </div>
          ) : userInquiries.length === 0 ? (
            <div className="bg-[#12133a] rounded-lg shadow-xl p-8 text-center text-gray-400 text-lg border border-gray-800">
              You haven't submitted any inquiries yet.
            </div>
          ) : (
            <div className="space-y-6">
              {userInquiries.map(item => (
                <motion.div 
                  key={item.inquiry_id}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true }}
                  variants={fadeIn}
                  className="bg-[#12133a] rounded-lg shadow-xl p-6 mb-6 border border-gray-800 hover:border-[#00ff85]/20 transition-all duration-300"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-3">
                        <Tag color={getStatusColor(item.status)} className="text-base px-3 py-1">
                          {item.status?.toUpperCase() || 'PENDING'}
                        </Tag>
                        <span className="text-gray-400 text-base">
                          ID: #{item.inquiry_id}
                        </span>
                      </div>
                      <div className="text-gray-300 mt-4">
                        <p className="text-lg font-medium mb-2">Your Inquiry:</p>
                        <p className="text-lg bg-[#1e293b] p-4 rounded-lg">{item.description}</p>
                      </div>
                      
                      {item.response && (
                        <div className="text-gray-300 mt-6 border-t border-gray-700 pt-4">
                          <p className="text-lg font-medium mb-2 text-[#00ff85]">Response:</p>
                          <p className="text-lg bg-[#1e293b] p-4 rounded-lg">{item.response}</p>
                          <p className="text-sm text-gray-400 mt-2">
                            Responded on: {formatDate(item.responded_at)}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="text-base text-gray-400 mt-3 pt-3 border-t border-gray-700">
                    <p>Submitted: {formatDate(item.created_at)}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>
      </div>

      {/* Footer */}
      <footer className="bg-[#080919] text-white py-12 mt-16">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-gray-400 text-lg">&copy; 2024 SAS Lanka Service Centre. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default CustomerInquiry; 