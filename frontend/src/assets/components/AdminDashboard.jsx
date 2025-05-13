import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  FaUsers, 
  FaCar, 
  FaTools, 
  FaClipboardList, 
  FaBox, 
  FaChartBar, 
  FaSignOutAlt,
  FaBars,
  FaTimes,
  FaFileInvoiceDollar,
  FaFilePdf,
  FaSearchPlus,
  FaBell
} from 'react-icons/fa';

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  const handleLogout = () => {
    localStorage.removeItem('user');
    navigate('/login');
  };

  const menuItems = [
    { id: 'overview', label: 'Overview', icon: <FaChartBar />, path: '/admin-dashboard' },
    { id: 'users', label: 'Users', icon: <FaUsers />, path: '/admin/user-profile' },
    { id: 'vehicles', label: 'Vehicles', icon: <FaCar />, path: '/admin/vehicles' },
    { id: 'services', label: 'Service Records', icon: <FaTools />, path: '/admin/service-records' },
    { id: 'invoices', label: 'Invoices', icon: <FaFileInvoiceDollar />, path: '/admin/invoices' },
    { id: 'appointments', label: 'Appointments', icon: <FaClipboardList />, path: '/admin-appointments' },
    { id: 'serviceReminders', label: 'Service Reminders', icon: <FaBell />, path: '/admin/service-reminders' },
    { id: 'inventory', label: 'Inventory', icon: <FaBox />, path: '/admin/inventory' },
    { id: 'Purchases', label: 'Purchases', icon: <FaBox />, path: '/admin/purchases' },
    { id: 'separator', label: 'Reports', isSeparator: true },
    { id: 'vehicleReport', label: 'Vehicle Reports', icon: <FaFilePdf />, path: '/admin/reports/vehicles' },
    { id: 'serviceReport', label: 'Service Reports', icon: <FaSearchPlus />, path: '/admin/reports/services' },
    { id: 'purchaseReport', label: 'Purchase Reports', icon: <FaSearchPlus />, path: '/admin/reports/purchases' },
    { id: 'inventoryStockReport', label: 'Inventory Stock Reports', icon: <FaSearchPlus />, path: '/admin/reports/inventory-stock' }
  ];

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Sidebar */}
      <motion.div
        initial={{ x: -300 }}
        animate={{ x: isSidebarOpen ? 0 : -300 }}
        transition={{ duration: 0.3 }}
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-gray-900 text-white transform transition-transform duration-300 ease-in-out ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <div className="flex items-center justify-between p-4 border-b border-gray-800">
          <h1 className="text-xl font-bold">SAS LANKA</h1>
          <button
            onClick={() => setIsSidebarOpen(false)}
            className="p-2 rounded-lg hover:bg-gray-800"
          >
            <FaTimes />
          </button>
        </div>
        
        <nav className="p-4">
          <ul className="space-y-2">
            {menuItems.map((item) => (
              item.isSeparator ? (
                <li key={item.id} className="pt-4 mt-4 border-t border-gray-700">
                  <span className="block px-3 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    {item.label}
                  </span>
                </li>
              ) : (
                <li key={item.id}>
                  <Link
                    to={item.path}
                    onClick={() => setActiveTab(item.id)}
                    className={`flex items-center p-3 rounded-lg transition-colors duration-200 ${
                      activeTab === item.id
                        ? 'bg-green-600 text-white'
                        : 'text-gray-300 hover:bg-gray-800'
                    }`}
                  >
                    <span className="mr-3">{item.icon}</span>
                    {item.label}
                  </Link>
                </li>
              )
            ))}
          </ul>
        </nav>

        <div className="absolute bottom-0 w-full p-4 border-t border-gray-800">
          <button
            onClick={handleLogout}
            className="flex items-center w-full p-3 text-gray-300 rounded-lg hover:bg-gray-800 transition-colors duration-200"
          >
            <FaSignOutAlt className="mr-3" />
            Logout
          </button>
        </div>
      </motion.div>

      {/* Main Content */}
      <div className={`transition-all duration-300 ${isSidebarOpen ? 'ml-64' : 'ml-0'}`}>
        {/* Header */}
        <header className="bg-white shadow-sm">
          <div className="flex items-center justify-between p-4">
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="p-2 rounded-lg hover:bg-gray-100"
            >
              <FaBars />
            </button>
            <div className="flex items-center space-x-4">
              <div className="relative">
                <img
                  src="https://via.placeholder.com/40"
                  alt="Admin"
                  className="w-10 h-10 rounded-full"
                />
                <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></span>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">Admin User</p>
                <p className="text-xs text-gray-500">admin@saslanka.com</p>
              </div>
            </div>
          </div>
        </header>

        {/* Dashboard Content */}
        <main className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
            {/* Stats Cards */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Total Users</p>
                  <h3 className="text-2xl font-bold text-gray-900">1,234</h3>
                </div>
                <div className="p-3 bg-blue-100 rounded-full">
                  <FaUsers className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Total Vehicles</p>
                  <h3 className="text-2xl font-bold text-gray-900">567</h3>
                </div>
                <div className="p-3 bg-green-100 rounded-full">
                  <FaCar className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Pending Services</p>
                  <h3 className="text-2xl font-bold text-gray-900">89</h3>
                </div>
                <div className="p-3 bg-yellow-100 rounded-full">
                  <FaTools className="w-6 h-6 text-yellow-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Total Revenue</p>
                  <h3 className="text-2xl font-bold text-gray-900">$12,345</h3>
                </div>
                <div className="p-3 bg-purple-100 rounded-full">
                  <FaChartBar className="w-6 h-6 text-purple-600" />
                </div>
              </div>
            </div>
          </div>

          {/* Recent Activity Section */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h2>
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((item) => (
                <div key={item} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                      <FaUsers className="w-5 h-5 text-gray-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">New user registration</p>
                      <p className="text-xs text-gray-500">2 minutes ago</p>
                    </div>
                  </div>
                  <span className="text-xs text-gray-500">View</span>
                </div>
              ))}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default AdminDashboard; 