import React from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import AdminDashboard from './pages/AdminDashboard';
import QrLanding from './pages/QrLanding';

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/role" element={<QrLanding />} />
        <Route path="/qr/:mac" element={<QrLanding />} />
        {/* Fallback route */}
        <Route path="*" element={<Home />} />
      </Routes>
    </HashRouter>
  );
}
