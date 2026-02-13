/**
 * Health Check Component
 * 
 * Implements FEAT-016: Check System Health
 * - Health status display (Online/Offline/Checking)
 * - Auto-refresh indicator
 * - Display-only badge (not clickable)
 * 
 * @module HealthCheck
 */

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import './HealthCheck.css';

type HealthStatus = 'online' | 'offline' | 'checking';

interface HealthCheckProps {
  readonly className?: string;
}

/**
 * HealthCheck component
 */
function HealthCheck({ className = '' }: HealthCheckProps): JSX.Element {
  const [healthStatus, setHealthStatus] = useState<HealthStatus>('checking');
  const [lastChecked, setLastChecked] = useState<Date>(new Date());

  useEffect(() => {
    // Initial health check
    void checkHealth();

    // Set up auto-refresh every 30 seconds
    const intervalId = setInterval(() => {
      void checkHealth();
    }, 30000);

    return () => {
      clearInterval(intervalId);
    };
  }, []);

  const checkHealth = async (): Promise<void> => {
    setHealthStatus('checking');
    try {
      // Try to fetch from the backend health endpoint
      const apiUrl = import.meta.env['VITE_API_URL'] || 'http://localhost:8082';
      const healthUrl = apiUrl.endsWith('/api/v1') 
        ? apiUrl.replace('/api/v1', '') + '/health'
        : apiUrl + '/health';
      
      const response = await fetch(healthUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        setHealthStatus('online');
      } else {
        setHealthStatus('offline');
      }
    } catch (error) {
      setHealthStatus('offline');
    } finally {
      setLastChecked(new Date());
    }
  };

  const getStatusText = (): string => {
    switch (healthStatus) {
      case 'online':
        return 'Online';
      case 'offline':
        return 'Offline';
      case 'checking':
        return 'Checking...';
      default:
        return 'Unknown';
    }
  };

  const getStatusIcon = (): string => {
    switch (healthStatus) {
      case 'online':
        return '✅';
      case 'offline':
        return '❌';
      case 'checking':
        return '⏳';
      default:
        return '❓';
    }
  };

  return (
    <div className={`health-check ${className}`} data-testid="health-check">
      <style>{`
        .health-check {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.5rem 1rem;
          background: #ffffff;
          border-radius: 0.5rem;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
          font-size: 0.875rem;
        }
        .health-badge {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.5rem 1rem;
          border-radius: 9999px;
          font-size: 0.875rem;
          font-weight: 600;
          cursor: default;
        }
        .health-badge.online {
          background: #dcfce7;
          color: #16a34a;
          border: 1px solid #86efac;
        }
        .health-badge.offline {
          background: #fef2f2;
          color: #dc2626;
          border: 1px solid #fca5a5;
        }
        .health-badge.checking {
          background: #fef3c7;
          color: #92400e;
          border: 1px solid #fcd34d;
          animation: pulse 1.5s ease-in-out infinite;
        }
        @keyframes pulse {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.6;
          }
        }
        .health-status-text {
          font-weight: 600;
        }
        .auto-refresh-indicator {
          font-size: 0.75rem;
          color: #1e293b;
        }
        .auto-refresh-indicator span {
          font-weight: 600;
          color: #1e40af;
        }
      `}</style>

      <motion.div
        className={`health-badge health-${healthStatus}`}
        whileHover={{ scale: 1.02 }}
        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        data-testid="health-badge"
      >
        <span className="health-icon" data-testid="health-icon">{getStatusIcon()}</span>
        <span className="health-status-text" data-testid="health-status-text">{getStatusText()}</span>
      </motion.div>

      <div className="auto-refresh-indicator" data-testid="auto-refresh-indicator">
        Auto-refresh: <span>30s</span>
      </div>
    </div>
  );
}

export default HealthCheck;
