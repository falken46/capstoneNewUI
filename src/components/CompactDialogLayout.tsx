import React, { useState, useRef } from 'react';
import InputBox from './InputBox';
import ScrollingButtons, { ButtonData } from './ScrollingButtons';
import VariableProximity from './VariableProximity';

interface CompactDialogLayoutProps {
  onSubmit: (inputValue: string) => void;
}

/**
 * 紧凑对话布局组件
 * 显示在聊天界面中间，包含欢迎语和快捷操作按钮
 * 输入框宽度占满全宽
 */
const CompactDialogLayout: React.FC<CompactDialogLayoutProps> = ({ onSubmit }) => {
  const [inputValue, setInputValue] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputValue(e.target.value);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputValue.trim()) {
      onSubmit(inputValue);
      setInputValue('');
    }
  };
  
  // 定义快捷按钮数据
  const quickButtonsData: ButtonData[] = [
    {
      id: 1,
      text: "Research",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="me-2 text-[#6e6e6e]">
          <path d="M3 7V5a2 2 0 0 1 2-2h2"></path>
          <path d="M17 3h2a2 2 0 0 1 2 2v2"></path>
          <path d="M21 17v2a2 2 0 0 1-2 2h-2"></path>
          <path d="M7 21H5a2 2 0 0 1-2-2v-2"></path>
          <circle cx="12" cy="12" r="3"></circle>
          <path d="m16 16-1.9-1.9"></path>
        </svg>
      ),
      onClick: () => console.log("Research clicked")
    },
    {
      id: 2,
      text: "Create images",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="me-2 text-[#6e6e6e]">
          <path d="m14.622 17.897-10.68-2.913"></path>
          <path d="M18.376 2.622a1 1 0 1 1 3.002 3.002L17.36 9.643a.5.5 0 0 0 0 .707l.944.944a2.41 2.41 0 0 1 0 3.408l-.944.944a.5.5 0 0 1-.707 0L8.354 7.348a.5.5 0 0 1 0-.707l.944-.944a2.41 2.41 0 0 1 3.408 0l.944.944a.5.5 0 0 0 .707 0z"></path>
          <path d="M9 8c-1.804 2.71-3.97 3.46-6.583 3.948a.507.507 0 0 0-.302.819l7.32 8.883a1 1 0 0 0 1.185.204C12.735 20.405 16 16.792 16 15"></path>
        </svg>
      ),
      onClick: () => console.log("Create images clicked")
    },
    {
      id: 3,
      text: "How to",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="me-2 text-[#6e6e6e]">
          <path d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z"></path>
        </svg>
      ),
      onClick: () => console.log("How to clicked")
    },
    {
      id: 4,
      text: "Analyze",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="me-2 text-[#6e6e6e]">
          <line x1="12" x2="12" y1="20" y2="10"></line>
          <line x1="18" x2="18" y1="20" y2="4"></line>
          <line x1="6" x2="6" y1="20" y2="16"></line>
        </svg>
      ),
      onClick: () => console.log("Analyze clicked")
    },
    {
      id: 5,
      text: "Code",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="me-2 text-[#6e6e6e]">
          <polyline points="16 18 22 12 16 6"></polyline>
          <polyline points="8 6 2 12 8 18"></polyline>
        </svg>
      ),
      onClick: () => console.log("Code clicked")
    }
  ];

  // 变形文字效果的参数
  const fromSettings = "'wght' 400, 'wdth' 100, 'opsz' 14";
  const toSettings = "'wght' 700, 'wdth' 125, 'opsz' 36";

  return (
    <div className="flex flex-col items-center justify-center gap-6 @sm:gap-9 mt-[18vh]" ref={containerRef}>
      {/* 添加 Google Font 链接 */}
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Roboto+Flex:opsz,wdth,wght@8..144,25..151,100..1000&display=swap"
      />
      
      <div className="flex flex-col items-start justify-center w-full @sm:px-4 px-2 gap-6 @sm:gap-4 @xl:w-4/5 flex-initial pb-0 max-w-[51rem]">
        <h1 className="w-full text-3xl flex-col tracking-tight @sm:text-3xl text-white flex items-center justify-center text-center">
          {/* 分成两个独立的组件以确保换行显示 */}
          <VariableProximity
              label="Hello, I'm Draco. Ready to debug?"
              fromFontVariationSettings={fromSettings}
              toFontVariationSettings={toSettings}
              containerRef={containerRef}
              radius={80}
              falloff="exponential"
              className="text-white"
            />
        </h1>
        
        {/* 使用滚动按钮组件 */}
        <ScrollingButtons 
          buttonsData={quickButtonsData} 
          scrollSpeed={30} 
          className="@sm:hidden" 
        />
        
        {/* 输入框部分 */}
        <div className="w-full px-4 mt-2">
          <InputBox 
            inputValue={inputValue}
            onInputChange={handleInputChange}
            onSubmit={handleSubmit}
            placeholder="您想了解什么？"
            layoutMode="compact"
            containerClassName="w-full"
          />
        </div>
      </div>
    </div>
  );
};

export default CompactDialogLayout; 