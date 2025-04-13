import React, { useRef, useEffect, useState, ReactNode } from "react";

interface AnimatedContentProps {
  children: ReactNode;
  show: boolean;
  direction?: "up" | "down" | "left" | "right";
  distance?: number;
  duration?: number;
  delay?: number;
  onAnimationComplete?: () => void;
  className?: string;
}

const AnimatedContent: React.FC<AnimatedContentProps> = ({
  children,
  show,
  direction = "up",
  distance = 100,
  duration = 800,
  delay = 0,
  onAnimationComplete,
  className = ""
}) => {
  const [shouldRender, setShouldRender] = useState(show);
  const [animationState, setAnimationState] = useState<"entering" | "entered" | "exiting" | "exited">(
    show ? "entering" : "exited"
  );
  const timeoutRef = useRef<number | null>(null);

  useEffect(() => {
    // 清除任何现有的timeout
    if (timeoutRef.current !== null) {
      clearTimeout(timeoutRef.current);
    }

    if (show) {
      setShouldRender(true);
      
      // 短暂延迟以确保DOM更新
      timeoutRef.current = window.setTimeout(() => {
        setAnimationState("entering");
        
        // 动画完成后设置为entered状态
        timeoutRef.current = window.setTimeout(() => {
          setAnimationState("entered");
          if (onAnimationComplete) onAnimationComplete();
        }, duration);
      }, 50);
    } else {
      setAnimationState("exiting");
      
      // 等待动画完成后才移除元素
      timeoutRef.current = window.setTimeout(() => {
        setAnimationState("exited");
        setShouldRender(false);
        if (onAnimationComplete) onAnimationComplete();
      }, duration);
    }

    return () => {
      if (timeoutRef.current !== null) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [show, duration, onAnimationComplete]);
  
  if (!shouldRender) {
    return null;
  }

  // 根据动画状态和方向计算transform
  let transform;
  const isVertical = direction === "up" || direction === "down";
  const property = isVertical ? "Y" : "X";
  
  switch (animationState) {
    case "entering":
    case "entered":
      transform = `translate${property}(0)`;
      break;
    case "exiting":
    case "exited":
      if (direction === "up" || direction === "left") {
        transform = `translate${property}(-${distance}px)`;
      } else {
        transform = `translate${property}(${distance}px)`;
      }
      break;
    default:
      if (direction === "up" || direction === "left") {
        transform = `translate${property}(${distance}px)`;
      } else {
        transform = `translate${property}(-${distance}px)`;
      }
  }

  // 初始状态的transform
  let initialTransform;
  if (animationState === "entering") {
    if (direction === "up") {
      initialTransform = `translateY(${distance}px)`;
    } else if (direction === "down") {
      initialTransform = `translateY(-${distance}px)`;
    } else if (direction === "left") {
      initialTransform = `translateX(${distance}px)`;
    } else { // right
      initialTransform = `translateX(-${distance}px)`;
    }
  } else {
    initialTransform = transform;
  }

  const style = {
    transform: animationState === "entering" || animationState === "exiting" 
      ? transform 
      : initialTransform,
    opacity: animationState === "entering" || animationState === "entered" ? 1 : 0,
    transition: `transform ${duration}ms ease-out, opacity ${duration}ms ease-out`,
    transitionDelay: `${delay}ms`,
  };

  return (
    <div style={style} className={className}>
      {children}
    </div>
  );
};

export default AnimatedContent; 