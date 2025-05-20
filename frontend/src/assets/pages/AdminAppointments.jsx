import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { FaUser } from 'react-icons/fa';
import { Modal, Button, Form, Input, Select, DatePicker, message, Typography, Card, Space, Spin, Table, Badge, Empty } from 'antd';
import moment from 'moment';

const { Title, Text } = Typography;
const { Option } = Select;

// Remove dark theme styles

const AdminAppointments = () => {
  const navigate = useNavigate();
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editForm] = Form.useForm();
  const [currentAppointment, setCurrentAppointment] = useState(null);
  const [availableTimeSlots, setAvailableTimeSlots] = useState([]);
  const [serviceTypes, setServiceTypes] = useState([]);

  // Time slots for the application
  const allTimeSlots = ['08:00', '09:30', '11:00', '12:30', '14:00', '15:30'];

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const user = JSON.parse(localStorage.getItem('user'));
        if (!user || (user.role !== 'admin' && user.role !== 'technician')) {
          navigate('/login');
          return;
        }
        fetchAppointments();
        fetchServiceTypes();
      } catch (error) {
        console.error('Auth check error:', error);
        navigate('/login');
      }
    };

    checkAuth();
  }, [navigate]);

  // Fetch service types for dropdown
  const fetchServiceTypes = async () => {
    try {
      const response = await axios.get('http://localhost:3000/api/service-types', {
        withCredentials: true
      });
      setServiceTypes(response.data);
    } catch (error) {
      console.error('Error fetching service types:', error);
    }
  };

  const fetchAppointments = async () => {
    try {
      setLoading(true);
      const response = await axios.get('http://localhost:3000/api/appointments', {
        withCredentials: true
      });
      setAppointments(response.data);
      setError('');
    } catch (error) {
      console.error('Error fetching appointments:', error);
      setError('Failed to fetch appointments');
      if (error.response?.status === 401 || error.response?.status === 403) {
        navigate('/login');
      }
    } finally {
      setLoading(false);
    }
  };


  const getStatusColor = (status) => {
    switch (status) {
      case 'Pending':
        return 'warning';
      case 'Confirmed':
        return 'success';
      default:
        return 'default';
    }
  };

  const handleStatusChange = async (appointmentId, newStatus) => {
    try {
      message.loading({ content: `Updating status to ${newStatus}...`, key: 'statusUpdate' });
      
      await axios.patch(
        `http://localhost:3000/api/appointments/${appointmentId}/status`,
        { status_: newStatus },
        { withCredentials: true }
      );
      
      message.success({ 
        content: `Appointment status updated to ${newStatus}`, 
        key: 'statusUpdate', 
        duration: 2 
      });
      
      fetchAppointments(); // Refresh the list after update
    } catch (error) {
      console.error('Error updating appointment status:', error);
      
      const errorMessage = error.response?.data?.message || 
                          error.message || 
                          'Failed to update appointment status';
                          
      message.error({ 
        content: errorMessage, 
        key: 'statusUpdate', 
        duration: 3 
      });
      
      if (error.response?.status === 401 || error.response?.status === 403) {
        navigate('/login');
      }
    }
  };

  const handleModalCancel = () => {
    setIsModalOpen(false);
    setCurrentAppointment(null);
    editForm.resetFields();
    setAvailableTimeSlots([]);
  };

  const handleDeleteAppointment = async (appointmentId) => {
    try {
      await axios.delete(`http://localhost:3000/api/appointments/${appointmentId}`, {
        withCredentials: true
      });
      
      message.success('Appointment deleted successfully');
      fetchAppointments(); // Refresh the list
    } catch (error) {
      console.error('Error deleting appointment:', error);
      message.error(error.response?.data?.message || 'Failed to delete appointment');
      
      if (error.response?.status === 401 || error.response?.status === 403) {
        navigate('/login');
      }
    }
  };

  // Define table columns
  const columns = [
    {
      title: () => (
        <div style={styles.titleWithIcon}>
          <FaUser style={styles.titleIcon} />
          <span>Customer Name</span>
        </div>
      ),
      dataIndex: 'customer_name',
      key: 'customer_name',
      render: (text, record) => (
        <Text style={styles.cellText}>
          {record.customer_name || 'Not provided'}
        </Text>
      ),
    },
    {
      title: 'Customer Phone',
      dataIndex: 'customer_phone',
      key: 'customer_phone',
      render: (text, record) => (
        <Text style={styles.cellText}>
          {record.customer_phone || 'Not provided'}
        </Text>
      ),
    },
    {
      title: 'Service Type',
      dataIndex: 'service_type',
      key: 'service_type',
      render: (text) => (
        <Text style={styles.cellText}>{text}</Text>
      ),
    },
    {
      title: 'Appointment Time',
      key: 'appointment_time',
      render: (text, record) => (
        <Text style={styles.cellText}>
          {record.appointment_date && record.appointment_time 
            ? `${new Date(record.appointment_date).toLocaleDateString()} at ${record.appointment_time}`
            : 'Not specified'}
        </Text>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status_',
      key: 'status',
      render: (text, record) => (
        <div>
          <Select
            value={record.status_ || 'Pending'}
            onChange={(value) => handleStatusChange(record.appointment_id, value)}
            style={styles.statusSelect}
          >
            <Option value="Pending">Pending</Option>
            <Option value="Confirmed">Confirmed</Option>
          </Select>
          <Badge 
            status={getStatusColor(record.status_)} 
            text={<Text style={styles.cellText}>{record.status_ || 'Pending'}</Text>} 
          />
        </div>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (text, record) => (
        <Button
          type="primary"
          danger
          onClick={() => handleDeleteAppointment(record.appointment_id)}
        >
          Delete
        </Button>
      ),
    },
  ];

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        <div style={styles.headerContainer}>
          <Title level={2} style={styles.title}>
             Manage Appointments
          </Title>
        </div>

        {error && (
          <div style={styles.error}>
            {error}
          </div>
        )}

        {loading ? (
          <div style={styles.loading}>
            <Spin size="large" />
            <p style={styles.loadingText}>Loading appointments...</p>
          </div>
        ) : (
          <Card style={styles.card}>
            {appointments.length > 0 ? (
              <Table
                dataSource={appointments}
                columns={columns}
                rowKey="appointment_id"
                pagination={{ pageSize: 10 }}
                className="standard-table"
              />
            ) : (
              <Empty 
                description={<Text style={styles.emptyText}>No appointments found</Text>} 
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                style={styles.emptyContainer}
              />
            )}
          </Card>
        )}
      </div>

      <style jsx global>{`
        .standard-table .ant-table-thead > tr > th {
          font-size: 20px !important;
          padding: 12px 16px !important;
        }
        
        .standard-table .ant-table-tbody > tr > td {
          font-size: 19px !important;
          padding: 16px !important;
        }
        
        .standard-table .ant-table-tbody > tr {
          height: 70px;
        }
        
        .standard-table .ant-table-row {
          margin-bottom: 8px;
        }
      `}</style>
    </div>
  );
};

// Consolidated styles
const styles = {
  // Page layout
  page: {
    backgroundColor: "#ffffff",
    minHeight: "100vh",
    padding: "20px",
    width: "100%",
  },
  container: {
    maxWidth: '1950px',
    margin: '0 auto',
  },
  headerContainer: {
    marginBottom: '20px',
  },
  
  // Typography
  title: {
    fontSize: "32px", 
    marginBottom: "15px",
    color: "#333",
  },
  subtitle: {
    fontSize: "18px",
    color: "#666",
  },
  cellText: {
    fontSize: '19px',
  },
  emptyText: {
    fontSize: '18px',
  },
  loadingText: {
    fontSize: '18px',
    marginTop: '15px',
  },
  
  // Components
  card: {
    backgroundColor: "#ffffff",
    borderRadius: "10px",
    marginBottom: "20px",
    boxShadow: "0 4px 12px rgba(0, 0, 0, 0.05)",
  },
  statusSelect: {
    width: '100%',
    marginBottom: '10px',
  },
  
  // Icons and decorations
  titleWithIcon: {
    display: 'flex',
    alignItems: 'center',
  },
  titleIcon: {
    marginRight: '10px',
    color: '#1890ff',
  },
  
  // States
  loading: {
    textAlign: "center",
    margin: "80px 0",
  },
  error: {
    backgroundColor: "#fff2f0",
    border: "1px solid #ffccc7",
    color: "#ff4d4f",
    padding: "15px",
    borderRadius: "8px",
    marginBottom: "20px",
    fontSize: "16px",
  },
  emptyContainer: {
    margin: '50px 0',
  },
};

export default AdminAppointments; 