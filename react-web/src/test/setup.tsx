import { afterEach, vi, beforeEach } from 'vitest';
import { cleanup } from '@testing-library/react';
import '@testing-library/jest-dom';

// Setup global vi for tests
global.vi = vi;

// Mock framer-motion to prevent animation errors in tests
vi.mock('framer-motion', () => {
  const actualModule = vi.importActual('framer-motion');
  
  // Filter out framer-motion specific props
  const filterMotionProps = (props: any) => {
    const {
      animate,
      exit,
      initial,
      whileHover,
      whileFocus,
      whileTap,
      whileInView,
      transition,
      variants,
      layout,
      layoutId,
      drag,
      dragConstraints,
      dragElastic,
      dragMomentum,
      dragPropagation,
      dragSnapToOrigin,
      onDragStart,
      onDrag,
      onDragEnd,
      onMeasureDragConstraints,
      ...rest
    } = props;
    return rest;
  };
  
  return {
    ...actualModule,
    motion: {
      div: (props: any) => <div {...filterMotionProps(props)}>{props.children}</div>,
      h2: (props: any) => <h2 {...filterMotionProps(props)}>{props.children}</h2>,
      h3: (props: any) => <h3 {...filterMotionProps(props)}>{props.children}</h3>,
      h4: (props: any) => <h4 {...filterMotionProps(props)}>{props.children}</h4>,
      p: (props: any) => <p {...filterMotionProps(props)}>{props.children}</p>,
      form: (props: any) => <form {...filterMotionProps(props)}>{props.children}</form>,
      button: (props: any) => <button {...filterMotionProps(props)}>{props.children}</button>,
      select: (props: any) => <select {...filterMotionProps(props)}>{props.children}</select>,
      ul: (props: any) => <ul {...filterMotionProps(props)}>{props.children}</ul>,
      li: (props: any) => <li {...filterMotionProps(props)}>{props.children}</li>,
      span: (props: any) => <span {...filterMotionProps(props)}>{props.children}</span>,
    },
    AnimatePresence: (props: any) => {
      // In tests, always render children immediately without animation delays
      return <>{props.children}</>;
    },
  };
});

// Cleanup after each test
afterEach(() => {
  cleanup();
});

// Clear mocks before each test
beforeEach(() => {
  vi.clearAllMocks();
  console.log('[TEST SETUP] Clearing all mocks');
});

afterEach(() => {
  console.log('[TEST CLEANUP] Restoring all mocks');
});