import React from 'react';
import { render, screen, waitFor } from '@testing-library/react-native';
import Configuration from '../src/screens/Configuration';

jest.mock('react-native/Libraries/Alert/Alert', () => ({ alert: jest.fn() }));
jest.mock('@react-navigation/native', () => ({ useNavigation: jest.fn(() => ({ navigate: jest.fn(), goBack: jest.fn() })) }));
jest.mock('../src/api/parkingApi', () => {
  class ApiError extends Error { constructor(m: string) { super(m); this.name = 'ApiError'; } }
  return {
    checkHealth: jest.fn().mockResolvedValue({ status: 'ok', service: 'test', version: '1.0', timestamp: new Date().toISOString(), checks: { database: { status: 'ok' } } }),
    initializeSystem: jest.fn(),
    listEntryPoints: jest.fn().mockResolvedValue([{ id: '1', identifier: 'A', name: 'Entry Point A' }]),
    listSlots: jest.fn().mockResolvedValue([{ id: '1', slot_label: 'SP-1', slot_type: 'SP', distances: [1], available: true }]),
    setApiBaseUrl: jest.fn().mockResolvedValue(undefined),
    createEntryPoint: jest.fn().mockResolvedValue(undefined),
    updateEntryPoint: jest.fn().mockResolvedValue(undefined),
    deleteEntryPoint: jest.fn().mockResolvedValue(undefined),
    createSlot: jest.fn().mockResolvedValue(undefined),
    updateSlot: jest.fn().mockResolvedValue(undefined),
    deleteSlot: jest.fn().mockResolvedValue(undefined),
    ApiError,
  };
});
jest.mock('@react-native-async-storage/async-storage', () => ({ getItem: jest.fn().mockResolvedValue(null), setItem: jest.fn(), removeItem: jest.fn(), clear: jest.fn() }));

it('debug what renders', async () => {
  render(<Configuration />);
  await waitFor(() => {
    const texts = screen.queryAllByText(/add entry point/i);
    console.log('MATCHES:', texts.length);
    texts.forEach((t, i) => console.log('  [' + i + ']:', JSON.stringify(t.props.children)));
    const buttons = screen.queryAllByRole('button');
    console.log('BUTTONS:', buttons.length);
    buttons.forEach((b, i) => {
      const label = b.props.accessibilityLabel;
      if (label && /entry/i.test(label)) console.log('  btn[' + i + '] label:', label);
    });
  }, { timeout: 3000 });
}, 10000);
