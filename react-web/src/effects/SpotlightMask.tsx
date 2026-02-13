/**
 * Spotlight Mask Effect Component
 * 
 * This component creates a cursor-driven spotlight mask that reveals underlying
 * content or gradients as the user moves their cursor across the screen.
 */

import { useEffect, useState, useRef } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import type { SpotlightMaskConfig, CursorPosition } from '../types';

/**
 * SpotlightMask component properties
 */
interface SpotlightMaskProps extends Partial<SpotlightMaskConfig> {
  readonly children?: React.ReactNode;
  readonly className?: string;
  readonly gradient?: string;
  readonly maskSize?: number;
  readonly maskBlur?: number;
  readonly maskOpacity?: number;
}

/**
 * SpotlightMask component
 * 
 * Creates a cursor-driven spotlight mask effect that follows the user's cursor.
 * The mask reveals underlying content with customizable size, blur, and opacity.
 */
export default function SpotlightMask({
  children,
  className = '',
  gradient = 'radial-gradient(circle, rgba(255,255,255,0.1) 0%, rgba(0,0,0,0.8) 70%)',
  maskSize = 300,
  maskBlur = 50,
  maskOpacity = 0.9,
}: SpotlightMaskProps): JSX.Element {
  const [isHovering, setIsHovering] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Motion values for smooth cursor tracking
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  // Spring physics for smooth movement
  const springConfig = { damping: 25, stiffness: 300 };
  const smoothX = useSpring(mouseX, springConfig);
  const smoothY = useSpring(mouseY, springConfig);

  // Transform values for mask position
  const maskX = useTransform(smoothX, (value) => `calc(${value}px - ${maskSize / 2}px)`);
  const maskY = useTransform(smoothY, (value) => `calc(${value}px - ${maskSize / 2}px)`);

  // Handle cursor movement
  const handleMouseMove = (event: MouseEvent): void => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;

      mouseX.set(x);
      mouseY.set(y);
    }
  };

  // Handle mouse enter/leave
  const handleMouseEnter = (): void => setIsHovering(true);
  const handleMouseLeave = (): void => setIsHovering(false);

  // Set up event listeners
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.addEventListener('mousemove', handleMouseMove);
    container.addEventListener('mouseenter', handleMouseEnter);
    container.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      container.removeEventListener('mousemove', handleMouseMove);
      container.removeEventListener('mouseenter', handleMouseEnter);
      container.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [mouseX, mouseY]);

  return (
    <div
      ref={containerRef}
      className={`spotlight-mask-container ${className}`}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        pointerEvents: 'none',
        zIndex: 9999,
        overflow: 'hidden',
      }}
    >
      <motion.div
        className="spotlight-mask"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          background: gradient,
          opacity: isHovering ? maskOpacity : 0,
          maskImage: `radial-gradient(circle ${maskSize}px at ${maskX} ${maskY}, transparent, black)`,
          WebkitMaskImage: `radial-gradient(circle ${maskSize}px at ${maskX} ${maskY}, transparent, black)`,
          maskSize: 'cover',
          WebkitMaskSize: 'cover',
          transition: 'opacity 0.3s ease',
          filter: `blur(${maskBlur}px)`,
        }}
      >
        {children}
      </motion.div>
    </div>
  );
}

/**
 * SpotlightCard component - A card with spotlight effect
 */
interface SpotlightCardProps {
  readonly children: React.ReactNode;
  readonly className?: string;
  readonly spotlightColor?: string;
  readonly spotlightSize?: number;
}

export function SpotlightCard({
  children,
  className = '',
  spotlightColor = 'rgba(255, 255, 255, 0.1)',
  spotlightSize = 200,
}: SpotlightCardProps): JSX.Element {
  const [mousePosition, setMousePosition] = useState<CursorPosition>({ x: 0, y: 0 });
  const [isHovering, setIsHovering] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = (event: React.MouseEvent<HTMLDivElement>): void => {
    if (cardRef.current) {
      const rect = cardRef.current.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      setMousePosition({ x, y });
    }
  };

  const handleMouseEnter = (): void => setIsHovering(true);
  const handleMouseLeave = (): void => setIsHovering(false);

  return (
    <motion.div
      ref={cardRef}
      className={`spotlight-card ${className}`}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      whileHover={{ scale: 1.02 }}
      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
      style={{
        position: 'relative',
        overflow: 'hidden',
        borderRadius: '12px',
        background: 'rgba(255, 255, 255, 0.05)',
        backdropFilter: 'blur(10px)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
      }}
    >
      <motion.div
        className="spotlight-overlay"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
          background: `radial-gradient(circle ${spotlightSize}px at ${mousePosition.x}px ${mousePosition.y}px, ${spotlightColor}, transparent)`,
          opacity: isHovering ? 1 : 0,
          transition: 'opacity 0.3s ease',
        }}
      />
      {children}
    </motion.div>
  );
}

/**
 * SpotlightText component - Text with spotlight effect
 */
interface SpotlightTextProps {
  readonly children: React.ReactNode;
  readonly className?: string;
  readonly spotlightColor?: string;
}

export function SpotlightText({
  children,
  className = '',
  spotlightColor = 'rgba(255, 215, 0, 0.3)',
}: SpotlightTextProps): JSX.Element {
  const [mousePosition, setMousePosition] = useState<CursorPosition>({ x: 0, y: 0 });
  const [isHovering, setIsHovering] = useState(false);
  const textRef = useRef<HTMLSpanElement>(null);

  const handleMouseMove = (event: React.MouseEvent<HTMLSpanElement>): void => {
    if (textRef.current) {
      const rect = textRef.current.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      setMousePosition({ x, y });
    }
  };

  const handleMouseEnter = (): void => setIsHovering(true);
  const handleMouseLeave = (): void => setIsHovering(false);

  return (
    <motion.span
      ref={textRef}
      className={`spotlight-text ${className}`}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      whileHover={{ scale: 1.05 }}
      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
      style={{
        position: 'relative',
        display: 'inline-block',
      }}
    >
      <motion.span
        className="spotlight-text-overlay"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
          background: `radial-gradient(circle 100px at ${mousePosition.x}px ${mousePosition.y}px, ${spotlightColor}, transparent)`,
          opacity: isHovering ? 1 : 0,
          transition: 'opacity 0.3s ease',
          mixBlendMode: 'overlay',
        }}
      />
      {children}
    </motion.span>
  );
}
