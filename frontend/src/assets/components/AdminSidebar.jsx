import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
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
  FaBell,
  FaCogs,
  FaQuestionCircle
} from 'react-icons/fa';

const AdminSidebar = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const userString = localStorage.getItem('user');
    if (userString) {
      setUser(JSON.parse(userString));
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('user');
    navigate('/login');
  };

  // Determine active tab based on current path
  const getActiveTab = (path) => {
    if (path === '/admin-dashboard') return 'overview';
    if (path === '/admin/user-profile') return 'users';
    if (path === '/admin/vehicles') return 'vehicles';
    if (path === '/admin/service-records') return 'services';
    if (path === '/admin/services') return 'serviceManagement';
    if (path === '/admin/invoices') return 'invoices';
    if (path === '/admin-appointments') return 'appointments';
    if (path === '/admin/inquiries') return 'inquiries';
    if (path === '/admin/service-reminders') return 'serviceReminders';
    if (path === '/admin/inventory') return 'inventory';
    if (path === '/admin/purchases') return 'Purchases';
    if (path === '/admin/reports/vehicles') return 'vehicleReport';
    if (path === '/admin/reports/purchases') return 'purchaseReport';
    if (path === '/admin/reports/inventory-stock') return 'inventoryStockReport';
    return '';
  };

  const activeTab = getActiveTab(location.pathname);

  const menuItems = [
    { id: 'overview', label: 'Overview', icon: <FaChartBar />, path: '/admin-dashboard' },
    { id: 'users', label: 'Users', icon: <FaUsers />, path: '/admin/user-profile' },
    { id: 'vehicles', label: 'Vehicles', icon: <FaCar />, path: '/admin/vehicles' },
    { id: 'services', label: 'Service Records', icon: <FaTools />, path: '/admin/service-records' },
    { id: 'serviceManagement', label: 'Service Management', icon: <FaCogs />, path: '/admin/services' },
    { id: 'invoices', label: 'Invoices', icon: <FaFileInvoiceDollar />, path: '/admin/invoices' },
    { id: 'appointments', label: 'Appointments', icon: <FaClipboardList />, path: '/admin-appointments' },
    { id: 'inquiries', label: 'Customer Inquiries', icon: <FaQuestionCircle />, path: '/admin/inquiries' },
    { id: 'serviceReminders', label: 'Service Reminders', icon: <FaBell />, path: '/admin/service-reminders' },
    { id: 'inventory', label: 'Inventory', icon: <FaBox />, path: '/admin/inventory' },
    { id: 'Purchases', label: 'Purchases', icon: <FaBox />, path: '/admin/purchases' },
    { id: 'separator', label: 'Reports', isSeparator: true },
    { id: 'vehicleReport', label: 'Vehicle Reports', icon: <FaFilePdf />, path: '/admin/reports/vehicles' },
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
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-gray-900 text-white transform transition-transform duration-300 ease-in-out ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} flex flex-col`}
      >
        {/* Fixed Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-800">
          <h1 className="text-xl font-bold">SAS LANKA</h1>
          <button
            onClick={() => setIsSidebarOpen(false)}
            className="p-2 rounded-lg hover:bg-gray-800"
          >
            <FaTimes />
          </button>
        </div>
        
        {/* Scrollable Navigation */}
        <nav className="flex-1 overflow-y-auto p-4 scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-gray-900">
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

        {/* Fixed Footer */}
        <div className="p-4 border-t border-gray-800">
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
            {user && (
              <div className="flex items-center space-x-4">
                <div className="relative">
                  <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                    <span className="text-gray-600 font-medium">
                      {user.username ? user.username.charAt(0).toUpperCase() : 'A'}
                    </span>
                  </div>
                  <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></span>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900">{user.username || 'Admin'}</p>
                  <p className="text-xs text-gray-500">{user.email}</p>
                </div>
              </div>
            )}
          </div>
        </header>

        {/* Page Content */}
        <main className="p-6">
          {children}
        </main>
      </div>
    </div>
  );
};

export default AdminSidebar; 