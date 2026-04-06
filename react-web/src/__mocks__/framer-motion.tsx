/**
 * framer-motion Mock
 *
 * This file provides mock implementations of framer-motion components for testing.
 * The components are simplified to avoid complex animation logic in tests.
 */

import React from 'react';

interface MotionProps {
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
}

// Mock AnimatePresence component
export const AnimatePresence: React.FC<{
  children: React.ReactNode;
  mode?: 'sync' | 'wait' | 'popLayout';
  initial?: boolean;
  onExitComplete?: () => void;
}> = ({ children, initial = true }) => {
  // In tests, just render children immediately without animation delays
  if (initial) {
    return <>{children}</>;
  }
  return null;
};

// Mock motion components
const MotionDiv = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement> & MotionProps>(
  ({ children, className, ...props }, ref) => (
    <div ref={ref} className={className} {...props}>
      {children}
    </div>
  )
);
MotionDiv.displayName = 'motion.div';

const MotionH2 = React.forwardRef<HTMLHeadingElement, React.HTMLAttributes<HTMLHeadingElement> & MotionProps>(
  ({ children, className, ...props }, ref) => (
    <h2 ref={ref} className={className} {...props}>
      {children}
    </h2>
  )
);
MotionH2.displayName = 'motion.h2';

const MotionH3 = React.forwardRef<HTMLHeadingElement, React.HTMLAttributes<HTMLHeadingElement> & MotionProps>(
  ({ children, className, ...props }, ref) => (
    <h3 ref={ref} className={className} {...props}>
      {children}
    </h3>
  )
);
MotionH3.displayName = 'motion.h3';

const MotionH4 = React.forwardRef<HTMLHeadingElement, React.HTMLAttributes<HTMLHeadingElement> & MotionProps>(
  ({ children, className, ...props }, ref) => (
    <h4 ref={ref} className={className} {...props}>
      {children}
    </h4>
  )
);
MotionH4.displayName = 'motion.h4';

const MotionP = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement> & MotionProps>(
  ({ children, className, ...props }, ref) => (
    <p ref={ref} className={className} {...props}>
      {children}
    </p>
  )
);
MotionP.displayName = 'motion.p';

const MotionForm = React.forwardRef<HTMLFormElement, React.FormHTMLAttributes<HTMLFormElement> & MotionProps & {
  onSubmit?: React.FormEventHandler<HTMLFormElement>;
}>(
  ({ children, className, onSubmit, ...props }, ref) => (
    <form ref={ref} className={className} onSubmit={onSubmit} {...props}>
      {children}
    </form>
  )
);
MotionForm.displayName = 'motion.form';

const MotionButton = React.forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement> & MotionProps>(
  ({ children, className, ...props }, ref) => (
    <button ref={ref} className={className} {...props}>
      {children}
    </button>
  )
);
MotionButton.displayName = 'motion.button';

const MotionSelect = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement> & MotionProps>(
  ({ children, className, ...props }, ref) => (
    <select ref={ref} className={className} {...props}>
      {children}
    </select>
  )
);
MotionSelect.displayName = 'motion.select';

const MotionUl = React.forwardRef<HTMLUListElement, React.HTMLAttributes<HTMLUListElement> & MotionProps>(
  ({ children, className, ...props }, ref) => (
    <ul ref={ref} className={className} {...props}>
      {children}
    </ul>
  )
);
MotionUl.displayName = 'motion.ul';

const MotionLi = React.forwardRef<HTMLLIElement, React.HTMLAttributes<HTMLLIElement> & MotionProps>(
  ({ children, className, ...props }, ref) => (
    <li ref={ref} className={className} {...props}>
      {children}
    </li>
  )
);
MotionLi.displayName = 'motion.li';

export const motion = {
  div: MotionDiv,
  h2: MotionH2,
  h3: MotionH3,
  h4: MotionH4,
  p: MotionP,
  form: MotionForm,
  button: MotionButton,
  select: MotionSelect,
  ul: MotionUl,
  li: MotionLi,
};

export default motion;
