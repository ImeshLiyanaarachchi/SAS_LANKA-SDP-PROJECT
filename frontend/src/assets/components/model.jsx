import React, { useState } from 'react';
import { Modal, Button, Input, Form } from 'antd';

const customModalStyles = `
  .ant-modal-content {
    border-radius: 12px;
    padding: 24px;
    background-color: #f9fbff;
  }

  .ant-modal-header {
    background-color: #98a7b3;
    border-radius: 12px 12px 0 0;
  }

  .ant-modal-title {
    font-size: 20px;
    color: white;
  }

  .ant-modal-body {
    padding: 20px 0;
  }

  .ant-btn-primary {
    background-color: #3f6688;
    border-color: #3f6688;
  }

  .ant-btn-primary:hover {
    background-color: #30506b;
    border-color: #30506b;
  }
`;

const CustomModalExample = () => {
  const [isModalVisible, setIsModalVisible] = useState(false);

  const showModal = () => setIsModalVisible(true);
  const handleOk = () => {
    console.log('Form submitted');
    setIsModalVisible(false);
  };
  const handleCancel = () => setIsModalVisible(false);

  return (
    <div style={{ padding: 24 }}>
      <style>{customModalStyles}</style>

      <Button type="primary" onClick={showModal}>
        Open Form Modal
      </Button>

      <Modal
        title="User Information"
        visible={isModalVisible}
        onOk={handleOk}
        onCancel={handleCancel}
        okText="Submit"
      >
        <Form layout="vertical">
          <Form.Item label="Name" name="name">
            <Input placeholder="Enter your name" />
          </Form.Item>
          <Form.Item label="Email" name="email">
            <Input placeholder="Enter your email" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default CustomModalExample;
