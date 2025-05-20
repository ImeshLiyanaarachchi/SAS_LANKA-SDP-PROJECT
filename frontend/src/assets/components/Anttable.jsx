import React from "react";
import { Table, Tag } from "antd";

// Sample data
const data = [
  {
    key: "1",
    name: "John Doe",
    age: 32,
    address: "London",
    tags: ["developer", "cool"],
  },
  {
    key: "2",
    name: "Jane Smith",
    age: 28,
    address: "New York",
    tags: ["designer"],
  },
  {
    key: "3",
    name: "Sam Lee",
    age: 45,
    address: "Sydney",
    tags: ["manager", "strict"],
  },
];

// Table columns
const columns = [
  {
    title: "Name",
    dataIndex: "name",
    key: "name",
    sorter: (a, b) => a.name.localeCompare(b.name),
  },
  {
    title: "Age",
    dataIndex: "age",
    key: "age",
    sorter: (a, b) => a.age - b.age,
  },
  {
    title: "Address",
    dataIndex: "address",
    key: "address",
  },
  {
    title: "Tags",
    dataIndex: "tags",
    key: "tags",
    render: (_, { tags }) => (
      <>
        {tags.map((tag) => (
          <Tag color="blue" key={tag}>
            {tag.toUpperCase()}
          </Tag>
        ))}
      </>
    ),
  },
];

const AntTableDemo = () => {
  return (
    <>
      {/* Styling injected directly */}
      <style>{`
        .ant-table {
          background-color: transparent !important;
          color: white !important;
        }

        .ant-table-thead > tr > th {
          background-color:rgb(13, 16, 54) !important;
          color: white !important;
        }

        .ant-table-tbody > tr > td {
          background-color:rgb(10, 10, 84) !important;
          color: white !important;
        }

        .ant-pagination {
          color: white !important;
        }

        .ant-tag {
          color: white !important;
          background-color:rgb(219, 222, 18) !important;
          border-color:rgb(88, 149, 235) !important;
           font-size: 12px !important;       /* 🆙 Increases text size */
  padding: 6px 12px !important;     /* 🆙 Increases inner spacing */
  border-radius: 10px !important; /* ✅ Makes them fully rounded */
  font-weight: 800 !important;      /* Bold for visibility */
  transition: all 0.3s ease-in-out;
        }

        .ant-tag:hover {
  background-color: rgb(88, 149, 235) !important; /* blue on hover */
  color: black !important;                        /* change text color */
  transform: scale(1.05);                         /* slightly zoom on hover */
  cursor: pointer;
}



        .ant-table-tbody > tr:hover > td {
          background-color: #2a2b6a !important;
        }

        .ant-pagination-item-active {
          background-color: #1677ff !important;
          border-color: #1677ff !important;
          color: white !important;
        }
      `}</style>

      <div className="bg-[#0a0b1e] text-white min-h-screen p-6">
        <h2 className="text-xl font-semibold mb-4">User Table</h2>
        <Table
          columns={columns}
          dataSource={data}
          pagination={{ pageSize: 2 }}
          bordered
        />
      </div>
    </>
  );
};

export default AntTableDemo;
