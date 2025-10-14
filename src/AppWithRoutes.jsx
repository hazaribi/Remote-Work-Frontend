import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import App from './App';
import JoinWorkspace from './components/JoinWorkspace';

function AppWithRoutes() {
  return (
    <Router>
      <Routes>
        <Route path="/join/:code" element={<JoinWorkspace />} />
        <Route path="/*" element={<App />} />
      </Routes>
    </Router>
  );
}

export default AppWithRoutes;