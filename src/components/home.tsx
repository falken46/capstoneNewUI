import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import SpotlightCard from './SpotlightCard';
import FadeContent from './FadeContent';
import AnimatedContent from './AnimatedContent';
import StarryBackground from './StarryBackground';
import logo from '../assets/logo.png';
import dracoImage from '../assets/draco.png';

interface HomeProps {
  // 可以在这里定义组件的props类型
}

const Home: React.FC<HomeProps> = () => {
  const navigate = useNavigate();
  const [showGradients, setShowGradients] = useState(false);
  const [showElements, setShowElements] = useState(false);
  const [showHeader, setShowHeader] = useState(false);

  useEffect(() => {
    // 页面加载时，先显示渐变光效，然后显示导航栏，最后显示所有元素
    setTimeout(() => setShowGradients(true), 300);
    setTimeout(() => setShowHeader(true), 600);
    setTimeout(() => setShowElements(true), 900);
  }, []);

  const handleTryNowClick = () => {
    // 点击Try Now按钮时，先隐藏所有元素，然后隐藏导航栏，最后隐藏渐变光效
    setShowElements(false);
    setTimeout(() => setShowHeader(false), 400);
    setTimeout(() => setShowGradients(false), 400);
    setTimeout(() => {
      // 导航到聊天界面
      navigate('/chat');
    }, 1000);
  };

  return (
    <>
      <StarryBackground 
        starsCount={250} 
        speed={1} 
        opacity={0.7}
        show={showGradients} 
      />
      <header className="fixed inset-x-0 top-0 z-50 duration-200 group -translate-y-0">
        <div className="pointer-events-none absolute inset-x-0 h-32 lg:h-24 duration-200 bg-gradient-to-b from-black lg:from-black/75 opacity-0" style={{}}></div>
        <div className="hidden lg:block fixed inset-x-0 top-0 bg-background/25 backdrop-blur pointer-events-none opacity-0 lg:pt-20">
          <div className="border-y border-primary/10 h-full py-4">
            <div className="mx-auto w-full px-6 xl:max-w-7xl relative">
              <div className="flex gap-1.5 -mx-3"></div>
            </div>
          </div>
        </div>
        <div className="mx-auto w-full px-6 xl:max-w-7xl relative">
          <nav className="flex items-center justify-between gap-4 duration-200 py-4 lg:h-20">
            <FadeContent show={showHeader} duration={800}>
              <a aria-label="Draco Homepage" href="/" className="flex items-center gap-2">
                <img src={logo} alt="Draco Logo" className="h-8 w-auto" />
                <span className="text-primary font-bold text-xl tracking-wide">Draco</span>
              </a>
            </FadeContent>
            <FadeContent show={showHeader} duration={800}>
              <div className="flex-grow flex items-center justify-center">
                <h2 className="text-primary font-mono text-2xl tracking-wider">NEXT-GEN AI DEBUGGING ASSISTANT</h2>
              </div>
            </FadeContent>
          </nav>
        </div>
      </header>

      <div className="relative h-svh w-full border-b border-border pb-px overflow-hidden md:overflow-x-hidden">
        <div className="relative w-full h-full">
          <div className="mx-auto w-full px-6 xl:max-w-7xl flex h-full flex-col">
            <div className="absolute -inset-y-[25%] -right-24 flex w-[100vw] flex-col xl:-right-6 xl:w-[1200px]" style={{ maskImage: "linear-gradient(to right, rgba(255, 255, 255, 0), rgb(255, 255, 255))", opacity: 1, transform: "none" }}>
              <div className="flex flex-col w-full h-full blur">
                <FadeContent show={showGradients} duration={800} className="grow">
                  <div className="w-full h-full" style={{ background: "conic-gradient(from 180deg at 99% 40% in lab, rgb(255, 255, 255) 18deg, rgb(255, 208, 134) 36deg, rgba(17, 17, 17, 0) 90deg, rgba(17, 17, 17, 0) 342deg, rgb(255, 255, 255) 360deg)" }}></div>
                </FadeContent>
                <FadeContent show={showGradients} duration={800} className="grow">
                  <div className="w-full h-full" style={{ background: "conic-gradient(from 0deg at 99% 60% in lab, rgb(255, 255, 255) 0deg, rgba(17, 17, 17, 0) 18deg, rgba(17, 17, 17, 0) 270deg, rgb(255, 208, 134) 324deg, rgb(255, 255, 255) 342deg)" }}></div>
                </FadeContent>
              </div>
              <canvas className="absolute inset-0 h-full w-full" width="1028" height="1195"></canvas>
            </div>
            <div className="relative w-full flex flex-col justify-center items-center h-full z-20 pt-24 md:pt-8">
              <div className="w-full max-w-5xl mx-auto flex flex-col items-center mt-0 sm:-mt-8 md:-mt-12 lg:-mt-16">
                <AnimatedContent 
                  show={showElements} 
                  direction="right" 
                  distance={100} 
                  duration={800}
                >
                  <div style={{ opacity: 1, transform: "none" }} className="w-full">
                    <img 
                      alt="Draco AI Assistant" 
                      loading="lazy" 
                      className="w-full max-w-full pointer-events-none select-none" 
                      style={{ color: "transparent", maskImage: "linear-gradient(30deg, rgba(255,255,255,0) 15%, rgba(255,255,255, 1), rgba(255,255,255, 1))" }} 
                      src={dracoImage} 
                    />
                  </div>
                </AnimatedContent>
                <AnimatedContent
                  show={showElements}
                  direction="left"
                  distance={100}
                  duration={800}
                >
                  <div className="flex justify-center relative z-10 w-full mt-4 sm:mt-6 md:mt-8" style={{ opacity: 1 }}>
                    <div className="w-full max-w-xs sm:max-w-sm">
                      <SpotlightCard text="Try Now" onClick={handleTryNowClick} />
                    </div>
                  </div>
                </AnimatedContent>
              </div>
            </div>
            <div className="relative flex items-end justify-center gap-6 py-6 md:py-10 z-10 lg:min-h-[120px] w-full">
              <div className="flex flex-col items-center gap-6 sm:gap-8 lg:gap-12 md:flex-row">
                <div className="max-w-lg text-center">
                  <AnimatedContent
                    show={showElements}
                    direction="left"
                    distance={100}
                    duration={800}
                  >
                    <div className="hidden sm:block text-xl">Your AI partner in every bug battle</div>
                  </AnimatedContent>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Home; 