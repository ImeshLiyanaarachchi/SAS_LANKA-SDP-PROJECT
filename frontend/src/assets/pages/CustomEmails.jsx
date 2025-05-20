import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { Card, Table, Button, Space, Checkbox, Input, Alert, Spin, Typography, Form, Divider } from 'antd';
import { motion } from 'framer-motion';

const { Title, Text } = Typography;
const { TextArea } = Input;

const CustomEmails = () => {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [sendingCustomEmails, setSendingCustomEmails] = useState(false);
  const [alert, setAlert] = useState({ show: false, type: '', message: '' });
  const [selectAll, setSelectAll] = useState(false);
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const emailBodyRef = useRef(null);

  useEffect(() => {
    // Check user authorization
    const user = JSON.parse(localStorage.getItem('user'));
    if (!user || (user.role !== 'admin' && user.role !== 'technician')) {
      navigate('/login');
      return;
    }

    fetchUsers();
  }, [navigate]);

  // Fetch users
  const fetchUsers = async () => {
    setLoading(true);
    try {
      const response = await axios.get('http://localhost:3000/api/users', {
        withCredentials: true
      });
  
      // Directly set users
      setUsers(response.data);
      setSelectedUsers([]);
      setSelectAll(false);
  
    } catch (error) {
      console.error('Error fetching users:', error);
      setAlert({
        show: true,
        type: 'error',
        message: error.response?.data?.message || 'An error occurred while fetching data'
      });
    } finally {
      setLoading(false);
    }
  };

  // Handle checkbox change for selecting users
  const handleCheckboxChange = (userId) => {
    if (selectedUsers.includes(userId)) {
      setSelectedUsers(selectedUsers.filter(id => id !== userId));
    } else {
      setSelectedUsers([...selectedUsers, userId]);
    }
  };

  // Handle "Select All" checkbox
  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedUsers([]);
    } else {
      setSelectedUsers(users.map(user => user.user_id));
    }
    setSelectAll(!selectAll);
  };

  // Send custom emails
  const sendCustomEmails = async (e) => {
    e.preventDefault();
    
    if (selectedUsers.length === 0) {
      setAlert({
        show: true,
        type: 'warning',
        message: 'Please select at least one user to send emails'
      });
      return;
    }
    
    if (!emailSubject.trim() || !emailBody.trim()) {
      setAlert({
        show: true,
        type: 'warning',
        message: 'Email subject and body are required'
      });
      return;
    }
    
    setSendingCustomEmails(true);
    try {
      const response = await axios.post('http://localhost:3000/api/service-reminders/send-custom-emails', 
        { 
          userIds: selectedUsers,
          emailSubject,
          emailBody
        },
        { withCredentials: true }
      );

      if (response.data.success) {
        setAlert({
          show: true,
          type: 'success',
          message: `Successfully sent ${response.data.count} custom emails`
        });
        
        // Reset form
        setEmailSubject('');
        setEmailBody('');
        setSelectedUsers([]);
        setSelectAll(false);
      } else {
        setAlert({
          show: true,
          type: 'error',
          message: response.data.message || 'Failed to send custom emails'
        });
      }
    } catch (error) {
      console.error('Error sending custom emails:', error);
      setAlert({
        show: true,
        type: 'error',
        message: error.response?.data?.message || 'An error occurred while sending custom emails'
      });
    } finally {
      setSendingCustomEmails(false);
    }
  };

  // Insert placeholder at cursor position
  const insertPlaceholder = (placeholder) => {
    const textArea = emailBodyRef.current;
    if (!textArea) return;
    
    const start = textArea.selectionStart;
    const end = textArea.selectionEnd;
    const newText = emailBody.slice(0, start) + placeholder + emailBody.slice(end);
    
    setEmailBody(newText);
    
    // Set cursor after placeholder after DOM update
    setTimeout(() => {
      if (emailBodyRef.current) {
        emailBodyRef.current.focus();
        emailBodyRef.current.selectionStart = emailBodyRef.current.selectionEnd = start + placeholder.length;
      }
    }, 0);
  };

  // Set default template for email body
  const setDefaultTemplate = () => {
    setEmailBody(`
<p>Dear {{first_name}},</p>
<p>We would like to remind you that your vehicle requires service attention.</p>
<p>Please contact our service center to schedule an appointment at your earliest convenience.</p>
<p>Thank you for choosing our service center.</p>
<p>Best regards,<br>SAS Lanka Service Team</p>
    `);
    
    // Focus the textarea after setting the template
    setTimeout(() => {
      if (emailBodyRef.current) {
        emailBodyRef.current.focus();
      }
    }, 0);
  };

  // Array of placeholder objects for mapping
  const placeholders = [
    { id: 'first_name', label: 'first_name' },
    { id: 'last_name', label: 'last_name' },
    { id: 'email', label: 'email' }
  ];

  const renderAlert = () => {
    if (!alert.show) return null;
    
    return (
      <Alert
        message={alert.message}
        type={alert.type}
        showIcon
        closable
        onClose={() => setAlert({ ...alert, show: false })}
        className="mb-4"
      />
    );
  };

  const columns = [
    {
      title: '',
      key: 'selection',
      width: 50,
      render: (_, record) => (
        <Checkbox
          checked={selectedUsers.includes(record.user_id)}
          onChange={() => handleCheckboxChange(record.user_id)}
        />
      )
    },
    {
      title: 'Name',
      key: 'name',
      render: (_, record) => `${record.first_name} ${record.last_name}`
    },
    {
      title: 'Email',
      dataIndex: 'email',
      key: 'email'
    }
  ];

  if (loading && users.length === 0) {
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
        style={{ backgroundColor: "#ffffff" }}
      >
        <div className="max-w-8xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-8 flex justify-between items-center">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Title level={2}>Custom Email Management</Title>
            </motion.div>

          </div>

          {renderAlert()}

          <Card className="mb-8">
            <Title level={4} className="mb-4">Select Recipients</Title>
            <div className="mb-4">
              <Checkbox
                checked={selectAll}
                onChange={handleSelectAll}
                className="mb-2 select-all-checkbox"
              >
                Select All
              </Checkbox>
            </div>

            <Table
              columns={columns}
              dataSource={users}
              rowKey="user_id"
              loading={loading}
              pagination={{
                showSizeChanger: true,
                defaultPageSize: 10,
                pageSizeOptions: ['10', '20', '50']
              }}
              className="emails-table"
            />

            <Divider />

            <Form onSubmit={sendCustomEmails} className="mt-6">
              <Form.Item label="Subject" className="custom-form-item">
                <Input
                  value={emailSubject}
                  onChange={(e) => setEmailSubject(e.target.value)}
                  className="email-input"
                  required
                />
              </Form.Item>

              <Form.Item label="Email Body" className="custom-form-item">
                <div className="mb-2">
                  <Button
                    onClick={setDefaultTemplate}
                    className="mr-2"
                  >
                    Use Default Template
                  </Button>
                  <Text className="mr-2">Insert placeholders:</Text>
                  <Space>
                    {placeholders.map((placeholder) => (
                      <Button
                        key={placeholder.id}
                        size="small"
                        onClick={() => insertPlaceholder(`{{${placeholder.label}}}`)}
                      >
                        {placeholder.label}
                      </Button>
                    ))}
                  </Space>
                </div>
                <TextArea
                  ref={emailBodyRef}
                  value={emailBody}
                  onChange={(e) => setEmailBody(e.target.value)}
                  className="email-textarea"
                  rows={10}
                  required
                />
              </Form.Item>

              <div className="flex justify-end">
                <Button
                  type="primary"
                  onClick={sendCustomEmails}
                  loading={sendingCustomEmails}
                  disabled={selectedUsers.length === 0}
                  className="action-button"
                >
                  Send Emails
                </Button>
              </div>
            </Form>
          </Card>
        </div>
      </motion.div>
      <style>{`
        /* Standard white theme and font sizes */
        .emails-table .ant-table-thead > tr > th {
            font-size: 20px;
            padding: 12px 16px;
        }
        
        .emails-table .ant-table-tbody > tr > td {
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
        
        /* Email form styling */
        .custom-form-item .ant-form-item-label > label {
            font-size: 20px;
            font-weight: 500;
        }
        
        .email-input {
            height: 48px;
            font-size: 18px;
            padding: 10px 14px;
        }
        
        .email-textarea {
            font-size: 18px;
            padding: 10px 14px;
        }
        
        .select-all-checkbox {
            font-size: 18px;
        }
        
        /* Button styling */
        .ant-btn {
            font-size: 18px;
        }
        
        .ant-btn-sm {
            font-size: 16px;
        }
      `}</style>
    </>
  );
};

export default CustomEmails; 