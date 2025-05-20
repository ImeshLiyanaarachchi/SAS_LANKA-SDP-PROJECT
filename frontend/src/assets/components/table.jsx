import React from 'react';
import { Table, Tag } from 'antd';

const dataSource = [
  {
    key: '1',
    name: 'John Doe',
    age: 32,
    address: 'New York',
    tags: ['developer', 'javascript'],
  },
  {
    key: '2',
    name: 'Jane Smith',
    age: 28,
    address: 'London',
    tags: ['designer'],
  },
  {
    key: '3',
    name: 'Alice Johnson',
    age: 36,
    address: 'Colombo',
    tags: ['manager', 'team lead'],
  },
];

// Column setup
const columns = [
  {
    title: 'Name',
    dataIndex: 'name',
    key: 'name',
    sorter: (a, b) => a.name.localeCompare(b.name),
  },
  {
    title: 'Age',
    dataIndex: 'age',
    key: 'age',
    sorter: (a, b) => a.age - b.age,
  },
  {
    title: 'Address',
    dataIndex: 'address',
    key: 'address',
  },
  {
    title: 'Tags',
    key: 'tags',
    dataIndex: 'tags',
    render: (_, { tags }) => (
      <>
        {tags.map(tag => (
          <Tag color="blue" key={tag} style={{ borderRadius: '16px', padding: '2px 10px', fontSize: '12px' }}>
            {tag.toUpperCase()}
          </Tag>
        ))}
      </>
    ),
  },
];

const tableStyle = {
  background: 'white',
  padding: 24,
  borderRadius: 20,
  boxShadow: '0 4px 20px rgb(185, 206, 30)',
};

const headerStyle = {
  fontSize: '24px',
  marginBottom: '50px',
  color: 'blue',
};

// Custom styling override using Ant Design classNames
const customAntTableCSS = `
  .ant-table {
    background-color: white !important;
    border-radius: 12px;
    overflow: hidden;
  }
  .ant-table-thead > tr > th {
    background-color:rgb(152, 167, 179) !important;
    color:rgb(0, 0, 0) !important;
    font-weight: 600;
    font-size: 18px;
  }
.ant-table-tbody > tr:hover > td {
  background-color: rgba(118, 241, 208, 0.66) !important;
  color: white !important;
}
  .ant-table-tbody > tr:nth-child() {
    background-color:rgb(162, 61, 61) !important;
  }
`;

const MyAntTable = () => {
  return (
    <div style={tableStyle}>
      <style>{customAntTableCSS}</style> {/* Inject custom CSS */}
      <h2 style={headerStyle}>User Info Table</h2>
      <Table
        dataSource={dataSource}
        columns={columns}
        pagination={{ pageSize: 2 }}
        bordered
      />
    </div>
  );
};

export default MyAntTable;
