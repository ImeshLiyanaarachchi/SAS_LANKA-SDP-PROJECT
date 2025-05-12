import { Routes, Route, useLocation } from 'react-router-dom';
import Login from './assets/components/Login';
import SignUp from './assets/components/SignUp';
import Home from './assets/components/Home';
function App() {
  const location = useLocation();
  // Update the paths where Navbar should be hidden
  const hideNavbarPaths = [
    '/login',
    '/signup',
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
      </Routes>
    </div>
  );
}

export default App;
