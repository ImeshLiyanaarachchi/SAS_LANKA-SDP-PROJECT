import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { UserOutlined } from '@ant-design/icons';

const Navbar = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    // Check if user is authenticated
    const userString = localStorage.getItem('user');
    setIsAuthenticated(!!userString);
  }, []);

  const handleProfileClick = () => {
    navigate('/profile');
    setIsMobileMenuOpen(false);
  };

  return (
    <nav className={`fixed w-full z-50 transition-all duration-300 ${
      isScrolled ? 'bg-black/80 backdrop-blur-lg' : 'bg-transparent'
    }`}>
      <div className="w-full px-4">
        <div className="flex items-center justify-between h-24">
          {/* Logo */}
          <div className="flex-shrink-0">
            <Link to="/" className="text-4xl font-bold text-white hover:text-green-400 transition-colors duration-300 pl-4 md:pl-8">
              SAS LANKA
            </Link>
          </div>

          {/* Desktop Menu */}
          <div className="hidden md:flex items-center space-x-8">
            <Link to="/" className="text-lg text-white hover:text-green-400 transition-colors duration-300">
              Home
            </Link>
            <Link to="/about-us" className="text-lg text-white hover:text-green-400 transition-colors duration-300">
              About
            </Link>
            <Link to="/services" className="text-lg text-white hover:text-green-400 transition-colors duration-300">
              Services
            </Link>
            <Link to="/appointments" className="text-lg text-white hover:text-green-400 transition-colors duration-300">
              Appointments
            </Link>
            <Link to="/my-vehicles" className="text-lg text-white hover:text-green-400 transition-colors duration-300">
              My Vehicles
            </Link>
            
            {isAuthenticated ? (
              <button 
                onClick={handleProfileClick}
                className="flex items-center justify-center text-lg text-white hover:text-green-400 transition-colors duration-300"
              >
                <UserOutlined className="text-xl" />
                <span className="ml-2">Profile</span>
              </button>
            ) : (
              <>
                <Link to="/login" className="text-lg text-white hover:text-green-400 transition-colors duration-300">
                  Login
                </Link>
                <Link
                  to="/signup"
                  className="px-8 py-3 text-white bg-green-600 hover:bg-green-700 rounded-lg transition duration-300"
                >
                  Get Started
                </Link>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden">
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="text-white p-2"
            >
              <svg
                className="h-6 w-6"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                {isMobileMenuOpen ? (
                  <path d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        <div
          className={`md:hidden transition-all duration-300 ease-in-out ${
            isMobileMenuOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
          } overflow-hidden`}
        >
          <div className="px-2 pt-2 pb-3 space-y-1 bg-black/80 backdrop-blur-lg rounded-lg mt-2">
            <Link
              to="/"
              className="block px-3 py-2 text-lg text-white hover:text-green-400 transition-colors duration-300"
            >
              Home
            </Link>
            <Link
              to="/about"
              className="block px-3 py-2 text-lg text-white hover:text-green-400 transition-colors duration-300"
            >
              About
            </Link>
            <Link
              to="/services"
              className="block px-3 py-2 text-lg text-white hover:text-green-400 transition-colors duration-300"
            >
              Services
            </Link>
            <Link
              to="/appointments"
              className="block px-3 py-2 text-lg text-white hover:text-green-400 transition-colors duration-300"
            >
              Appointments
            </Link>
            <Link
              to="/my-vehicles"
              className="block px-3 py-2 text-lg text-white hover:text-green-400 transition-colors duration-300"
            >
              My Vehicles
            </Link>
            
            {isAuthenticated ? (
              <button
                onClick={handleProfileClick}
                className="flex items-center w-full text-left px-3 py-2 text-lg text-white hover:text-green-400 transition-colors duration-300"
              >
                <UserOutlined className="text-xl mr-2" />
                Profile
              </button>
            ) : (
              <>
                <Link
                  to="/login"
                  className="block px-3 py-2 text-lg text-white hover:text-green-400 transition-colors duration-300"
                >
                  Login
                </Link>
                <Link
                  to="/signup"
                  className="w-full text-left px-3 py-2 text-lg text-white bg-green-600 rounded hover:bg-green-700 transition-colors duration-300"
                >
                  Get Started
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar; 