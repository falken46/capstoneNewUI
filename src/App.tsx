import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import './App.css';
import Home from './components/home';
import ColorPalette from './components/ColorPalette';
import ChatInterface from './components/ChatInterface';
import pyodideService from './utils/pyodideService';

function App() {
  // 预加载 Pyodide
  useEffect(() => {
    const preloadPyodide = async () => {
      try {
        // 在背景中启动 Pyodide 加载过程
        pyodideService.initPyodide().catch(err => {
          console.warn('Pyodide 预加载失败，将在运行代码时重试', err);
        });
      } catch (error) {
        console.warn('Pyodide 预加载过程出错', error);
      }
    };
    
    // 在页面加载后立即开始加载 Pyodide
    preloadPyodide();
  }, []);

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