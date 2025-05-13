import { Routes, Route, useLocation } from 'react-router-dom';
import Login from './assets/components/Login';
import SignUp from './assets/components/SignUp';
import Home from './assets/components/Home';
import AdminPurchase from './assets/pages/AdminPurchase';
import AdminDashboard from './assets/components/AdminDashboard';
import AdminInventoryItem from './assets/pages/AdminInventoryItem';


function App() {
  const location = useLocation();
  // Update the paths where Navbar should be hidden
  const hideNavbarPaths = [
    '/login',
    '/signup',
    '/admin/inventory',
    '/admin/purchases',
  ];

  // Check if the path starts with any of the above paths
  const shouldHideNavbar = hideNavbarPaths.some(path => 
    location.pathname === path || 
    (path.endsWith('/') && location.pathname.startsWith(path))
  );

  return (
    <div className="min-h-screen bg-black">
      {!shouldHideNavbar && <Navbar />}
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<SignUp />} />
                <Route path="/admin/inventory" element={<AdminInventoryItem />} />
        <Route path="/admin/purchases" element={<AdminPurchase />} />
      </Routes>
    </div>
  );
}

export default App;
