import React, { ReactNode, useEffect, useState } from 'react';

interface FadeContentProps {
  children: ReactNode;
  show: boolean;
  duration?: number;
  className?: string;
  onFadeComplete?: () => void;
}

const FadeContent: React.FC<FadeContentProps> = ({
  children,
  show,
  duration = 500,
  className = '',
  onFadeComplete
}) => {
  const [shouldRender, setShouldRender] = useState(show);
  const [opacity, setOpacity] = useState(show ? 1 : 0);

  useEffect(() => {
    if (show) {
      setShouldRender(true);
      // Small delay to ensure shouldRender has taken effect
      setTimeout(() => {
        setOpacity(1);
      }, 10);
    } else {
      setOpacity(0);
      const timer = setTimeout(() => {
        setShouldRender(false);
        if (onFadeComplete) onFadeComplete();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [show, duration, onFadeComplete]);

  const style = {
    transition: `opacity ${duration}ms ease-in-out`,
    opacity: opacity
  };

  return shouldRender ? (
    <div style={style} className={className}>
      {children}
    </div>
  ) : null;
};

export default FadeContent; 