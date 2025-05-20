import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import loginImg1 from '../images/loginbg.jpg';
import { toast } from 'react-toastify';
import axios from 'axios';

const ForgotPassword = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [codeSent, setCodeSent] = useState(false);
  const [verified, setVerified] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [resetSuccess, setResetSuccess] = useState(false);

  const handleSendCode = async (e) => {
    e.preventDefault();
    setLoading(true);

    if (!isValidEmail(email)) {
      toast.error('Please enter a valid email address');
      setLoading(false);
      return;
    }

    try {
      const response = await axios.post('http://localhost:3000/api/password/forgot-password', 
        { email },
        { withCredentials: true }
      );
      
      setCodeSent(true);
      toast.success('Verification code sent to your email');
    } catch (error) {
      console.error('Error requesting verification code:', error);
      toast.error(error.response?.data?.message || 'Failed to send verification code');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async (e) => {
    e.preventDefault();
    setVerifying(true);

    if (!verificationCode || verificationCode.length < 6) {
      toast.error('Please enter a valid verification code');
      setVerifying(false);
      return;
    }

    try {
      const response = await axios.post('http://localhost:3000/api/password/verify-code', 
        { email, code: verificationCode },
        { withCredentials: true }
      );
      
      setVerified(true);
      toast.success('Code verified successfully');
    } catch (error) {
      console.error('Error verifying code:', error);
      toast.error(error.response?.data?.message || 'Invalid or expired verification code');
    } finally {
      setVerifying(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    console.log('Reset password button clicked');
    setLoading(true);

    // Password validation
    if (newPassword.length < 8) {
      toast.error('Password must be at least 8 characters long');
      setLoading(false);
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match');
      setLoading(false);
      return;
    }

    try {
      console.log('Sending reset password request with:', { 
        email, 
        code: verificationCode, 
        password: newPassword 
      });
      
      const response = await axios.post('http://localhost:3000/api/password/reset-password', 
        { 
          email, 
          code: verificationCode, 
          password: newPassword 
        },
        { withCredentials: true }
      );
      
      console.log('Reset password response:', response);
      setResetSuccess(true);
      toast.success('Password reset successfully');
    } catch (error) {
      console.error('Error resetting password:', error);
      toast.error(error.response?.data?.message || 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  const isValidEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const renderEmailForm = () => (
    <form onSubmit={handleSendCode} className="space-y-6">
      <div>
        <label htmlFor="email" className="block text-sm font-medium text-gray-300">
          Email Address
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mt-1 block w-full px-4 py-3 bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-300"
          placeholder="Enter your email"
        />
      </div>

      <div>
        <button
          type="submit"
          disabled={loading}
          className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-all duration-300 transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Sending...' : 'Send Verification Code'}
        </button>
      </div>

      <p className="mt-4 text-center text-sm text-gray-400">
        Remember your password?{' '}
        <Link to="/login" className="font-medium text-green-500 hover:text-green-400 transition-colors duration-300">
          Back to login
        </Link>
      </p>
    </form>
  );

  const renderVerificationForm = () => (
    <form onSubmit={handleVerifyCode} className="space-y-6">
      <div>
        <label htmlFor="verificationCode" className="block text-sm font-medium text-gray-300">
          Verification Code
        </label>
        <input
          id="verificationCode"
          name="verificationCode"
          type="text"
          required
          value={verificationCode}
          onChange={(e) => setVerificationCode(e.target.value)}
          className="mt-1 block w-full px-4 py-3 bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-300"
          placeholder="Enter 6-digit code"
          maxLength={6}
        />
      </div>

      <div>
        <button
          type="submit"
          disabled={verifying}
          className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-all duration-300 transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {verifying ? 'Verifying...' : 'Verify Code'}
        </button>
      </div>

      <div className="flex justify-between items-center">
        <button
          type="button"
          onClick={() => setCodeSent(false)}
          className="text-sm text-green-500 hover:text-green-400"
        >
          Change Email
        </button>
        <button
          type="button"
          onClick={handleSendCode}
          disabled={loading}
          className="text-sm text-green-500 hover:text-green-400"
        >
          {loading ? 'Sending...' : 'Resend Code'}
        </button>
      </div>
    </form>
  );

  const renderPasswordResetForm = () => (
    <form onSubmit={handleResetPassword} className="space-y-6">
      <div>
        <label htmlFor="newPassword" className="block text-sm font-medium text-gray-300">
          New Password
        </label>
        <input
          id="newPassword"
          name="newPassword"
          type="password"
          required
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          className="mt-1 block w-full px-4 py-3 bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-300"
          placeholder="Enter new password"
        />
      </div>

      <div>
        <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-300">
          Confirm Password
        </label>
        <input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          required
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          className="mt-1 block w-full px-4 py-3 bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-300"
          placeholder="Confirm new password"
        />
      </div>

      <div>
        <button
          type="submit"
          disabled={loading}
          className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-all duration-300 transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Resetting Password...' : 'Reset Password'}
        </button>
      </div>
    </form>
  );

  const renderSuccessMessage = () => (
    <div className="space-y-6">
      <div className="bg-green-500/10 border border-green-500 rounded-lg p-4">
        <p className="text-green-400 text-center">
          Your password has been reset successfully!
        </p>
      </div>
      
      <button
        onClick={() => navigate('/login')}
        className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-all duration-300"
      >
        Log in with New Password
      </button>
    </div>
  );

  const renderCurrentStep = () => {
    if (resetSuccess) {
      return renderSuccessMessage();
    } else if (verified) {
      return renderPasswordResetForm();
    } else if (codeSent) {
      return renderVerificationForm();
    } else {
      return renderEmailForm();
    }
  };

  return (
    <div className="min-h-screen w-full relative flex items-center justify-center">
      {/* Background Image */}
      <div 
        className="absolute inset-0 z-0"
        style={{
          backgroundImage: `url(${loginImg1})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          filter: 'blur(2px)'
        }}
      />
      <div className="absolute inset-0 bg-black/50" />

      {/* Forgot Password Box */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="relative z-10 w-full max-w-md mx-4"
      >
        <div className="bg-gray-900/90 backdrop-blur-lg rounded-2xl shadow-2xl p-8 border border-gray-800">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">SAS LANKA</h1>
            <h2 className="text-xl font-semibold text-white">Reset Password</h2>
            <p className="mt-2 text-gray-400">
              {!codeSent 
                ? "Enter your email to receive a verification code" 
                : !verified
                  ? "Enter the verification code sent to your email"
                  : !resetSuccess
                    ? "Create a new password"
                    : "Password reset complete"}
            </p>
          </div>

          {renderCurrentStep()}
        </div>
      </motion.div>
    </div>
  );
};

export default ForgotPassword; 