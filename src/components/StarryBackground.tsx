import React, { useRef, useEffect, useState } from 'react';

interface Star {
  x: number;
  y: number;
  size: number;
  opacity: number;
  speed: number;
  vx: number;
  vy: number;
  color: string;
  fadeState: 'in' | 'visible' | 'out';
  fadeProgress: number;
}

interface StarryBackgroundProps {
  starsCount?: number;
  speed?: number;
  opacity?: number;
  show?: boolean;
  rightOnly?: boolean;
}

const StarryBackground: React.FC<StarryBackgroundProps> = ({
  starsCount = 150,
  speed = 0.2,
  opacity = 0.7,
  show = true,
  rightOnly = true,
}) => {
  const starFieldRef = useRef<Star[]>([]);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationRef = useRef<number | null>(null);
  const initializedRef = useRef<boolean>(false);
  
  const [dimensions, setDimensions] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 0,
    height: typeof window !== 'undefined' ? window.innerHeight : 0,
  });

  // 星星颜色数组，模拟x.ai的星星颜色
  const starColors = ['#ffffff', '#f8f8f8', '#eaeaea', '#d0d0d0', '#ccccff'];

  // 获取可绘制区域的边界
  const getDrawingBounds = () => {
    const canvasWidth = dimensions.width;
    const leftBoundary = rightOnly ? canvasWidth * 0.2 : 0; // 如果只在右侧显示，则左边界为屏幕宽度的20%
    return {
      left: leftBoundary,
      right: canvasWidth,
      top: 0,
      bottom: dimensions.height
    };
  };

  // 初始化星星数组
  const initializeStars = () => {
    if (!canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const bounds = getDrawingBounds();
    
    starFieldRef.current = Array.from({ length: starsCount }, () => {
      // 如果是右侧显示模式，将x的随机范围限制在右侧80%区域
      const x = bounds.left + Math.random() * (bounds.right - bounds.left);
      
      return {
        x: x,
        y: Math.random() * bounds.bottom,
        size: 0.2 + Math.random() * 0.8, // 更小的星星尺寸范围
        opacity: 0.1 + Math.random() * 0.7,
        speed: (0.01 + Math.random() * 0.03) * speed, // 增加速度
        vx: (Math.random() - 0.5) * 0.4 * speed, // 增加横向速度
        vy: (Math.random() - 0.5) * 0.4 * speed, // 增加纵向速度
        color: starColors[Math.floor(Math.random() * starColors.length)],
        fadeState: Math.random() < 0.7 ? 'visible' : 'in', // 初始有30%的星星处于淡入状态
        fadeProgress: Math.random() // 随机初始淡入进度
      };
    });
  };

  // 初始化画布和星星
  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');
    if (!context) return;

    // 设置画布宽高为窗口大小
    const updateCanvasSize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    updateCanvasSize();

    // 仅在首次渲染或starsCount/speed变化时初始化星星
    if (!initializedRef.current || starFieldRef.current.length !== starsCount) {
      initializeStars();
      initializedRef.current = true;
    }

    const handleResize = () => {
      setDimensions({
        width: window.innerWidth,
        height: window.innerHeight,
      });
      updateCanvasSize();
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [starsCount, speed, dimensions, rightOnly]);

  // 控制动画的useEffect
  useEffect(() => {
    if (!canvasRef.current) return;
    
    const animate = () => {
      if (!canvasRef.current) return;
      updateStars();
      drawStars();
      animationRef.current = requestAnimationFrame(animate);
    };

    // 只有在show为true时运行动画
    if (show) {
      animationRef.current = requestAnimationFrame(animate);
    }

    return () => {
      if (animationRef.current !== null) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
    };
  }, [show, opacity, speed]);

  const drawStars = () => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');
    if (!context) return;

    context.clearRect(0, 0, canvas.width, canvas.height);
    
    const bounds = getDrawingBounds();

    starFieldRef.current.forEach((star) => {
      // 只有在绘制边界内的星星才绘制
      if (star.x >= bounds.left && star.x <= bounds.right) {
        context.beginPath();
        context.fillStyle = star.color;
        
        // 根据淡入淡出状态调整不透明度
        let starOpacity = star.opacity * opacity;
        if (star.fadeState === 'in') {
          starOpacity *= star.fadeProgress;
        } else if (star.fadeState === 'out') {
          starOpacity *= (1 - star.fadeProgress);
        }
        
        context.globalAlpha = starOpacity;
        
        // 使用圆形绘制星星而不是矩形
        context.arc(star.x, star.y, star.size, 0, Math.PI * 2);
        context.fill();
      }
    });
  };

  const updateStars = () => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const bounds = getDrawingBounds();

    starFieldRef.current.forEach((star) => {
      // 更平滑的运动
      star.x += star.vx;
      star.y += star.vy;

      // 如果星星移出画布，则在另一侧重新进入
      // 对于只在右侧显示的情况，如果移出左边界，则从右边界重新进入
      if (star.x < bounds.left) {
        if (rightOnly) {
          star.x = bounds.right;
        } else {
          star.x = canvas.width;
        }
      }
      if (star.x > canvas.width) star.x = bounds.left;
      if (star.y < 0) star.y = canvas.height;
      if (star.y > canvas.height) star.y = 0;
      
      // 随机轻微改变方向，使运动更自然
      if (Math.random() < 0.01) {
        star.vx += (Math.random() - 0.5) * 0.02 * speed;
        star.vy += (Math.random() - 0.5) * 0.02 * speed;
        
        // 限制最大速度
        const maxSpeed = 0.5 * speed;
        const currentSpeed = Math.sqrt(star.vx * star.vx + star.vy * star.vy);
        if (currentSpeed > maxSpeed) {
          star.vx = (star.vx / currentSpeed) * maxSpeed;
          star.vy = (star.vy / currentSpeed) * maxSpeed;
        }
      }
      
      // 更新淡入淡出状态
      const fadeSpeed = 0.01; // 淡入淡出速度
      
      if (star.fadeState === 'in') {
        star.fadeProgress += fadeSpeed;
        if (star.fadeProgress >= 1) {
          star.fadeProgress = 1;
          star.fadeState = 'visible';
        }
      } else if (star.fadeState === 'out') {
        star.fadeProgress += fadeSpeed;
        if (star.fadeProgress >= 1) {
          // 淡出完成后重置星星
          star.fadeProgress = 0;
          star.fadeState = 'in';
          // 保证新生成的星星在可绘制区域内
          star.x = bounds.left + Math.random() * (bounds.right - bounds.left);
          star.y = Math.random() * canvas.height;
          star.size = 0.2 + Math.random() * 1.0;
          star.opacity = 0.1 + Math.random() * 0.7;
        }
      } else if (Math.random() < 0.0005) { // 随机触发淡出效果
        star.fadeState = 'out';
        star.fadeProgress = 0;
      }
    });
  };

  return (
    <canvas
      ref={canvasRef}
      width={dimensions.width}
      height={dimensions.height}
      className={`fixed inset-0 z-0 transition-opacity duration-1000 ${
        show ? 'opacity-100' : 'opacity-0'
      }`}
      style={{ pointerEvents: 'none' }}
    />
  );
};

export default StarryBackground; 