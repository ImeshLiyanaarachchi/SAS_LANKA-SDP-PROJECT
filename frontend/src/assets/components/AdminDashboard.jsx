import React, { useState, useEffect } from 'react';
import { 
  FaUsers, 
  FaCar, 
  FaCalendarCheck, 
  FaQuestionCircle,
  FaClock
} from 'react-icons/fa';
import axios from 'axios';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);

const AdminDashboard = () => {
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalVehicles: 0,
    pendingAppointments: 0,
    pendingInquiries: 0
  });
  const [recentAppointments, setRecentAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('token');
        const headers = {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        };

        // Fetch all users and count them
        const usersResponse = await axios.get('http://localhost:3000/api/users', { 
          headers,
          withCredentials: true 
        });
        const totalUsers = usersResponse.data.length;
        
        // Fetch all vehicles and count them
        const vehiclesResponse = await axios.get('http://localhost:3000/api/vehicle-profiles', { 
          headers,
          withCredentials: true 
        });
        const totalVehicles = vehiclesResponse.data.length;
        
        // Fetch all appointments and count pending ones
        const appointmentsResponse = await axios.get('http://localhost:3000/api/appointments', { 
          headers,
          withCredentials: true 
        });
        const pendingAppointments = appointmentsResponse.data.filter(apt => apt.status_ === 'Pending').length;
        
        // Fetch all inquiries and count pending ones
        const inquiriesResponse = await axios.get('http://localhost:3000/api/inquiries', { 
          headers,
          withCredentials: true 
        });
        const pendingInquiries = inquiriesResponse.data.filter(inq => inq.status === 'pending').length;

        // Get recent appointments (last 5) from the appointments list
        const recentAppointments = appointmentsResponse.data
          .sort((a, b) => new Date(b.appointment_date) - new Date(a.appointment_date))
          .slice(0, 5);

        setStats({
          totalUsers,
          totalVehicles,
          pendingAppointments,
          pendingInquiries
        });

        setRecentAppointments(recentAppointments);
        setError(null);
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
        setError('Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
        <strong className="font-bold">Error!</strong>
        <span className="block sm:inline"> {error}</span>
      </div>
    );
  }

  return (
    <div className="p-0">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Users */}
        <div className="bg-white rounded-lg shadow-sm p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-base font-medium text-gray-500 mb-1">Total Users</p>
              <h3 className="text-3xl font-bold text-gray-900">{stats.totalUsers}</h3>
            </div>
            <div className="p-3 bg-blue-100 rounded-full">
              <FaUsers className="w-8 h-8 text-blue-600" />
            </div>
          </div>
        </div>

        {/* Total Vehicles */}
        <div className="bg-white rounded-lg shadow-sm p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-base font-medium text-gray-500 mb-1">Total Vehicles</p>
              <h3 className="text-3xl font-bold text-gray-900">{stats.totalVehicles}</h3>
            </div>
            <div className="p-3 bg-green-100 rounded-full">
              <FaCar className="w-8 h-8 text-green-600" />
            </div>
          </div>
        </div>

        {/* Pending Appointments */}
        <div className="bg-white rounded-lg shadow-sm p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-base font-medium text-gray-500 mb-1">Pending Appointments</p>
              <h3 className="text-3xl font-bold text-gray-900">{stats.pendingAppointments}</h3>
            </div>
            <div className="p-3 bg-yellow-100 rounded-full">
              <FaCalendarCheck className="w-8 h-8 text-yellow-600" />
            </div>
          </div>
        </div>

        {/* Pending Inquiries */}
        <div className="bg-white rounded-lg shadow-sm p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-base font-medium text-gray-500 mb-1">Pending Inquiries</p>
              <h3 className="text-3xl font-bold text-gray-900">{stats.pendingInquiries}</h3>
            </div>
            <div className="p-3 bg-purple-100 rounded-full">
              <FaQuestionCircle className="w-8 h-8 text-purple-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Recent Appointments Section */}
      <div className="bg-white rounded-lg shadow-sm p-4 mt-4">
        <h2 className="text-2xl font-semibold text-gray-900 mb-4">Recent Appointments</h2>
        <div className="space-y-3">
          {recentAppointments.length > 0 ? (
            recentAppointments.map((appointment) => (
              <div key={appointment.id} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
                <div className="flex items-center space-x-4">
                  <div className="w-14 h-14 rounded-full bg-blue-100 flex items-center justify-center">
                    <FaClock className="w-7 h-7 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-lg font-medium text-gray-900">
                      {appointment.service_type} - {appointment.vehicle_number}
                    </p>
                    <p className="text-base text-gray-500">
                      {dayjs(appointment.appointment_date).format('YYYY-MM-DD HH:mm')}
                    </p>
                  </div>
                </div>
                <span className={`px-4 py-2 text-base font-medium rounded-full ${
                  appointment.status_ === 'Pending' ? 'bg-yellow-100 text-yellow-800' :
                  appointment.status_ === 'Confirmed' ? 'bg-green-100 text-green-800' :
                  'bg-red-100 text-red-800'
                }`}>
                  {appointment.status_}
                </span>
              </div>
            ))
          ) : (
            <div className="text-center py-4 text-gray-500 text-lg">
              No recent appointments
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard; 