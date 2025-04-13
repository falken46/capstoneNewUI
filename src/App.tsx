import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import './App.css';
import Home from './components/home';
import ColorPalette from './components/ColorPalette';
import ChatInterface from './components/ChatInterface';

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/colors" element={<ColorPalette />} />
          <Route path="/chat" element={<ChatInterface />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App; 