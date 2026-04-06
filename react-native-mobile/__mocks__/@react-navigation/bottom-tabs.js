export const createBottomTabNavigator = () => ({
  Navigator: ({ children }: { children: React.ReactNode }) => children,
  Screen: ({ component }: { component: React.ComponentType }) => null,
});
