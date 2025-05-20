import { Routes, Route, useLocation, Navigate, Outlet } from 'react-router-dom';
import { useState, useEffect } from 'react';
import Navbar from './assets/components/Navbar';
import Home from './assets/components/Home';
import Login from './assets/components/Login';
import SignUp from './assets/components/SignUp';
import ForgotPassword from './assets/components/ForgotPassword';
import AdminDashboard from './assets/components/AdminDashboard';
import CustomerAppointments from './assets/pages/CustomerAppointments';
import AdminAppointments from './assets/pages/AdminAppointments';
import AdminInventoryItem from './assets/pages/AdminInventoryItem';
import AdminPurchase from './assets/pages/AdminPurchase';
import AdminVehicleProfile from './assets/pages/AdminVehicleProfile';
import VehicleDetail from './assets/pages/VehicleDetail';
import CustomerVehicleProfiles from './assets/pages/CustomerVehicleProfiles';
import CustomerServiceRecords from './assets/pages/CustomerServiceRecords';
import CustomServiceRecords from './assets/pages/CustomServiceRecords';
import AdminServiceRecord from './assets/pages/AdminServiceRecord';
import AdminServiceRecordDetail from './assets/pages/AdminServiceRecordDetail';
import AdminInvoice from './assets/pages/AdminInvoice';
import UserProfile from './assets/pages/UserProfile';
import AboutUs from './assets/pages/AboutUs';
import Services from './assets/pages/Services';
import AdminUserProfile from './assets/pages/AdminUserProfile';
import VehicleProfileReport from './assets/pages/VehicleProfileReport';
import PurchaseReport from './assets/pages/PurchaseReports';
import InventoryStockReports from './assets/pages/InventoryStockReports';
import ServiceReminders from './assets/pages/ServiceReminders';
import CustomEmails from './assets/pages/CustomEmails';
import AdminService from './assets/pages/AdminService';
import AdminPromotion from './assets/pages/AdminPromotion';
import AdminInquiries from './assets/pages/AdminInquiries';
import AdminFeedback from './assets/pages/AdminFeedback';
import CustomerFeedback from './assets/pages/CustomerFeedback';
import CustomerInquiry from './assets/pages/CustomerInquiry';
import Table from './assets/components/table';
import Model from './assets/components/model';
import Anttable from './assets/components/Anttable';
import AntModel from './assets/components/AntModel';
import AdminSidebar from './assets/components/AdminSidebar';
import ServiceTechnicianSidebar from './assets/components/ServiceTechnicianSidebar';
import ServiceTechnicianDashboard from './assets/pages/ServiceTechnicianDashboard';
import Test from './assets/pages/Test'

// Admin Layout component that wraps all admin routes with the sidebar
const AdminLayout = () => {
  return (
    <AdminSidebar>
      <Outlet />
    </AdminSidebar>
  );
};

// Technician Layout component that wraps all technician routes with the sidebar
const TechnicianLayout = () => {
  return (
    <ServiceTechnicianSidebar>
      <Outlet />
    </ServiceTechnicianSidebar>
  );
};

// PageLayout component for non-admin pages
const PageLayout = ({ children }) => {
  return (
    <div className="min-h-screen relative bg-[#0a0b1e]">
      {/* Header background for all pages except home */}
      <div className="w-full h-64 absolute top-0 left-0 right-0 z-0" 
           style={{ 
             background: 'linear-gradient(to bottom, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0.5) 50%, rgba(10,11,30,1) 100%)',
             pointerEvents: 'none'
           }}>
      </div>
      
      {/* Page content */}
      <div className="relative z-10 pt-28">
        {children}
      </div>
    </div>
  );
};

function App() {
  const location = useLocation();
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Check if user is authenticated
  useEffect(() => {
    const userString = localStorage.getItem('user');
    setIsAuthenticated(!!userString);
  }, []);

  // Update the paths where Navbar should be hidden
  const hiddenNavbarPaths = [
    // Admin paths
    '/admin-dashboard',
    '/admin-appointments',
    '/admin/inventory',
    '/admin/purchases',
    '/admin/stock',
    '/admin/vehicles',
    '/admin/vehicle-profile',
    '/admin/services',
    '/admin/promotions',
    '/admin/inquiries',
    '/admin/feedback',
    '/admin/service-records',
    '/admin/service-records/',
    '/admin/invoices',
    '/admin/user-profile',
    '/admin/reports/vehicles',
    '/admin/reports/services',
    '/admin/reports/purchases',
    '/admin/reports/inventory-stock',
    '/admin/service-reminders',
    '/admin/vehicle-profile/',
    '/admin/custom-emails',
    // Technician paths
    '/technician-dashboard',
    '/technician/vehicles',
    '/technician/service-records',
    '/technician/invoices',
    '/technician/appointments',
    '/technician/inquiries',
    '/technician/service-reminders',
    '/technician/service-records/',
    '/technician/custom-emails',
    // Auth paths
    '/login',
    '/signup',
    '/register',
    '/forgot-password',


    '/test'
  ];

  // Only hide navbar for admin/technician pages and auth pages
  const shouldHideNavbar = hiddenNavbarPaths.some(path => 
    location.pathname === path || 
    (path.endsWith('/') && location.pathname.startsWith(path))
  );

  // Determine if current route is home page
  const isHomePage = location.pathname === '/';

  return (
    <div className="min-h-screen bg-black">
      {!shouldHideNavbar && <Navbar />}
      
      {!shouldHideNavbar && !isHomePage ? (
        <PageLayout>
          <Routes>
            {/* Public Routes */}
            <Route path="/about-us" element={<AboutUs />} />
            <Route path="/services" element={<Services />} />
            <Route path="/test" element={<Test />} />
            
            {/* Customer Routes */}
            <Route path="/appointments" element={<CustomerAppointments />} />
            <Route path="/my-vehicles" element={<CustomerVehicleProfiles />} />
            <Route path="/vehicle-service-records/:vehicleNumber" element={<CustomerServiceRecords />} />
            <Route path="/custom-service-records/:vehicleNumber" element={<CustomServiceRecords />} />
            <Route path="/profile" element={<UserProfile />} />
            <Route path="/feedback" element={<CustomerFeedback />} />
            <Route path="/inquiries" element={<CustomerInquiry />} />
            
            {/* Test Components */}
            <Route path="/table" element={<Table />} />
            <Route path="/model" element={<Model />} />
            <Route path="/anttable" element={<Anttable />} />
            <Route path="/antmodel" element={<AntModel />} />
          </Routes>
        </PageLayout>
      ) : (
        <Routes>
          {/* Home route (does not use PageLayout) */}
          <Route path="/" element={<Home />} />
          
          {/* Authentication Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<SignUp />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          
          {/* Admin Routes - All wrapped with AdminSidebar */}
          <Route element={<AdminLayout />}>
            <Route path="/admin-dashboard" element={<AdminDashboard />} />
            <Route path="/admin-appointments" element={<AdminAppointments />} />
            <Route path="/admin/inventory" element={<AdminInventoryItem />} />
            <Route path="/admin/purchases" element={<AdminPurchase />} />
            <Route path="/admin/vehicles" element={<AdminVehicleProfile />} />
            <Route path="/admin/vehicle-profile/:vehicleNumber" element={<VehicleDetail />} />
            <Route path="/admin/service-records" element={<AdminServiceRecord />} />
            <Route path="/admin/service-records/:recordId" element={<AdminServiceRecordDetail />} />
            <Route path="/admin/invoices" element={<AdminInvoice />} />
            <Route path="/admin/user-profile" element={<AdminUserProfile />} />
            <Route path="/admin/reports/vehicles" element={<VehicleProfileReport />} />
            <Route path="/admin/reports/purchases" element={<PurchaseReport />} />
            <Route path="/admin/reports/inventory-stock" element={<InventoryStockReports />} />
            <Route path="/admin/service-reminders" element={<ServiceReminders />} />
            <Route path="/admin/services" element={<AdminService />} />
            <Route path="/admin/promotions" element={<AdminPromotion />} />
            <Route path="/admin/inquiries" element={<AdminInquiries />} />
            <Route path="/admin/feedback" element={<AdminFeedback />} />
            <Route path="/admin/custom-emails" element={<CustomEmails />} />
          </Route>

          {/* Technician Routes - All wrapped with TechnicianSidebar */}
          <Route element={<TechnicianLayout />}>
            <Route path="/technician-dashboard" element={<ServiceTechnicianDashboard />} />
            <Route path="/technician/vehicles" element={<AdminVehicleProfile />} />
            <Route path="/technician/service-records" element={<AdminServiceRecord />} />
            <Route path="/technician/service-records/:recordId" element={<AdminServiceRecordDetail />} />
            <Route path="/technician/invoices" element={<AdminInvoice />} />
            <Route path="/technician/appointments" element={<AdminAppointments />} />
            <Route path="/technician/inquiries" element={<AdminInquiries />} />
            <Route path="/technician/service-reminders" element={<ServiceReminders />} />
            <Route path="/technician/custom-emails" element={<CustomEmails />} />
          </Route>
          <Route path="/test" element={<Test />} />
        </Routes>
      )}
    </div>
    
  );
}

export default App;
