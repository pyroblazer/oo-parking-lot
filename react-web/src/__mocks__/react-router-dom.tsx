/**
 * react-router-dom Mock
 *
 * Provides mock implementations of react-router-dom hooks for testing.
 * The mockNavigate and mockParams can be overridden per-test via vi.fn().
 */

import React from 'react';
import { vi } from 'vitest';

export const mockNavigate = vi.fn();
export const mockParams: { [key: string]: string | null } = { id: '1' };

export const useNavigate = () => mockNavigate;
export const useParams = () => mockParams;
export const useLocation = () => ({ pathname: '/', search: '', hash: '', state: null });
export const useHistory = () => ({ push: mockNavigate, replace: mockNavigate, goBack: vi.fn() });

export const MemoryRouter: React.FC<{ children: React.ReactNode; initialEntries?: string[] }> = ({
  children,
}) => <>{children}</>;

export const BrowserRouter: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <>{children}</>
);

export const Route: React.FC<{ path?: string; element?: React.ReactNode; children?: React.ReactNode }> = ({
  element,
  children,
}) => <>{element || children}</>;

export const Routes: React.FC<{ children: React.ReactNode }> = ({ children }) => <>{children}</>;

export const Link: React.FC<{ to: string; children: React.ReactNode; className?: string }> = ({
  children,
  to,
  ...props
}) => <a href={to} {...props}>{children}</a>;

export const NavLink: React.FC<{
  to: string;
  children: React.ReactNode;
  className?: string | ((props: { isActive: boolean }) => string);
}> = ({ children, to, className, ...props }) => {
  const resolvedClass = typeof className === 'function' ? className({ isActive: false }) : className;
  return <a href={to} className={resolvedClass} {...props}>{children}</a>;
};

export const Outlet: React.FC = () => null;

export const Navigate: React.FC<{ to: string; replace?: boolean }> = () => null;

export default {
  useNavigate,
  useParams,
  useLocation,
  MemoryRouter,
  BrowserRouter,
  Route,
  Routes,
  Link,
  NavLink,
  Outlet,
  Navigate,
};