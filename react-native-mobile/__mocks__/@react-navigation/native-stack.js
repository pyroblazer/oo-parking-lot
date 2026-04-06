/**
 * Mock for @react-navigation/native-stack
 */

const mockScreen = ({ children }) => children;
const mockNavigator = ({ children }) => children;

const createNativeStackNavigator = jest.fn(() => ({
  Screen: mockScreen,
  Navigator: mockNavigator,
}));

module.exports = {
  createNativeStackNavigator,
};
