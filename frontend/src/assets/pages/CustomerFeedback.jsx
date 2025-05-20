import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Rate, Input, Button, message, Divider, Typography, Modal, Popconfirm, List } from 'antd';
import { StarOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { motion } from 'framer-motion';
import axios from 'axios';
import './CustomerFeedback.css'; // Import custom CSS for Rate component

const { TextArea } = Input;
const { Title, Text } = Typography;

const CustomerFeedback = () => {
  const [rating, setRating] = useState(0);
  const [description, setDescription] = useState('');
  const [userFeedback, setUserFeedback] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [currentFeedback, setCurrentFeedback] = useState(null);
  const [editRating, setEditRating] = useState(0);
  const [editDescription, setEditDescription] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
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
      message.error('Please login to submit feedback');
      navigate('/login');
      return;
    }

    fetchUserFeedback();
  }, [navigate]);

  const fetchUserFeedback = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await axios.get('http://localhost:3000/api/feedback/user', {
        withCredentials: true
      });
      setUserFeedback(response.data);
    } catch (error) {
      console.error('Error fetching user feedback:', error);
      setError('Failed to load your feedback');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (rating === 0) {
      setError('Please select a rating');
      return;
    }

    setSubmitting(true);
    setError('');
    setSuccess('');
    try {
      await axios.post('http://localhost:3000/api/feedback', {
        rating,
        description
      }, {
        withCredentials: true
      });
      
      setSuccess('✅ Feedback submitted successfully!');
      setRating(0);
      setDescription('');
      fetchUserFeedback(); // Refresh the list
    } catch (error) {
      console.error('Error submitting feedback:', error);
      setError('Failed to submit feedback');
    } finally {
      setSubmitting(false);
    }
  };

  const openEditModal = (feedback) => {
    setCurrentFeedback(feedback);
    setEditRating(feedback.rating);
    setEditDescription(feedback.description || '');
    setEditModalVisible(true);
  };

  const handleUpdate = async () => {
    if (!currentFeedback) return;
    
    try {
      await axios.put(`http://localhost:3000/api/feedback/${currentFeedback.feedback_id}`, {
        rating: editRating,
        description: editDescription
      }, {
        withCredentials: true
      });
      
      setSuccess('✅ Feedback updated successfully!');
      setEditModalVisible(false);
      fetchUserFeedback(); // Refresh the list
    } catch (error) {
      console.error('Error updating feedback:', error);
      setError('Failed to update feedback');
    }
  };

  const handleDelete = async (feedbackId) => {
    setDeleteLoading(true);
    try {
      await axios.delete(`http://localhost:3000/api/feedback/${feedbackId}`, {
        withCredentials: true
      });
      
      setSuccess('✅ Feedback deleted successfully!');
      fetchUserFeedback(); // Refresh the list
    } catch (error) {
      console.error('Error deleting feedback:', error);
      setError('Failed to delete feedback');
    } finally {
      setDeleteLoading(false);
    }
  };

  const formatDate = (dateString) => {
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
          <h1 className="text-4xl font-bold text-white mb-4">Share Your Feedback</h1>
          <p className="mt-2 text-xl text-gray-300">
            Help us improve our services by providing your valuable feedback
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
        
        {/* Feedback Form */}
        <motion.div 
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={fadeIn}
          className="bg-[#12133a] rounded-xl shadow-xl p-8 mb-12 border border-gray-800"
        >
          <h2 className="text-2xl font-bold text-[#00ff85] mb-6">New Feedback</h2>
          
          <div className="space-y-8">
            <div>
              <label className="block text-lg font-medium text-white mb-2">
                How would you rate our service?
              </label>
              <div className="custom-rate-wrapper">
                <Rate 
                  allowHalf
                  value={rating}
                  onChange={setRating}
                  className="text-2xl mb-4 custom-rate"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-lg font-medium text-white mb-2">
                Comments (optional)
              </label>
              <TextArea
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Tell us what you liked or how we can improve..."
                maxLength={500}
                showCount
                className="w-full px-5 py-3 bg-[#12133a] border border-gray-700 rounded-lg focus:ring-[#00ff85] focus:border-[#00ff85] text-white text-lg"
                style={{ color: 'white',backgroundColor: '#1e293b', resize: 'none' }}
              />
            </div>
            
            <div>
              <Button
                type="primary"
                size="large"
                onClick={handleSubmit}
                loading={submitting}
                className="w-full bg-[#0078ff] text-white py-4 px-6 rounded-lg hover:bg-[#0065d9] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#0078ff] flex justify-center items-center text-lg font-semibold shadow-lg transition-all duration-300 h-auto border-0"
                icon={<StarOutlined className="mr-3 text-xl" />}
              >
                Submit Feedback
              </Button>
            </div>
          </div>
        </motion.div>

        {/* Previous Feedback */}
        <motion.div 
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={fadeIn}
          className="mb-12"
        >
          <h2 className="text-3xl font-bold text-[#00ff85] mb-8">My Previous Feedback</h2>
          
          {userFeedback.length === 0 ? (
            <div className="bg-[#12133a] rounded-lg shadow-xl p-8 text-center text-gray-400 text-lg border border-gray-800">
              You haven't submitted any feedback yet.
            </div>
          ) : (
            <div className="space-y-6">
              {userFeedback.map(item => (
                <motion.div 
                  key={item.feedback_id}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true }}
                  variants={fadeIn}
                  className="bg-[#12133a] rounded-lg shadow-xl p-6 mb-6 border border-gray-800 hover:border-[#00ff85]/20 transition-all duration-300"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <div className="mb-3 custom-rate-wrapper">
                        <Rate disabled defaultValue={item.rating} className="text-xl custom-rate" />
                      </div>
                      <div className="text-gray-300 mt-4">
                        {item.description ? (
                          <p className="text-lg">{item.description}</p>
                        ) : (
                          <p className="text-gray-500 italic text-lg">No comments provided</p>
                        )}
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <Button 
                        icon={<EditOutlined style={{ fontSize: '24px', color: 'white' }} />}
                        onClick={() => openEditModal(item)}
                        type="text"
                        className="text-blue-400 hover:text-blue-300 text-lg"
                      />
                      <Popconfirm
                        title="Delete Feedback"
                        description="Are you sure you want to delete this feedback?"
                        onConfirm={() => handleDelete(item.feedback_id)}
                        okText="Yes"
                        cancelText="No"
                        okButtonProps={{ 
                          className: "bg-[#0078ff] hover:bg-[#0065d9] border-0",
                          loading: deleteLoading 
                        }}
                      >
                        <Button 
                          icon={<DeleteOutlined style={{ fontSize: '24px' }}/>} 
                          type="text"
                          danger
                          className="hover:text-red-300 text-lg"
                        />
                      </Popconfirm>
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

      <Modal
        title={<span className="text-xl font-bold text-white">Edit Feedback</span>}
        open={editModalVisible}
        onCancel={() => setEditModalVisible(false)}
        className="custom-dark-modal"
        styles={{
          content: {
            background: '#12133a',
            color: 'white'
          },
          header: {
            borderBottom: '1px solid #1d2366'
          },
          footer: {
            borderTop: '1px solid #1d2366'
          }
        }}
        footer={[
          <Button key="cancel" onClick={() => setEditModalVisible(false)} className="border-gray-700 text-white hover:text-gray-300 px-5 py-2 h-auto text-base">
            Cancel
          </Button>,
          <Button 
            key="submit" 
            type="primary" 
            onClick={handleUpdate}
            className="bg-[#0078ff] hover:bg-[#0065d9] border-0 px-5 py-2 h-auto text-base"
          >
            Update
          </Button>
        ]}
      >
        <div className="mb-6">
          <label className="block text-lg font-medium text-white mb-2">Rating</label>
          <div className="custom-rate-wrapper">
            <Rate 
              allowHalf
              value={editRating}
              onChange={setEditRating}
              className="text-xl custom-rate"
            />
          </div>
        </div>
        
        <div>
          <label className="block text-lg font-medium text-white mb-2">Comments (optional)</label>
          <TextArea
            rows={4}
            value={editDescription}
            onChange={(e) => setEditDescription(e.target.value)}
            maxLength={500}
            showCount
            className="w-full px-5 py-3 bg-[#12133a] border border-gray-700 rounded-lg focus:ring-[#00ff85] focus:border-[#00ff85] text-white text-lg"
            style={{ color: 'white', resize: 'none' }}
          />
        </div>
      </Modal>
    </div>
  );
};

export default CustomerFeedback; 