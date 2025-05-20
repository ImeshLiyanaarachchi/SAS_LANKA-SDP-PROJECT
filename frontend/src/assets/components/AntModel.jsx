import React, { useState } from "react";
import { Modal, Button } from "antd";

const AntModalDemo = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const showModal = () => {
    setIsModalOpen(true);
  };

  const handleOk = () => {
    setIsModalOpen(false);
  };

  const handleCancel = () => {
    setIsModalOpen(false);
  };

  return (
    <div className="bg-[#0a0b1e] text-white min-h-screen flex items-center justify-center p-6">
      {/* Custom Styling */}
      <style>{`
        .ant-modal-content {
          background-color: #1a1b4b !important;
          color: white;
        }
        .ant-modal-header {
          background-color: #1a1b4b !important;
          border-bottom: 1px solid #333;
        }
        .ant-modal-title {
          color: white !important;
          font-size: 20px !important;
        }

        /* Confirm button (Primary) */
        .ant-btn-primary {
          background-color: #28a745 !important; /* ✅ green */
          border-color: #28a745 !important;
          font-size: 16px !important;
          font-weight: 600;
        }

        /* Cancel button (Default) */
        .ant-btn-default {
          color: #ccc !important;
          border-color: #444 !important;
          font-size: 14px !important;
          font-weight: 500;
        }

        .ant-btn-default:hover {
          color: white !important;
          border-color: #888 !important;
        }
      `}</style>

      {/* Trigger Button */}
      <Button type="primary" onClick={showModal}>
        Open Modal
      </Button>

      {/* Modal */}
      <Modal
        title="Welcome to the Ant Modal!"
        open={isModalOpen}
        onOk={handleOk}
        onCancel={handleCancel}
        okText="Confirm"
        cancelText="Close"
      >
        <p>This is a customizable modal using Ant Design!</p>
        <p>You can put any content inside here.</p>
      </Modal>
    </div>
  );
};

export default AntModalDemo;
