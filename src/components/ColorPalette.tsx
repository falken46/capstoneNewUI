import React from 'react';
import { Link } from 'react-router-dom';

interface ColorBoxProps {
  color: string;
  name: string;
  hexCode: string;
}

const ColorBox: React.FC<ColorBoxProps> = ({ color, name, hexCode }) => {
  return (
    <div className="flex flex-col">
      <div 
        className="w-full h-16 rounded-md mb-2" 
        style={{ backgroundColor: hexCode }}
      ></div>
      <div className="text-sm font-medium">{name}</div>
      <div className="text-xs text-gray-400">{hexCode}</div>
    </div>
  );
};

interface ColorSectionProps {
  title: string;
  colors: { name: string; hexCode: string }[];
}

const ColorSection: React.FC<ColorSectionProps> = ({ title, colors }) => {
  return (
    <div className="mb-8">
      <h2 className="text-xl font-bold mb-4">{title}</h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
        {colors.map((color, index) => (
          <ColorBox 
            key={index} 
            color={`color-${index}`} 
            name={color.name} 
            hexCode={color.hexCode} 
          />
        ))}
      </div>
    </div>
  );
};

const ColorPalette: React.FC = () => {
  const backgroundColors = [
    { name: '深空背景', hexCode: '#0a0a14' },
    { name: '次背景', hexCode: '#121225' },
    { name: '卡片/面板背景', hexCode: '#181830' },
  ];

  const starColors = [
    { name: '纯白', hexCode: '#ffffff' },
    { name: '暖白', hexCode: '#f8f8f8' },
    { name: '淡灰', hexCode: '#eaeaea' },
    { name: '中灰', hexCode: '#d0d0d0' },
    { name: '淡紫', hexCode: '#ccccff' },
  ];

  const gradientColors = [
    { name: '金色', hexCode: 'rgb(255, 208, 134)' },
    { name: '亮橙', hexCode: 'rgb(255, 180, 120)' },
    { name: '深金', hexCode: 'rgb(230, 185, 110)' },
  ];

  const textColors = [
    { name: '主要文本', hexCode: '#ffffff' },
    { name: '次要文本', hexCode: '#cccccc' },
    { name: '提示文本', hexCode: '#9e9eb2' },
    { name: '强调/交互', hexCode: '#aeb9ff' },
    { name: '按钮/链接', hexCode: '#b29eff' },
  ];

  const functionColors = [
    { name: '成功/确认', hexCode: '#4ecdc4' },
    { name: '警告/提醒', hexCode: '#ffd166' },
    { name: '错误/危险', hexCode: '#ff6b6b' },
    { name: '信息/提示', hexCode: '#6e78ff' },
  ];

  return (
    <div className="min-h-screen bg-[#0a0a14] text-white p-6 md:p-12">
      <header className="mb-12">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">星空主题配色方案</h1>
          <Link to="/" className="px-4 py-2 bg-[#181830] hover:bg-[#252545] rounded-md transition-colors">
            返回首页
          </Link>
        </div>
        <p className="text-[#cccccc] max-w-3xl">
          这套配色方案设计用于创造神秘、高科技且优雅的氛围，非常适合星空主题界面。
          它既有足够的对比度确保可读性，又保持了和谐统一的视觉效果。
        </p>
      </header>

      <main>
        <ColorSection title="背景色彩" colors={backgroundColors} />
        <ColorSection title="星光色彩" colors={starColors} />
        <ColorSection title="金色能量渐变" colors={gradientColors} />
        <ColorSection title="文本和交互元素" colors={textColors} />
        <ColorSection title="功能色彩" colors={functionColors} />

        <div className="mt-12 p-6 bg-[#121225] rounded-lg">
          <h2 className="text-xl font-bold mb-4">渐变示例</h2>
          <div className="h-24 w-full rounded-md mb-6" style={{ 
            background: 'linear-gradient(45deg, #0a0a14, #121225, #181830)' 
          }}></div>
          <div className="h-24 w-full rounded-md mb-6" style={{ 
            background: 'linear-gradient(to right, rgb(255, 208, 134), rgb(255, 180, 120))' 
          }}></div>
          <div className="h-24 w-full rounded-md" style={{ 
            background: 'linear-gradient(to right, #6e78ff, #b29eff)' 
          }}></div>
        </div>
      </main>

      <footer className="mt-16 pt-8 border-t border-[#252545] text-[#9e9eb2] text-sm">
        <p>星空主题配色方案 © 2023</p>
      </footer>
    </div>
  );
};

export default ColorPalette; 