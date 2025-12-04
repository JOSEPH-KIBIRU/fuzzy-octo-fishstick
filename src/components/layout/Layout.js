// src/components/layout/Layout.jsx
import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';

const Layout = () => {
  console.log('✅ Layout component rendering');
  
  return (
    <div className="layout">
      <Sidebar />
      <div className="main">
        <Header />
        <div className="content">
          {/* Test div to verify Layout is working */}
          <div style={{
            background: '#e3f2fd',
            padding: '10px',
            marginBottom: '10px',
            borderRadius: '5px'
          }}>
            {/* <small>Layout is rendering | Path: {window.location.pathname}</small> */}
          </div>
          
          {/* This renders Dashboard, PettyCash, etc. */}
          <Outlet />
        </div>
      </div>
    </div>
  );
};

export default Layout;