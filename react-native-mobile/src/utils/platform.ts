import { useState, useEffect } from 'react';
import { Platform, Dimensions } from 'react-native';
import type { Storage, PlatformInfo, ResponsiveDimensions, NetworkStatus } from '../types';

// Type for NetInfo module
interface NetInfoModule {
  addEventListener: (callback: (state: NetInfoState) => void) => (() => void) | null;
}

// Type for NetInfo state
interface NetInfoState {
  isConnected: boolean | null;
  isInternetReachable: boolean | null;
}

// Dynamically import NetInfo only on native platforms
let NetInfo: NetInfoModule | undefined;
if (Platform.OS !== 'web') {
  try {
    NetInfo = require('@react-native-community/netinfo');
  } catch (e) {
    // NetInfo not available, will use fallback
    console.warn('@react-native-community/netinfo not available');
  }
}

// Storage abstraction
const Storage: Storage = {
  async getItem(key: string): Promise<string | null> {
    if (Platform.OS === 'web') {
      return localStorage.getItem(key);
    }
    const { AsyncStorage } = require('@react-native-async-storage/async-storage');
    return await AsyncStorage.getItem(key);
  },
  
  async setItem(key: string, value: string): Promise<void> {
    if (Platform.OS === 'web') {
      localStorage.setItem(key, value);
    } else {
      const { AsyncStorage } = require('@react-native-async-storage/async-storage');
      await AsyncStorage.setItem(key, value);
    }
  },
  
  async removeItem(key: string): Promise<void> {
    if (Platform.OS === 'web') {
      localStorage.removeItem(key);
    } else {
      const { AsyncStorage } = require('@react-native-async-storage/async-storage');
      await AsyncStorage.removeItem(key);
    }
  },

  async clear(): Promise<void> {
    if (Platform.OS === 'web') {
      localStorage.clear();
    } else {
      const { AsyncStorage } = require('@react-native-async-storage/async-storage');
      await AsyncStorage.clear();
    }
  }
};

export { Storage };

// Responsive design abstraction
export const useResponsive = (): ResponsiveDimensions => {
  const [dimensions, setDimensions] = useState(Dimensions.get('window'));
  
  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      setDimensions(window);
    });
    return () => subscription?.remove();
  }, []);
  
  return {
    width: dimensions.width,
    height: dimensions.height,
    isMobile: dimensions.width < 768,
    isTablet: dimensions.width >= 768 && dimensions.width < 1024,
    isDesktop: dimensions.width >= 1024
  };
};

// Network status abstraction
export const useNetworkStatus = (): NetworkStatus => {
  const [isOnline, setIsOnline] = useState<boolean>(true);
  
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    if (Platform.OS === 'web') {
      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);
    } else {
      // Use NetInfo for React Native
      const unsubscribe = NetInfo?.addEventListener((state: NetInfoState) => {
        setIsOnline(state.isConnected ?? false);
      });
      return () => unsubscribe?.();
    }
    
    return () => {
      if (Platform.OS === 'web') {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
      }
    };
  }, []);
  
  return { isOnline };
};

// Platform-specific hooks
export const usePlatform = (): PlatformInfo => {
  return {
    isWeb: Platform.OS === 'web',
    isIOS: Platform.OS === 'ios',
    isAndroid: Platform.OS === 'android',
    version: Platform.Version,
  };
};

// Platform-specific utilities
export const openLink = (url: string): void => {
  if (Platform.OS === 'web') {
    window.open(url, '_blank');
  } else {
    // Use Linking API for React Native
    const { Linking } = require('react-native');
    void Linking.openURL(url);
  }
};

export const shareContent = async (content: { title?: string; message?: string; url?: string }): Promise<void> => {
  if (Platform.OS === 'web') {
    if (navigator.share) {
      await navigator.share(content);
    } else {
      // Fallback for web
      console.log('Share not supported');
    }
  } else {
    // Use Share API for React Native
    const { Share } = require('react-native');
    await Share.share(content);
  }
};

// Platform-specific constants
export const PlatformConstants: PlatformInfo = {
  isWeb: Platform.OS === 'web',
  isIOS: Platform.OS === 'ios',
  isAndroid: Platform.OS === 'android',
  version: Platform.Version,
};

// Platform-specific styles helper
export const createPlatformStyles = <T extends Record<string, unknown>>(
  baseStyles: T,
  platformSpecificStyles: Partial<Record<typeof Platform.OS, T>>
): T => {
  return {
    ...baseStyles,
    ...Platform.select(platformSpecificStyles)
  };
};
