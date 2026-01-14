import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import LoginPanel from './components/LoginPanel';

const Dashboard = () => <div>Dashboard</div>;

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/login" element={<LoginPanel />} />
        <Route path="/mobile/login" element={<LoginPanel mode="mobile" />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
