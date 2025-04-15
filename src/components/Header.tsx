import React, { useState, useRef, useEffect } from 'react';
import logo from '../assets/logo.png';
import openaiService from '../utils/openaiService';

// 定义模型类型接口
export interface ModelOption {
  name: string;
  type: string;
  displayName: string;
}

interface HeaderProps {
  onNewChat?: () => void;
  onSidebarToggle?: () => void;
  isSidebarOpen?: boolean;
  onLogoClick?: () => void;
  selectedModel?: ModelOption;
  onModelChange?: (model: ModelOption) => void;
}

/**
 * Header组件
 * 透明背景，左侧包含控制按钮，右侧包含logo
 */
const Header: React.FC<HeaderProps> = ({ 
  onNewChat, 
  onSidebarToggle, 
  isSidebarOpen, 
  onLogoClick,
  selectedModel,
  onModelChange 
}) => {
  const [isModelMenuOpen, setIsModelMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  
  // 定义可用的模型
  const availableModels: ModelOption[] = [
    { name: 'llama3', type: 'ollama', displayName: 'Llama 3' },
    { name: 'qwen2.5-coder', type: 'ollama', displayName: 'Qwen 2.5 Coder' },
    { name: 'gpt-4o', type: 'openai', displayName: 'GPT-4o' },
    { name: 'claude-3-5-sonnet', type: 'anthropic', displayName: 'Claude 3.5' }
  ];

  // 使用传入的selectedModel，或者默认使用第一个模型
  const currentModel = selectedModel || availableModels[0];

  // 按类型分组模型
  const modelsByType: {[key: string]: ModelOption[]} = availableModels.reduce((acc, model) => {
    if (!acc[model.type]) {
      acc[model.type] = [];
    }
    acc[model.type].push(model);
    return acc;
  }, {} as {[key: string]: ModelOption[]});

  // 获取模型提供商显示名称
  const getProviderName = (type: string): string => {
    switch(type) {
      case 'ollama': return 'Ollama';
      case 'openai': return 'OpenAI';
      case 'anthropic': return 'Anthropic';
      default: return type.charAt(0).toUpperCase() + type.slice(1);
    }
  };

  // 获取模型提供商图标
  const getProviderIcon = (type: string): React.ReactNode => {
    switch(type) {
      case 'ollama':
        return (
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" className="text-green-400">
            <path d="M8 2a6 6 0 100 12A6 6 0 008 2zm0 11a5 5 0 110-10 5 5 0 010 10z" />
            <path d="M8 4a4 4 0 100 8 4 4 0 000-8zm0 7a3 3 0 110-6 3 3 0 010 6z" />
          </svg>
        );
      case 'openai':
        return (
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" className="text-blue-400">
            <path d="M8 1.333A6.667 6.667 0 108 14.667 6.667 6.667 0 008 1.333zM8 13a5 5 0 110-10 5 5 0 010 10z" />
            <path d="M11 8a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        );
      case 'anthropic':
        return (
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" className="text-purple-400">
            <path d="M4.5 2a1.5 1.5 0 100 3 1.5 1.5 0 000-3zM11.5 2a1.5 1.5 0 100 3 1.5 1.5 0 000-3zM8 5a1.5 1.5 0 100 3 1.5 1.5 0 000-3zM4.5 11a1.5 1.5 0 100 3 1.5 1.5 0 000-3zM11.5 11a1.5 1.5 0 100 3 1.5 1.5 0 000-3z" />
            <path d="M4.5 5.5L8 7l3.5-1.5M4.5 10.5L8 9l3.5 1.5" />
          </svg>
        );
      default:
        return (
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" className="text-gray-400">
            <path d="M8 2a6 6 0 100 12A6 6 0 008 2z" />
          </svg>
        );
    }
  };

  const toggleModelMenu = () => {
    setIsModelMenuOpen(!isModelMenuOpen);
  };

  const selectModel = (model: ModelOption) => {
    if (onModelChange) {
      onModelChange(model);
    }
    setIsModelMenuOpen(false);
  };

  // 点击外部关闭菜单
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsModelMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // 处理新建聊天按钮点击
  const handleNewChat = () => {
    if (onNewChat) {
      onNewChat();
    }
  };

  // 处理侧边栏按钮点击
  const handleSidebarToggle = () => {
    if (onSidebarToggle) {
      onSidebarToggle();
    }
  };

  // 处理Logo点击
  const handleLogoClick = (e: React.MouseEvent) => {
    if (onLogoClick) {
      e.preventDefault(); // 阻止默认的链接跳转行为
      onLogoClick();
    }
  };

  return (
    <header className="w-full py-3 px-4 flex justify-between items-center bg-transparent z-50">
      {/* 左侧控制区域 */}
      <div className="flex items-center relative" ref={menuRef}>
        {/* 侧边栏按钮 - 仅在侧边栏关闭时显示 */}
        {!isSidebarOpen && (
          <button 
            aria-label="打开边栏" 
            className="text-white focus-visible:bg-[#424242] hover:bg-[#424242] disabled:text-gray-600 h-10 rounded-lg px-2 focus-visible:outline-0"
            onClick={handleSidebarToggle}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="icon-xl-heavy">
              <path fillRule="evenodd" clipRule="evenodd" d="M8.85719 3H15.1428C16.2266 2.99999 17.1007 2.99998 17.8086 3.05782C18.5375 3.11737 19.1777 3.24318 19.77 3.54497C20.7108 4.02433 21.4757 4.78924 21.955 5.73005C22.2568 6.32234 22.3826 6.96253 22.4422 7.69138C22.5 8.39925 22.5 9.27339 22.5 10.3572V13.6428C22.5 14.7266 22.5 15.6008 22.4422 16.3086C22.3826 17.0375 22.2568 17.6777 21.955 18.27C21.4757 19.2108 20.7108 19.9757 19.77 20.455C19.1777 20.7568 18.5375 20.8826 17.8086 20.9422C17.1008 21 16.2266 21 15.1428 21H8.85717C7.77339 21 6.89925 21 6.19138 20.9422C5.46253 20.8826 4.82234 20.7568 4.23005 20.455C3.28924 19.9757 2.52433 19.2108 2.04497 18.27C1.74318 17.6777 1.61737 17.0375 1.55782 16.3086C1.49998 15.6007 1.49999 14.7266 1.5 13.6428V10.3572C1.49999 9.27341 1.49998 8.39926 1.55782 7.69138C1.61737 6.96253 1.74318 6.32234 2.04497 5.73005C2.52433 4.78924 3.28924 4.02433 4.23005 3.54497C4.82234 3.24318 5.46253 3.11737 6.19138 3.05782C6.89926 2.99998 7.77341 2.99999 8.85719 3ZM6.35424 5.05118C5.74907 5.10062 5.40138 5.19279 5.13803 5.32698C4.57354 5.6146 4.1146 6.07354 3.82698 6.63803C3.69279 6.90138 3.60062 7.24907 3.55118 7.85424C3.50078 8.47108 3.5 9.26339 3.5 10.4V13.6C3.5 14.7366 3.50078 15.5289 3.55118 16.1458C3.60062 16.7509 3.69279 17.0986 3.82698 17.362C4.1146 17.9265 4.57354 18.3854 5.13803 18.673C5.40138 18.8072 5.74907 18.8994 6.35424 18.9488C6.97108 18.9992 7.76339 19 8.9 19H9.5V5H8.9C7.76339 5 6.97108 5.00078 6.35424 5.05118ZM11.5 5V19H15.1C16.2366 19 17.0289 18.9992 17.6458 18.9488C18.2509 18.8994 18.5986 18.8072 18.862 18.673C19.4265 18.3854 19.8854 17.9265 20.173 17.362C20.3072 17.0986 20.3994 16.7509 20.4488 16.1458C20.4992 15.5289 20.5 14.7366 20.5 13.6V10.4C20.5 9.26339 20.4992 8.47108 20.4488 7.85424C20.3994 7.24907 20.3072 6.90138 20.173 6.63803C19.8854 6.07354 19.4265 5.6146 18.862 5.32698C18.5986 5.19279 18.2509 5.10062 17.6458 5.05118C17.0289 5.00078 16.2366 5 15.1 5H11.5ZM5 8.5C5 7.94772 5.44772 7.5 6 7.5H7C7.55229 7.5 8 7.94772 8 8.5C8 9.05229 7.55229 9.5 7 9.5H6C5.44772 9.5 5 9.05229 5 8.5ZM5 12C5 11.4477 5.44772 11 6 11H7C7.55229 11 8 11.4477 8 12C8 12.5523 7.55229 13 7 13H6C5.44772 13 5 12.5523 5 12Z" fill="currentColor"></path>
            </svg>
          </button>
        )}

        {/* 新建聊天按钮 - 仅在侧边栏关闭时显示 */}
        {!isSidebarOpen && (
          <button 
            aria-label="新聊天" 
            className="text-white focus-visible:bg-[#424242] hover:bg-[#424242] disabled:text-gray-600 h-10 rounded-lg px-2 focus-visible:outline-0"
            onClick={handleNewChat}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg" className="icon-xl-heavy text-white">
              <path d="M15.6729 3.91287C16.8918 2.69392 18.8682 2.69392 20.0871 3.91287C21.3061 5.13182 21.3061 7.10813 20.0871 8.32708L14.1499 14.2643C13.3849 15.0293 12.3925 15.5255 11.3215 15.6785L9.14142 15.9899C8.82983 16.0344 8.51546 15.9297 8.29289 15.7071C8.07033 15.4845 7.96554 15.1701 8.01005 14.8586L8.32149 12.6785C8.47449 11.6075 8.97072 10.615 9.7357 9.85006L15.6729 3.91287ZM18.6729 5.32708C18.235 4.88918 17.525 4.88918 17.0871 5.32708L11.1499 11.2643C10.6909 11.7233 10.3932 12.3187 10.3014 12.9613L10.1785 13.8215L11.0386 13.6986C11.6812 13.6068 12.2767 13.3091 12.7357 12.8501L18.6729 6.91287C19.1108 6.47497 19.1108 5.76499 18.6729 5.32708ZM11 3.99929C11.0004 4.55157 10.5531 4.99963 10.0008 5.00007C9.00227 5.00084 8.29769 5.00827 7.74651 5.06064C7.20685 5.11191 6.88488 5.20117 6.63803 5.32695C6.07354 5.61457 5.6146 6.07351 5.32698 6.63799C5.19279 6.90135 5.10062 7.24904 5.05118 7.8542C5.00078 8.47105 5 9.26336 5 10.4V13.6C5 14.7366 5.00078 15.5289 5.05118 16.1457C5.10062 16.7509 5.19279 17.0986 5.32698 17.3619C5.6146 17.9264 6.07354 18.3854 6.63803 18.673C6.90138 18.8072 7.24907 18.8993 7.85424 18.9488C8.47108 18.9992 9.26339 19 10.4 19H13.6C14.7366 19 15.5289 18.9992 16.1458 18.9488C16.7509 18.8993 17.0986 18.8072 17.362 18.673C17.9265 18.3854 18.3854 17.9264 18.673 17.3619C18.7988 17.1151 18.8881 16.7931 18.9393 16.2535C18.9917 15.7023 18.9991 14.9977 18.9999 13.9992C19.0003 13.4469 19.4484 12.9995 20.0007 13C20.553 13.0004 21.0003 13.4485 20.9999 14.0007C20.9991 14.9789 20.9932 15.7808 20.9304 16.4426C20.8664 17.116 20.7385 17.7136 20.455 18.2699C19.9757 19.2107 19.2108 19.9756 18.27 20.455C17.6777 20.7568 17.0375 20.8826 16.3086 20.9421C15.6008 21 14.7266 21 13.6428 21H10.3572C9.27339 21 8.39925 21 7.69138 20.9421C6.96253 20.8826 6.32234 20.7568 5.73005 20.455C4.78924 19.9756 4.02433 19.2107 3.54497 18.2699C3.24318 17.6776 3.11737 17.0374 3.05782 16.3086C2.99998 15.6007 2.99999 14.7266 3 13.6428V10.3572C2.99999 9.27337 2.99998 8.39922 3.05782 7.69134C3.11737 6.96249 3.24318 6.3223 3.54497 5.73001C4.02433 4.7892 4.78924 4.0243 5.73005 3.54493C6.28633 3.26149 6.88399 3.13358 7.55735 3.06961C8.21919 3.00673 9.02103 3.00083 9.99922 3.00007C10.5515 2.99964 10.9996 3.447 11 3.99929Z" fill="currentColor"></path>
            </svg>
          </button>
        )}

        {/* 模型选择下拉菜单 */}
        <button 
          aria-label={`模型选择器，当前模型为 ${currentModel.displayName}`} 
          type="button"
          className="group flex cursor-pointer items-center gap-1 rounded-lg py-1.5 px-3 text-lg hover:bg-[#424242] font-semibold text-white overflow-hidden whitespace-nowrap"
          onClick={toggleModelMenu}
        >
          <div className="flex items-center gap-2">
            {getProviderIcon(currentModel.type)}
            <span className="text-white">{currentModel.displayName}</span>
          </div>
          <svg 
            width="20" 
            height="20" 
            viewBox="0 0 24 24" 
            fill="none" 
            xmlns="http://www.w3.org/2000/svg" 
            className={`text-white transform transition-transform duration-300 ${isModelMenuOpen ? 'rotate-180' : ''}`}
          >
            <path fillRule="evenodd" clipRule="evenodd" d="M5.29289 9.29289C5.68342 8.90237 6.31658 8.90237 6.70711 9.29289L12 14.5858L17.2929 9.29289C17.6834 8.90237 18.3166 8.90237 18.7071 9.29289C19.0976 9.68342 19.0976 10.3166 18.7071 10.7071L12.7071 16.7071C12.5196 16.8946 12.2652 17 12 17C11.7348 17 11.4804 16.8946 11.2929 16.7071L5.29289 10.7071C4.90237 10.3166 4.90237 9.68342 5.29289 9.29289Z" fill="currentColor"></path>
          </svg>
        </button>
        
        {/* 模型下拉菜单 - 添加了动画和改进的样式 */}
        <div 
          className={`absolute top-14 left-0 overflow-hidden transition-all duration-300 ease-in-out transform origin-top-left z-10 ${
            isModelMenuOpen 
              ? 'opacity-100 scale-100 translate-y-2' 
              : 'opacity-0 scale-95 -translate-y-2 pointer-events-none'
          }`}
        >
          <div className="bg-[#2D2D2D] border border-[#3D3D3D] rounded-xl shadow-xl w-72 overflow-hidden">
            <div className="p-1">
              {Object.keys(modelsByType).map((type, index) => (
                <div key={type} className={index > 0 ? 'mt-1' : ''}>
                  <div className="px-3 py-2 text-sm text-gray-400 font-medium flex items-center">
                    {getProviderIcon(type)}
                    <span className="ml-2">{getProviderName(type)}</span>
                  </div>
                  <div className="mb-1">
                    {modelsByType[type].map(model => (
                      <div 
                        key={model.name}
                        className={`flex items-center px-3 py-2 cursor-pointer rounded-lg mx-1 hover:bg-[#3D3D3D] text-white ${
                          currentModel.name === model.name ? 'bg-[#3D3D3D]' : ''
                        }`}
                        onClick={() => selectModel(model)}
                      >
                        <div className="flex-1 flex items-center">
                          <span className="ml-2">{model.displayName}</span>
                        </div>
                        {currentModel.name === model.name && (
                          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-blue-400">
                            <path d="M13.3334 4L6.00008 11.3333L2.66675 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 右侧Logo区域 - 修改为使用自定义点击处理函数 */}
      <a 
        aria-label="Draco Homepage" 
        href="/" 
        className="flex items-center gap-2"
        onClick={handleLogoClick}
      >
        <img src={logo} alt="Draco Logo" className="h-8 w-auto" />
        <span className="text-white font-bold text-xl tracking-wide">Draco</span>
      </a>
    </header>
  );
};

export default Header;