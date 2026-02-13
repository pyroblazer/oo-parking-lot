/**
 * framer-motion Mock
 *
 * This file provides mock implementations of framer-motion components for testing.
 * The components are simplified to avoid complex animation logic in tests.
 */

import React from 'react';

// Mock AnimatePresence component
export const AnimatePresence: React.FC<{
  children: React.ReactNode;
  mode?: 'sync' | 'wait' | 'popLayout';
  initial?: boolean;
  onExitComplete?: () => void;
}> = ({ children, mode = 'wait', initial = true, onExitComplete }) => {
  // In tests, just render children immediately without animation delays
  if (initial) {
    return <>{children}</>;
  }
  return null;
};

// Mock motion components
export const motion = {
  div: React.FC<React.HTMLAttributes<HTMLDivElement> & {
    initial?: string | object;
    animate?: string | object;
    exit?: string | object;
    transition?: object;
    variants?: object;
    whileHover?: object;
    whileTap?: object;
    whileFocus?: object;
    className?: string;
    children?: React.ReactNode;
  }> = ({ children, className, ...props }) => (
    <div className={className} {...props}>
      {children}
    </div>
  ),
  
  h2: React.FC<React.HTMLAttributes<HTMLHeadingElement> & {
    initial?: string | object;
    animate?: string | object;
    exit?: string | object;
    transition?: object;
    variants?: object;
    className?: string;
    children?: React.ReactNode;
  }> = ({ children, className, ...props }) => (
    <h2 className={className} {...props}>
      {children}
    </h2>
  ),
  
  h3: React.FC<React.HTMLAttributes<HTMLHeadingElement> & {
    initial?: string | object;
    animate?: string | object;
    exit?: string | object;
    transition?: object;
    variants?: object;
    className?: string;
    children?: React.ReactNode;
  }> = ({ children, className, ...props }) => (
    <h3 className={className} {...props}>
      {children}
    </h3>
  ),
  
  h4: React.FC<React.HTMLAttributes<HTMLHeadingElement> & {
    initial?: string | object;
    animate?: string | object;
    exit?: string | object;
    transition?: object;
    variants?: object;
    className?: string;
    children?: React.ReactNode;
  }> = ({ children, className, ...props }) => (
    <h4 className={className} {...props}>
      {children}
    </h4>
  ),
  
  p: React.FC<React.HTMLAttributes<HTMLParagraphElement> & {
    initial?: string | object;
    animate?: string | object;
    exit?: string | object;
    transition?: object;
    variants?: object;
    className?: string;
    children?: React.ReactNode;
  }> = ({ children, className, ...props }) => (
    <p className={className} {...props}>
      {children}
    </p>
  ),
  
  form: React.FC<React.FormHTMLAttributes<HTMLFormElement> & {
    initial?: string | object;
    animate?: string | object;
    exit?: string | object;
    transition?: object;
    variants?: object;
    className?: string;
    children?: React.ReactNode;
    onSubmit?: React.FormEventHandler<HTMLFormElement>;
  }> = ({ children, className, onSubmit, ...props }) => (
    <form className={className} onSubmit={onSubmit} {...props}>
      {children}
    </form>
  ),
  
  button: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement> & {
    initial?: string | object;
    animate?: string | object;
    exit?: string | object;
    transition?: object;
    variants?: object;
    whileHover?: object;
    whileTap?: object;
    className?: string;
    children?: React.ReactNode;
  }> = ({ children, className, ...props }) => (
    <button className={className} {...props}>
      {children}
    </button>
  ),
  
  select: React.FC<React.SelectHTMLAttributes<HTMLSelectElement> & {
    initial?: string | object;
    animate?: string | object;
    exit?: string | object;
    transition?: object;
    variants?: object;
    whileHover?: object;
    whileFocus?: object;
    className?: string;
    children?: React.ReactNode;
  }> = ({ children, className, ...props }) => (
    <select className={className} {...props}>
      {children}
    </select>
  ),
  
  ul: React.FC<React.HTMLAttributes<HTMLUListElement> & {
    initial?: string | object;
    animate?: string | object;
    exit?: string | object;
    transition?: object;
    variants?: object;
    className?: string;
    children?: React.ReactNode;
  }> = ({ children, className, ...props }) => (
    <ul className={className} {...props}>
      {children}
    </ul>
  ),
  
  li: React.FC<React.HTMLAttributes<HTMLLIElement> & {
    initial?: string | object;
    animate?: string | object;
    exit?: string | object;
    transition?: object;
    variants?: object;
    className?: string;
    children?: React.ReactNode;
  }> = ({ children, className, ...props }) => (
    <li className={className} {...props}>
      {children}
    </li>
  ),
};

export default motion;
