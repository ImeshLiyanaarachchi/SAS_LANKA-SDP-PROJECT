import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { formatDate } from '../../utils/formatters';
import { useNavigate } from 'react-router-dom';
import { Card, Table, Button, Space, Checkbox, Select, Alert, Spin, Typography } from 'antd';
import { motion } from 'framer-motion';

const { Title } = Typography;
const { Option } = Select;

const ServiceReminders = () => {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [daysFromNow, setDaysFromNow] = useState(14);
  const [loading, setLoading] = useState(false);
  const [sendingEmails, setSendingEmails] = useState(false);
  const [alert, setAlert] = useState({ show: false, type: '', message: '' });
  const [selectAll, setSelectAll] = useState(false);

  // Fetch users due for service
  const fetchUsers = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`http://localhost:3000/api/service-reminders/due-for-service?daysFromNow=${daysFromNow}`, {
        withCredentials: true
      });
      
      if (response.data.success) {
        setUsers(response.data.data);
        setSelectedUsers([]);
        setSelectAll(false);
      } else {
        setAlert({
          show: true,
          type: 'error',
          message: 'Failed to fetch users due for service'
        });
      }
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

  useEffect(() => {
    fetchUsers();
  }, [daysFromNow]);

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

  // Send reminder emails
  const sendReminders = async () => {
    if (selectedUsers.length === 0) {
      setAlert({
        show: true,
        type: 'warning',
        message: 'Please select at least one user to send reminders'
      });
      return;
    }

    setSendingEmails(true);
    try {
      const response = await axios.post('http://localhost:3000/api/service-reminders/send-reminders', 
        { userIds: selectedUsers },
        { withCredentials: true }
      );

      if (response.data.success) {
        setAlert({
          show: true,
          type: 'success',
          message: `Successfully sent ${response.data.count} reminder emails`
        });
        // Clear selected users after successful send
        setSelectedUsers([]);
        setSelectAll(false);
      } else {
        setAlert({
          show: true,
          type: 'error',
          message: response.data.message || 'Failed to send reminder emails'
        });
      }
    } catch (error) {
      console.error('Error sending reminders:', error);
      setAlert({
        show: true,
        type: 'error',
        message: error.response?.data?.message || 'An error occurred while sending reminders'
      });
    } finally {
      setSendingEmails(false);
    }
  };

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
    },
    {
      title: 'Next Service Due',
      key: 'next_service_due',
      render: (_, record) => formatDate(record.next_service_due)
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
              <Title level={2}>Service Reminders</Title>
            </motion.div>
            <Button
              type="primary"
              onClick={() => {
                const user = JSON.parse(localStorage.getItem('user'));
                const basePath = user.role === 'technician' ? '/technician' : '/admin';
                navigate(`${basePath}/custom-emails`);
              }}
              style={{ fontSize: '18px', height: '48px', padding: '0 24px' }}
            >
              Send Custom Emails
            </Button>
          </div>

          {renderAlert()}

          <Card className="mb-8">
            <div className="reminder-controls flex flex-col md:flex-row justify-between items-start md:items-center mb-4 gap-4">
              <Space>
                <div className="flex items-center">
                  <span className="mr-2">Show users due within:</span>
                  <Select
                    value={daysFromNow}
                    onChange={(value) => setDaysFromNow(Number(value))}
                    style={{ width: 120 }}
                  >
                    <Option value={7}>7 days</Option>
                    <Option value={14}>14 days</Option>
                    <Option value={30}>30 days</Option>
                    <Option value={60}>60 days</Option>
                  </Select>
                </div>
                <Checkbox
                  checked={selectAll}
                  onChange={handleSelectAll}
                >
                  Select All
                </Checkbox>
              </Space>
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
              className="reminders-table"
            />

            <div className="flex justify-end mt-4">
              <Button
                type="primary"
                onClick={sendReminders}
                loading={sendingEmails}
                disabled={selectedUsers.length === 0}
                className="action-button"
              >
                Send Reminders
              </Button>
            </div>
          </Card>
        </div>
      </motion.div>
      <style>{`
        /* Standard white theme and font sizes */
        .reminders-table .ant-table-thead > tr > th {
            font-size: 20px;
            padding: 12px 16px;
        }
        
        .reminders-table .ant-table-tbody > tr > td {
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
        
        /* Enlarged controls */
        .reminder-controls .ant-select {
            font-size: 18px;
        }
        
        .reminder-controls .ant-checkbox-wrapper {
            font-size: 18px;
        }
        
        .reminder-controls span {
            font-size: 18px;
        }
      `}</style>
    </>
  );
};

export default ServiceReminders; 