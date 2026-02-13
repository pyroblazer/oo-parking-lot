import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import ParkVehicle from './src/screens/ParkVehicle';
import UnparkVehicle from './src/screens/UnparkVehicle';
import ViewSession from './src/screens/ViewSession';
import AvailableSlots from './src/screens/AvailableSlots';

type RootStackParamList = {
  ParkVehicle: undefined;
  UnparkVehicle: undefined;
  ViewSession: { id: string };
  AvailableSlots: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

function App(): React.JSX.Element {
  return (
    <NavigationContainer>
      <Stack.Navigator>
        <Stack.Screen
          name="ParkVehicle"
          component={ParkVehicle}
          options={{ title: 'Park Vehicle' }}
        />
        <Stack.Screen
          name="UnparkVehicle"
          component={UnparkVehicle}
          options={{ title: 'Unpark Vehicle' }}
        />
        <Stack.Screen
          name="ViewSession"
          component={ViewSession}
          options={{ title: 'View Session' }}
        />
        <Stack.Screen
          name="AvailableSlots"
          component={AvailableSlots}
          options={{ title: 'Available Slots' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default App;
