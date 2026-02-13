/**
 * Mock for @react-navigation/native
 */
const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
const mockNavigation = {
  navigate: mockNavigate,
  goBack: mockGoBack,
  setOptions: jest.fn(),
  addListener: jest.fn(() => jest.fn()),
  removeListener: jest.fn(),
  dispatch: jest.fn(),
  reset: jest.fn(),
  isFocused: jest.fn(() => true),
  canGoBack: jest.fn(() => true),
};

module.exports = {
  useNavigation: jest.fn(() => mockNavigation),
  useRoute: jest.fn(() => ({ params: {} })),
  useFocusEffect: jest.fn((cb) => cb()),
  useIsFocused: jest.fn(() => true),
  NavigationContainer: ({ children }) => children,
  createNavigatorFactory: jest.fn(),
  useNavigationContainerRef: jest.fn(() => ({ current: null })),
};