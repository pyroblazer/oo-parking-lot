/**
 * React Native mock for Bun test runner
 * This provides mock implementations for React Native modules
 */

const React = require('react');

// Helper to create a mock component that wraps a div
const createMockComponent = (name) => {
  const Component = ({ children, testID, ...props }) => {
    const elementProps = { ...props };
    // Only set testID if explicitly provided
    if (testID) {
      elementProps.testID = testID;
      elementProps['data-testid'] = testID;
    }
    return React.createElement('div', elementProps, children);
  };
  Component.displayName = name;
  return Component;
};

// Mock View component
const View = createMockComponent('View');

// Mock Text component
const Text = createMockComponent('Text');

// Mock ScrollView component
const ScrollView = createMockComponent('ScrollView');

// Mock SafeAreaView component
const SafeAreaView = createMockComponent('SafeAreaView');

// Mock KeyboardAvoidingView component
const KeyboardAvoidingView = createMockComponent('KeyboardAvoidingView');

// Mock RefreshControl component
const RefreshControl = ({ refreshing, onRefresh, ...props }) => {
  return React.createElement('div', { 'data-refreshing': refreshing, onClick: onRefresh, ...props });
};
RefreshControl.displayName = 'RefreshControl';

// Mock TouchableOpacity component
const TouchableOpacity = ({ children, testID, disabled = false, onPress, ...props }) => {
  const elementProps = { ...props };
  if (testID) {
    elementProps.testID = testID;
    elementProps['data-testid'] = testID;
  }
  // Only set disabled attribute when it's true (not when false)
  // In HTML, the presence of the disabled attribute makes it disabled, regardless of value
  if (disabled) {
    elementProps.disabled = true;
  }
  // Add onClick handler that calls onPress
  elementProps.onClick = (e) => {
    if (!disabled && onPress) {
      onPress(e);
    }
  };
  return React.createElement('button', elementProps, children);
};
TouchableOpacity.displayName = 'TouchableOpacity';

// Mock TextInput component
const TextInput = ({ children, testID, editable = true, ...props }) => {
  const elementProps = { disabled: !editable, ...props };
  if (testID) {
    elementProps.testID = testID;
    elementProps['data-testid'] = testID;
  }
  return React.createElement('input', elementProps, children);
};
TextInput.displayName = 'TextInput';

// Mock Button component
const Button = ({ title, onPress, testID, disabled = false, ...props }) => {
  const elementProps = { onClick: onPress, disabled, ...props };
  if (testID) {
    elementProps.testID = testID;
    elementProps['data-testid'] = testID;
  }
  return React.createElement('button', elementProps, title);
};
Button.displayName = 'Button';

// Mock ActivityIndicator
const ActivityIndicator = createMockComponent('ActivityIndicator');

// Mock Image component
const Image = createMockComponent('Image');

// Mock FlatList component
const FlatList = ({ data, renderItem, keyExtractor, testID, ...props }) => {
  const elementProps = { ...props };
  if (testID) {
    elementProps.testID = testID;
    elementProps['data-testid'] = testID;
  }
  return React.createElement(
    'div',
    elementProps,
    data?.map((item, index) => {
      const key = keyExtractor ? keyExtractor(item, index) : index;
      return React.createElement('div', { key }, renderItem({ item, index }));
    })
  );
};
FlatList.displayName = 'FlatList';

// Mock Modal component
const Modal = createMockComponent('Modal');

// Mock Pressable component
const Pressable = createMockComponent('Pressable');

// Mock TouchableWithoutFeedback component
const TouchableWithoutFeedback = ({ children, testID, ...props }) => {
  const elementProps = { ...props };
  if (testID) {
    elementProps.testID = testID;
    elementProps['data-testid'] = testID;
  }
  return React.createElement('div', elementProps, children);
};
TouchableWithoutFeedback.displayName = 'TouchableWithoutFeedback';

// Mock StyleSheet
const StyleSheet = {
  create: (styles) => styles,
  flatten: (style) => style,
  hairlineWidth: 1,
  absoluteFill: 'absoluteFill',
};

// Mock Platform
const Platform = {
  OS: 'ios',
  select: (obj) => obj.ios || obj.android || obj.default,
  Version: 13,
  isTesting: true,
};

// Mock Dimensions
const Dimensions = {
  get: (dim) => ({
    width: 375,
    height: 667,
    scale: 2,
    fontScale: 1,
  }),
  addEventListener: () => ({ remove: () => {} }),
  removeEventListener: () => {},
};

// Mock PixelRatio
const PixelRatio = {
  get: () => 2,
  getFontScale: () => 1,
  getPixelSizeForLayoutSize: (size) => size * 2,
  roundToNearestPixel: (size) => Math.round(size),
};

// Mock Animated
const Animated = {
  View: createMockComponent('AnimatedView'),
  Text: createMockComponent('AnimatedText'),
  Image: createMockComponent('AnimatedImage'),
  ScrollView: createMockComponent('AnimatedScrollView'),
  timing: () => ({ start: () => {} }),
  spring: () => ({ start: () => {} }),
  decay: () => ({ start: () => {} }),
  event: () => () => {},
  createAnimatedComponent: (component) => component,
  Value: class {
    constructor(value) { this._value = value; }
    setValue(value) { this._value = value; }
    getValue() { return this._value; }
    addListener() { return 'listener'; }
    removeListener() {}
    interpolate(config) {
      // Mock interpolate to return a simple value based on current value
      const { inputRange, outputRange } = config;
      if (!inputRange || !outputRange || inputRange.length === 0 || outputRange.length === 0) {
        return this._value;
      }
      // Simple interpolation: return middle value of output range
      return outputRange[Math.floor(outputRange.length / 2)] || outputRange[0];
    }
  },
  ValueXY: class {
    constructor(x, y) { this.x = x; this.y = y; }
  },
  sequence: () => ({ start: () => {} }),
  parallel: () => ({ start: () => {} }),
  delay: () => ({ start: () => {} }),
  loop: (animation) => ({
    start: (cb) => { if (cb) cb({ finished: true }); },
    stop: () => {},
    reset: () => {},
  }),
};

// Mock Easing
const Easing = {
  linear: 'linear',
  ease: 'ease',
  easeIn: 'easeIn',
  easeOut: 'easeOut',
  easeInOut: 'easeInOut',
  in: (easing) => easing,
  out: (easing) => easing,
  inOut: (easing) => easing,
};

// Mock Alert
const Alert = {
  alert: () => {},
  prompt: () => {},
};

// Mock Linking
const Linking = {
  openURL: () => Promise.resolve(),
  canOpenURL: () => Promise.resolve(true),
  getInitialURL: () => Promise.resolve(null),
  addEventListener: () => ({ remove: () => {} }),
  removeEventListener: () => {},
};

// Mock AppState
const AppState = {
  currentState: 'active',
  addEventListener: () => ({ remove: () => {} }),
  removeEventListener: () => {},
};

// Mock AccessibilityInfo
const AccessibilityInfo = {
  isScreenReaderEnabled: () => Promise.resolve(false),
  announceForAccessibility: () => {},
  addEventListener: () => ({ remove: () => {} }),
  removeEventListener: () => {},
};

// Mock Keyboard
const Keyboard = {
  dismiss: () => {},
  addListener: () => ({ remove: () => {} }),
  removeListener: () => {},
  removeAllListeners: () => {},
};

// Mock StatusBar
const StatusBar = {
  setBarStyle: () => {},
  setHidden: () => {},
  setBackgroundColor: () => {},
  setNetworkActivityIndicatorVisible: () => {},
};

// Mock SafeAreaContext
const SafeAreaContext = {
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
  SafeAreaView: createMockComponent('SafeAreaView'),
  SafeAreaProvider: createMockComponent('SafeAreaProvider'),
};

// Mock Navigation
const useNavigation = () => ({
  navigate: () => {},
  goBack: () => {},
  reset: () => {},
  setParams: () => {},
  dispatch: () => {},
  canGoBack: () => true,
  isFocused: () => true,
});

const useRoute = () => ({
  params: {},
  key: 'test-route',
  name: 'TestRoute',
  path: '/test',
});

// Mock AsyncStorage
const AsyncStorage = {
  getItem: () => Promise.resolve(null),
  setItem: () => Promise.resolve(),
  removeItem: () => Promise.resolve(),
  clear: () => Promise.resolve(),
  getAllKeys: () => Promise.resolve([]),
  multiGet: () => Promise.resolve([]),
  multiSet: () => Promise.resolve(),
  multiRemove: () => Promise.resolve(),
};

// Mock Keychain
const Keychain = {
  getGenericPassword: () => Promise.resolve({ username: 'test', password: 'test' }),
  setGenericPassword: () => Promise.resolve(true),
  resetGenericPassword: () => Promise.resolve(false),
  getInternetCredentials: () => Promise.resolve({ username: 'test', password: 'test' }),
  setInternetCredentials: () => Promise.resolve(true),
  resetInternetCredentials: () => Promise.resolve(false),
};

// Mock Gesture Handler
const GestureHandler = {
  TapGestureHandler: createMockComponent('TapGestureHandler'),
  PanGestureHandler: createMockComponent('PanGestureHandler'),
  State: {},
};

// Mock Picker
const Picker = {
  Item: createMockComponent('PickerItem'),
};

// Mock Switch
const Switch = createMockComponent('Switch');

// Mock Slider
const Slider = createMockComponent('Slider');

// Export all mocks
module.exports = {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Button,
  ActivityIndicator,
  Image,
  FlatList,
  Modal,
  Pressable,
  TouchableWithoutFeedback,
  StyleSheet,
  Platform,
  Dimensions,
  PixelRatio,
  Animated,
  Easing,
  Alert,
  Linking,
  AppState,
  AccessibilityInfo,
  Keyboard,
  StatusBar,
  SafeAreaContext,
  useNavigation,
  useRoute,
  AsyncStorage,
  Keychain,
  GestureHandler,
  Picker,
  Switch,
  Slider,
  SafeAreaView,
  KeyboardAvoidingView,
  RefreshControl,
  
  // Export as default for compatibility
  default: {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    TextInput,
    Button,
    ActivityIndicator,
    Image,
    FlatList,
    Modal,
    Pressable,
    TouchableWithoutFeedback,
    StyleSheet,
    Platform,
    Dimensions,
    PixelRatio,
    Animated,
    Easing,
    Alert,
    Linking,
    AppState,
    AccessibilityInfo,
    Keyboard,
    StatusBar,
    SafeAreaContext,
    useNavigation,
    useRoute,
    AsyncStorage,
    Keychain,
    GestureHandler,
    Picker,
    Switch,
    Slider,
  },
};