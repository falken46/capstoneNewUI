import React, { useState, useRef } from 'react';

interface SpotlightCardProps {
  text?: string;
  onClick?: () => void;
  className?: string;
}

const SpotlightCard: React.FC<SpotlightCardProps> = ({
  text = 'Try Now',
  onClick,
  className = ''
}) => {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [opacity, setOpacity] = useState(0);
  const cardRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    setPosition({ x, y });
    setOpacity(1);
  };

  const handleMouseLeave = () => {
    setOpacity(0);
  };

  const handleClick = () => {
    if (onClick) {
      onClick();
    }
  };

  return (
    <div
      ref={cardRef}
      className={`relative overflow-hidden rounded-xl border border-primary/20 bg-background/50 py-10 px-8 shadow-lg backdrop-blur-sm hover:border-primary/40 transition-all duration-300 cursor-pointer ${className}`}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
    >
      <div 
        className="pointer-events-none absolute -inset-px opacity-0 transition duration-300" 
        style={{ 
          opacity, 
          background: `radial-gradient(600px circle at ${position.x}px ${position.y}px, rgba(255,255,255,.1), transparent 40%)` 
        }} 
      />
      <div className="relative z-10 flex items-center justify-center">
        <span className="text-3xl font-bold text-primary tracking-[0.25em] uppercase">{text}</span>
      </div>
    </div>
  );
};

export default SpotlightCard; 