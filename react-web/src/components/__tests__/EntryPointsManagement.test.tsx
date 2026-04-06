/**
 * Entry Points Management Component Tests
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import EntryPointsManagement from '../EntryPointsManagement';
import * as api from '../../api';
import type { EntryPoint } from '../../types';

describe('EntryPointsManagement Component', () => {
  const mockEntryPoints: EntryPoint[] = [
    {
      id: 1,
      identifier: 'A',
      name: 'Main Entrance',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    },
    {
      id: 2,
      identifier: 'B',
      name: 'Side Entrance',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    },
    {
      id: 3,
      identifier: 'C',
      name: 'Rear Entrance',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(api, 'getEntryPoints').mockResolvedValue(mockEntryPoints);
    vi.spyOn(api, 'createEntryPoint').mockResolvedValue(undefined as any);
    vi.spyOn(api, 'updateEntryPoint').mockResolvedValue(undefined as any);
    vi.spyOn(api, 'deleteEntryPoint').mockResolvedValue(undefined as any);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Component Rendering Tests', () => {
    it('renders the component without errors', () => {
      render(<EntryPointsManagement />);
      expect(screen.getByText('Entry Points Management')).toBeInTheDocument();
    });

    it('renders entry points when loaded', async () => {
      render(<EntryPointsManagement />);
      await waitFor(() => {
        expect(screen.getByText('Main Entrance')).toBeInTheDocument();
        expect(screen.getByText('Side Entrance')).toBeInTheDocument();
        expect(screen.getByText('Rear Entrance')).toBeInTheDocument();
      });
    });

    it('displays entry point identifiers in badges', async () => {
      render(<EntryPointsManagement />);
      await waitFor(() => {
        expect(screen.getByText('A')).toBeInTheDocument();
        expect(screen.getByText('B')).toBeInTheDocument();
        expect(screen.getByText('C')).toBeInTheDocument();
      });
    });

    it('shows loading state while fetching entry points', async () => {
      vi.spyOn(api, 'getEntryPoints').mockImplementation(() => new Promise(() => {}));
      render(<EntryPointsManagement />);
      expect(screen.getByRole('status')).toBeInTheDocument();
    });

    it('displays error message when API call fails', async () => {
      vi.spyOn(api, 'getEntryPoints').mockRejectedValue(new Error('Network error'));
      render(<EntryPointsManagement />);
      await waitFor(() => {
        expect(screen.getByText('Network error')).toBeInTheDocument();
      });
    });

    it('renders create entry point button', () => {
      render(<EntryPointsManagement />);
      expect(screen.getByRole('button', { name: /create entry point/i })).toBeInTheDocument();
    });

    it('displays summary bar with total count', async () => {
      const { container } = render(<EntryPointsManagement />);
      await waitFor(() => {
        const summaryText = container.querySelector('.summary-text');
        expect(summaryText?.textContent).toContain('3 entry points');
      });
    });

    it('shows warning bar when fewer than 3 entry points', async () => {
      const fewEntryPoints: EntryPoint[] = [
        {
          id: 1,
          identifier: 'A',
          name: 'Main Entrance',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
      ];
      vi.spyOn(api, 'getEntryPoints').mockResolvedValue(fewEntryPoints);
      render(<EntryPointsManagement />);
      await waitFor(() => {
        expect(screen.getByText(/Minimum 3 Entry Points Required/i)).toBeInTheDocument();
      });
    });

    it('does not show warning bar when 3 or more entry points', async () => {
      render(<EntryPointsManagement />);
      await waitFor(() => {
        expect(screen.queryByText(/Minimum 3 Entry Points Required/i)).not.toBeInTheDocument();
      });
    });
  });

  describe('Create Entry Point Tests', () => {
    it('opens create modal when clicking create button', async () => {
      render(<EntryPointsManagement />);
      const createButton = screen.getByRole('button', { name: /create entry point/i });
      await userEvent.click(createButton);
      expect(screen.getByText('Create New Entry Point')).toBeInTheDocument();
    });

    it('closes create modal when clicking cancel', async () => {
      render(<EntryPointsManagement />);
      const createButton = screen.getByRole('button', { name: /create entry point/i });
      await userEvent.click(createButton);
      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      await userEvent.click(cancelButton);
      expect(screen.queryByText('Create New Entry Point')).not.toBeInTheDocument();
    });

    it('closes create modal when clicking overlay', async () => {
      render(<EntryPointsManagement />);
      const createButton = screen.getByRole('button', { name: /create entry point/i });
      await userEvent.click(createButton);
      const overlay = screen.getByText('Create New Entry Point').closest('.modal-overlay');
      if (overlay) {
        await userEvent.click(overlay);
      }
      await waitFor(() => {
        expect(screen.queryByText('Create New Entry Point')).not.toBeInTheDocument();
      });
    });

    it('successfully creates an entry point with valid data', async () => {
      const newEntryPoint: EntryPoint = {
        id: 4,
        identifier: 'D',
        name: 'New Entrance',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };
      vi.spyOn(api, 'createEntryPoint').mockResolvedValue(newEntryPoint);
      vi.spyOn(api, 'getEntryPoints').mockResolvedValue([...mockEntryPoints, newEntryPoint]);

      render(<EntryPointsManagement />);
      const createButton = screen.getByRole('button', { name: /create entry point/i });
      await userEvent.click(createButton);

      // Fill in the form
      const identifierInput = screen.getByLabelText(/Entry Point Identifier/i);
      await userEvent.type(identifierInput, 'D');

      const nameInput = screen.getByLabelText(/Entry Point Name/i);
      await userEvent.type(nameInput, 'New Entrance');

      const submitButton = screen.getByRole('button', { name: /^create$/i });
      await userEvent.click(submitButton);

      await waitFor(() => {
        expect(vi.mocked(api.createEntryPoint)).toHaveBeenCalledWith({
          identifier: 'D',
          name: 'New Entrance'
        });
      });
    });

    it('displays new entry point in list after creation', async () => {
      const newEntryPoint: EntryPoint = {
        id: 4,
        identifier: 'D',
        name: 'New Entrance',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };
      vi.spyOn(api, 'createEntryPoint').mockResolvedValue(newEntryPoint);
      vi.spyOn(api, 'getEntryPoints').mockResolvedValueOnce(mockEntryPoints).mockResolvedValueOnce([...mockEntryPoints, newEntryPoint]);

      render(<EntryPointsManagement />);
      await waitFor(() => {
        expect(screen.getByText('Main Entrance')).toBeInTheDocument();
      });

      const createButton = screen.getByRole('button', { name: /create entry point/i });
      await userEvent.click(createButton);

      const identifierInput = screen.getByLabelText(/Entry Point Identifier/i);
      await userEvent.type(identifierInput, 'D');

      const nameInput = screen.getByLabelText(/Entry Point Name/i);
      await userEvent.type(nameInput, 'New Entrance');

      const submitButton = screen.getByRole('button', { name: /^create$/i });
      await userEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('New Entrance')).toBeInTheDocument();
      });
    });

    it('shows validation error for missing identifier', async () => {
      render(<EntryPointsManagement />);
      const createButton = screen.getByRole('button', { name: /create entry point/i });
      await userEvent.click(createButton);

      const nameInput = screen.getByLabelText(/Entry Point Name/i);
      await userEvent.type(nameInput, 'Test Entrance');

      const submitButton = screen.getByRole('button', { name: /^create$/i });
      await userEvent.click(submitButton);

      // Check that the form is still open (validation failed)
      expect(screen.getByText('Create New Entry Point')).toBeInTheDocument();
    });

    it('shows validation error for missing name', async () => {
      render(<EntryPointsManagement />);
      const createButton = screen.getByRole('button', { name: /create entry point/i });
      await userEvent.click(createButton);

      const identifierInput = screen.getByLabelText(/Entry Point Identifier/i);
      await userEvent.type(identifierInput, 'D');

      const submitButton = screen.getByRole('button', { name: /^create$/i });
      await userEvent.click(submitButton);

      // Check that the form is still open (validation failed)
      expect(screen.getByText('Create New Entry Point')).toBeInTheDocument();
    });

    it('displays error message when create API fails', async () => {
      vi.spyOn(api, 'createEntryPoint').mockRejectedValue(new Error('Failed to create entry point'));

      render(<EntryPointsManagement />);
      const createButton = screen.getByRole('button', { name: /create entry point/i });
      await userEvent.click(createButton);

      const identifierInput = screen.getByLabelText(/Entry Point Identifier/i);
      await userEvent.type(identifierInput, 'D');

      const nameInput = screen.getByLabelText(/Entry Point Name/i);
      await userEvent.type(nameInput, 'New Entrance');

      const submitButton = screen.getByRole('button', { name: /^create$/i });
      await userEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Failed to create entry point')).toBeInTheDocument();
      });
    });

    it('disables submit button during creation', async () => {
      vi.spyOn(api, 'createEntryPoint').mockImplementation(() => new Promise(() => {}));

      render(<EntryPointsManagement />);
      const createButton = screen.getByRole('button', { name: /create entry point/i });
      await userEvent.click(createButton);

      const identifierInput = screen.getByLabelText(/Entry Point Identifier/i);
      await userEvent.type(identifierInput, 'D');

      const nameInput = screen.getByLabelText(/Entry Point Name/i);
      await userEvent.type(nameInput, 'New Entrance');

      const submitButton = screen.getByRole('button', { name: /^create$/i });
      await userEvent.click(submitButton);

      await waitFor(() => {
        expect(submitButton).toBeDisabled();
        expect(screen.getByText('Creating...')).toBeInTheDocument();
      });
    });
  });

  describe('Update Entry Point Tests', () => {
    it('opens edit modal when clicking edit button', async () => {
      render(<EntryPointsManagement />);
      await waitFor(() => {
        expect(screen.getByText('Main Entrance')).toBeInTheDocument();
      });
      
      const editButtons = screen.getAllByRole('button', { name: /edit/i });
      await userEvent.click(editButtons[0]);
      
      expect(screen.getByText(/Edit Entry Point A/i)).toBeInTheDocument();
    });

    it('closes edit modal when clicking cancel', async () => {
      render(<EntryPointsManagement />);
      await waitFor(() => {
        expect(screen.getByText('Main Entrance')).toBeInTheDocument();
      });

      const editButtons = screen.getAllByRole('button', { name: /edit/i });
      await userEvent.click(editButtons[0]);

      const cancelButtons = screen.getAllByRole('button', { name: /cancel/i });
      // Find the cancel button inside the edit modal (last one)
      await userEvent.click(cancelButtons[cancelButtons.length - 1]);

      expect(screen.queryByText(/Edit Entry Point A/i)).not.toBeInTheDocument();
    });

    it('successfully updates entry point name', async () => {
      vi.spyOn(api, 'getEntryPoints').mockResolvedValueOnce(mockEntryPoints).mockResolvedValueOnce([
        { ...mockEntryPoints[0], name: 'Updated Main Entrance' },
        mockEntryPoints[1],
        mockEntryPoints[2]
      ]);
      
      render(<EntryPointsManagement />);
      await waitFor(() => {
        expect(screen.getByText('Main Entrance')).toBeInTheDocument();
      });
      
      const editButtons = screen.getAllByRole('button', { name: /edit/i });
      await userEvent.click(editButtons[0]);
      
      const nameInput = screen.getByLabelText(/Entry Point Name/i);
      await userEvent.clear(nameInput);
      await userEvent.type(nameInput, 'Updated Main Entrance');
      
      const submitButton = screen.getByRole('button', { name: /update/i });
      await userEvent.click(submitButton);
      
      await waitFor(() => {
        expect(vi.mocked(api.updateEntryPoint)).toHaveBeenCalledWith('1', { name: 'Updated Main Entrance' });
      });
    });

    it('displays updated entry point in list after update', async () => {
      vi.spyOn(api, 'getEntryPoints').mockResolvedValueOnce(mockEntryPoints).mockResolvedValueOnce([
        { ...mockEntryPoints[0], name: 'Updated Main Entrance' },
        mockEntryPoints[1],
        mockEntryPoints[2]
      ]);
      
      render(<EntryPointsManagement />);
      await waitFor(() => {
        expect(screen.getByText('Main Entrance')).toBeInTheDocument();
      });
      
      const editButtons = screen.getAllByRole('button', { name: /edit/i });
      await userEvent.click(editButtons[0]);
      
      const nameInput = screen.getByLabelText(/Entry Point Name/i);
      await userEvent.clear(nameInput);
      await userEvent.type(nameInput, 'Updated Main Entrance');
      
      const submitButton = screen.getByRole('button', { name: /update/i });
      await userEvent.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText('Updated Main Entrance')).toBeInTheDocument();
      });
    });

    it('shows validation error for empty name', async () => {
      render(<EntryPointsManagement />);
      await waitFor(() => {
        expect(screen.getByText('Main Entrance')).toBeInTheDocument();
      });
      
      const editButtons = screen.getAllByRole('button', { name: /edit/i });
      await userEvent.click(editButtons[0]);
      
      const nameInput = screen.getByLabelText(/Entry Point Name/i);
      await userEvent.clear(nameInput);
      
      const submitButton = screen.getByRole('button', { name: /update/i });
      await userEvent.click(submitButton);
      
      // Check that the form is still open (validation failed)
      expect(screen.getByText(/Edit Entry Point A/i)).toBeInTheDocument();
    });

    it('displays error message when update API fails', async () => {
      vi.spyOn(api, 'updateEntryPoint').mockRejectedValue(new Error('Failed to update entry point'));
      
      render(<EntryPointsManagement />);
      await waitFor(() => {
        expect(screen.getByText('Main Entrance')).toBeInTheDocument();
      });
      
      const editButtons = screen.getAllByRole('button', { name: /edit/i });
      await userEvent.click(editButtons[0]);
      
      const nameInput = screen.getByLabelText(/Entry Point Name/i);
      await userEvent.clear(nameInput);
      await userEvent.type(nameInput, 'Updated Name');
      
      const submitButton = screen.getByRole('button', { name: /update/i });
      await userEvent.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText('Failed to update entry point')).toBeInTheDocument();
      });
    });

    it('disables submit button during update', async () => {
      vi.spyOn(api, 'updateEntryPoint').mockImplementation(() => new Promise(() => {}));
      
      render(<EntryPointsManagement />);
      await waitFor(() => {
        expect(screen.getByText('Main Entrance')).toBeInTheDocument();
      });
      
      const editButtons = screen.getAllByRole('button', { name: /edit/i });
      await userEvent.click(editButtons[0]);
      
      const nameInput = screen.getByLabelText(/Entry Point Name/i);
      await userEvent.clear(nameInput);
      await userEvent.type(nameInput, 'Updated Name');
      
      const submitButton = screen.getByRole('button', { name: /update/i });
      await userEvent.click(submitButton);
      
      await waitFor(() => {
        expect(submitButton).toBeDisabled();
        expect(screen.getByText('Updating...')).toBeInTheDocument();
      });
    });
  });

  describe('Delete Entry Point Tests', () => {
    it('opens delete confirmation dialog when clicking delete button', async () => {
      render(<EntryPointsManagement />);
      await waitFor(() => {
        expect(screen.getByText('Main Entrance')).toBeInTheDocument();
      });

      const deleteButtons = screen.getAllByRole('button', { name: /delete/i });
      await userEvent.click(deleteButtons[0]);

      expect(screen.getByText(/Delete Entry Point\?/i)).toBeInTheDocument();
      expect(screen.getByText(/Are you sure you want to delete entry point/i)).toBeInTheDocument();
    });

    it('closes delete dialog when clicking cancel', async () => {
      render(<EntryPointsManagement />);
      await waitFor(() => {
        expect(screen.getByText('Main Entrance')).toBeInTheDocument();
      });

      const deleteButtons = screen.getAllByRole('button', { name: /delete/i });
      await userEvent.click(deleteButtons[0]);

      const cancelButtons = screen.getAllByRole('button', { name: /cancel/i });
      // Find the cancel button inside the delete dialog (last one)
      await userEvent.click(cancelButtons[cancelButtons.length - 1]);

      expect(screen.queryByText(/Delete Entry Point\?/i)).not.toBeInTheDocument();
    });

    it('successfully deletes an entry point', async () => {
      vi.spyOn(api, 'getEntryPoints').mockResolvedValueOnce(mockEntryPoints).mockResolvedValueOnce([
        mockEntryPoints[1],
        mockEntryPoints[2]
      ]);
      
      render(<EntryPointsManagement />);
      await waitFor(() => {
        expect(screen.getByText('Main Entrance')).toBeInTheDocument();
      });
      
      const deleteButtons = screen.getAllByRole('button', { name: /delete/i });
      await userEvent.click(deleteButtons[0]);
      
      const confirmButton = screen.getByRole('button', { name: /delete entry point/i });
      await userEvent.click(confirmButton);
      
      await waitFor(() => {
        expect(vi.mocked(api.deleteEntryPoint)).toHaveBeenCalledWith('1');
      });
    });

    it('removes entry point from list after deletion', async () => {
      vi.spyOn(api, 'getEntryPoints').mockResolvedValueOnce(mockEntryPoints).mockResolvedValueOnce([
        mockEntryPoints[1],
        mockEntryPoints[2]
      ]);
      
      render(<EntryPointsManagement />);
      await waitFor(() => {
        expect(screen.getByText('Main Entrance')).toBeInTheDocument();
      });
      
      const deleteButtons = screen.getAllByRole('button', { name: /delete/i });
      await userEvent.click(deleteButtons[0]);
      
      const confirmButton = screen.getByRole('button', { name: /delete entry point/i });
      await userEvent.click(confirmButton);
      
      await waitFor(() => {
        expect(screen.queryByText('Main Entrance')).not.toBeInTheDocument();
        expect(screen.queryByText('A')).not.toBeInTheDocument();
      });
    });

    it('displays error message when delete API fails', async () => {
      vi.spyOn(api, 'deleteEntryPoint').mockRejectedValue(new Error('Failed to delete entry point'));
      
      render(<EntryPointsManagement />);
      await waitFor(() => {
        expect(screen.getByText('Main Entrance')).toBeInTheDocument();
      });
      
      const deleteButtons = screen.getAllByRole('button', { name: /delete/i });
      await userEvent.click(deleteButtons[0]);
      
      const confirmButton = screen.getByRole('button', { name: /delete entry point/i });
      await userEvent.click(confirmButton);
      
      await waitFor(() => {
        expect(screen.getByText('Failed to delete entry point')).toBeInTheDocument();
      });
    });

    it('disables delete button during deletion', async () => {
      vi.spyOn(api, 'deleteEntryPoint').mockImplementation(() => new Promise(() => {}));
      
      render(<EntryPointsManagement />);
      await waitFor(() => {
        expect(screen.getByText('Main Entrance')).toBeInTheDocument();
      });
      
      const deleteButtons = screen.getAllByRole('button', { name: /delete/i });
      await userEvent.click(deleteButtons[0]);
      
      const confirmButton = screen.getByRole('button', { name: /delete entry point/i });
      await userEvent.click(confirmButton);
      
      await waitFor(() => {
        expect(confirmButton).toBeDisabled();
        expect(screen.getByText('Deleting...')).toBeInTheDocument();
      });
    });

    it('shows warning about minimum entry points in delete dialog', async () => {
      render(<EntryPointsManagement />);
      await waitFor(() => {
        expect(screen.getByText('Main Entrance')).toBeInTheDocument();
      });
      
      const deleteButtons = screen.getAllByRole('button', { name: /delete/i });
      await userEvent.click(deleteButtons[0]);
      
      expect(screen.getByText(/Deleting an entry point may affect slot distance calculations/i)).toBeInTheDocument();
    });
  });

  describe('Integration Tests', () => {
    it('tests complete flow: create → update → delete', async () => {
      const newEntryPoint: EntryPoint = {
        id: 4,
        identifier: 'D',
        name: 'New Entrance',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };

      // Create
      vi.spyOn(api, 'createEntryPoint').mockResolvedValue(newEntryPoint);
      vi.spyOn(api, 'getEntryPoints')
        .mockResolvedValueOnce(mockEntryPoints)
        .mockResolvedValueOnce([...mockEntryPoints, newEntryPoint]);

      render(<EntryPointsManagement />);
      await waitFor(() => {
        expect(screen.getByText('Main Entrance')).toBeInTheDocument();
      });

      const createButton = screen.getByRole('button', { name: /create entry point/i });
      await userEvent.click(createButton);

      const identifierInput = screen.getByLabelText(/Entry Point Identifier/i);
      await userEvent.type(identifierInput, 'D');

      const nameInput = screen.getByLabelText(/Entry Point Name/i);
      await userEvent.type(nameInput, 'New Entrance');

      const submitButton = screen.getByRole('button', { name: /^create$/i });
      await userEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('New Entrance')).toBeInTheDocument();
      });

      // Update
      vi.spyOn(api, 'updateEntryPoint').mockResolvedValue(undefined);
      vi.spyOn(api, 'getEntryPoints').mockResolvedValueOnce([
        ...mockEntryPoints,
        { ...newEntryPoint, name: 'Updated New Entrance' }
      ]);

      const editButtons = screen.getAllByRole('button', { name: /edit/i });
      await userEvent.click(editButtons[3]);

      const editNameInput = screen.getByLabelText(/Entry Point Name/i);
      await userEvent.clear(editNameInput);
      await userEvent.type(editNameInput, 'Updated New Entrance');

      const updateButton = screen.getByRole('button', { name: /update/i });
      await userEvent.click(updateButton);

      await waitFor(() => {
        expect(screen.getByText('Updated New Entrance')).toBeInTheDocument();
      });

      // Delete
      vi.spyOn(api, 'deleteEntryPoint').mockResolvedValue(undefined);
      vi.spyOn(api, 'getEntryPoints').mockResolvedValueOnce(mockEntryPoints);

      const deleteButtons = screen.getAllByRole('button', { name: /delete/i });
      await userEvent.click(deleteButtons[3]);

      const confirmButton = screen.getByRole('button', { name: /delete entry point/i });
      await userEvent.click(confirmButton);

      await waitFor(() => {
        expect(screen.queryByText('Updated New Entrance')).not.toBeInTheDocument();
      });
    });

    it('handles API network errors gracefully', async () => {
      vi.spyOn(api, 'getEntryPoints').mockRejectedValue(new Error('Network error'));
      
      render(<EntryPointsManagement />);
      
      await waitFor(() => {
        expect(screen.getByText('Network error')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /create entry point/i })).toBeInTheDocument();
      });
    });

    it('displays error alert that can be dismissed', async () => {
      vi.spyOn(api, 'getEntryPoints').mockRejectedValue(new Error('Test error'));
      
      render(<EntryPointsManagement />);
      
      await waitFor(() => {
        expect(screen.getByText('Test error')).toBeInTheDocument();
      });
      
      const dismissButton = screen.getByRole('button', { name: '×' });
      await userEvent.click(dismissButton);
      
      expect(screen.queryByText('Test error')).not.toBeInTheDocument();
    });

    it('reloads entry points after successful create', async () => {
      const newEntryPoint: EntryPoint = {
        id: 4,
        identifier: 'D',
        name: 'New Entrance',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };

      vi.spyOn(api, 'createEntryPoint').mockResolvedValue(newEntryPoint);
      vi.spyOn(api, 'getEntryPoints')
        .mockResolvedValueOnce(mockEntryPoints)
        .mockResolvedValueOnce([...mockEntryPoints, newEntryPoint]);

      render(<EntryPointsManagement />);
      await waitFor(() => {
        expect(screen.getByText('Main Entrance')).toBeInTheDocument();
      });

      const createButton = screen.getByRole('button', { name: /create entry point/i });
      await userEvent.click(createButton);

      const identifierInput = screen.getByLabelText(/Entry Point Identifier/i);
      await userEvent.type(identifierInput, 'D');

      const nameInput = screen.getByLabelText(/Entry Point Name/i);
      await userEvent.type(nameInput, 'New Entrance');

      const submitButton = screen.getByRole('button', { name: /^create$/i });
      await userEvent.click(submitButton);

      await waitFor(() => {
        expect(vi.mocked(api.getEntryPoints)).toHaveBeenCalledTimes(2);
      });
    });

    it('reloads entry points after successful update', async () => {
      vi.spyOn(api, 'updateEntryPoint').mockResolvedValue(undefined);
      vi.spyOn(api, 'getEntryPoints')
        .mockResolvedValueOnce(mockEntryPoints)
        .mockResolvedValueOnce([
          { ...mockEntryPoints[0], name: 'Updated Main Entrance' },
          mockEntryPoints[1],
          mockEntryPoints[2]
        ]);
      
      render(<EntryPointsManagement />);
      await waitFor(() => {
        expect(screen.getByText('Main Entrance')).toBeInTheDocument();
      });
      
      const editButtons = screen.getAllByRole('button', { name: /edit/i });
      await userEvent.click(editButtons[0]);
      
      const nameInput = screen.getByLabelText(/Entry Point Name/i);
      await userEvent.clear(nameInput);
      await userEvent.type(nameInput, 'Updated Main Entrance');
      
      const submitButton = screen.getByRole('button', { name: /update/i });
      await userEvent.click(submitButton);
      
      await waitFor(() => {
        expect(vi.mocked(api.getEntryPoints)).toHaveBeenCalledTimes(2);
      });
    });

    it('reloads entry points after successful delete', async () => {
      vi.spyOn(api, 'deleteEntryPoint').mockResolvedValue(undefined);
      vi.spyOn(api, 'getEntryPoints')
        .mockResolvedValueOnce(mockEntryPoints)
        .mockResolvedValueOnce([mockEntryPoints[1], mockEntryPoints[2]]);
      
      render(<EntryPointsManagement />);
      await waitFor(() => {
        expect(screen.getByText('Main Entrance')).toBeInTheDocument();
      });
      
      const deleteButtons = screen.getAllByRole('button', { name: /delete/i });
      await userEvent.click(deleteButtons[0]);
      
      const confirmButton = screen.getByRole('button', { name: /delete entry point/i });
      await userEvent.click(confirmButton);
      
      await waitFor(() => {
        expect(vi.mocked(api.getEntryPoints)).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe('API Parameter Validation', () => {
    it('calls create API with correct wrapped parameters', async () => {
      const newEntryPoint: EntryPoint = {
        id: 4,
        identifier: 'D',
        name: 'New Entrance',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };
      vi.spyOn(api, 'createEntryPoint').mockResolvedValue(newEntryPoint);

      render(<EntryPointsManagement />);
      const createButton = screen.getByRole('button', { name: /create entry point/i });
      await userEvent.click(createButton);

      const identifierInput = screen.getByLabelText(/Entry Point Identifier/i);
      await userEvent.type(identifierInput, 'D');

      const nameInput = screen.getByLabelText(/Entry Point Name/i);
      await userEvent.type(nameInput, 'New Entrance');

      const submitButton = screen.getByRole('button', { name: /^create$/i });
      await userEvent.click(submitButton);

      await waitFor(() => {
        expect(vi.mocked(api.createEntryPoint)).toHaveBeenCalledWith({
          identifier: 'D',
          name: 'New Entrance'
        });
      });
    });

    it('calls update API with correct wrapped parameters', async () => {
      vi.spyOn(api, 'updateEntryPoint').mockResolvedValue(undefined);

      render(<EntryPointsManagement />);
      await waitFor(() => {
        expect(screen.getByText('Main Entrance')).toBeInTheDocument();
      });

      const editButtons = screen.getAllByRole('button', { name: /edit/i });
      await userEvent.click(editButtons[0]);

      const nameInput = screen.getByLabelText(/Entry Point Name/i);
      await userEvent.clear(nameInput);
      await userEvent.type(nameInput, 'Updated Main Entrance');

      const submitButton = screen.getByRole('button', { name: /update/i });
      await userEvent.click(submitButton);

      await waitFor(() => {
        expect(vi.mocked(api.updateEntryPoint)).toHaveBeenCalledWith('1', {
          name: 'Updated Main Entrance'
        });
      });
    });

    it('calls delete API with correct identifier parameter', async () => {
      vi.spyOn(api, 'deleteEntryPoint').mockResolvedValue(undefined);
      
      render(<EntryPointsManagement />);
      await waitFor(() => {
        expect(screen.getByText('Main Entrance')).toBeInTheDocument();
      });
      
      const deleteButtons = screen.getAllByRole('button', { name: /delete/i });
      await userEvent.click(deleteButtons[0]);
      
      const confirmButton = screen.getByRole('button', { name: /delete entry point/i });
      await userEvent.click(confirmButton);
      
      await waitFor(() => {
        expect(vi.mocked(api.deleteEntryPoint)).toHaveBeenCalledWith('1');
      });
    });
  });

  describe('Success Messages', () => {
    it('displays success alert after creating entry point', async () => {
      render(<EntryPointsManagement />);

      const createButton = screen.getByRole('button', { name: /create entry point/i });
      await userEvent.click(createButton);

      const identifierInput = screen.getByLabelText('Entry Point Identifier');
      const nameInput = screen.getByLabelText('Entry Point Name');

      await userEvent.type(identifierInput, 'D');
      await userEvent.type(nameInput, 'New Entry Point');

      const submitButton = screen.getByRole('button', { name: /create$/i });
      await userEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/created successfully/i)).toBeInTheDocument();
      });
    });

    it('displays success alert after updating entry point', async () => {
      render(<EntryPointsManagement />);

      await waitFor(() => {
        expect(screen.getByText('Main Entrance')).toBeInTheDocument();
      });

      const editButtons = screen.getAllByRole('button', { name: /edit/i });
      await userEvent.click(editButtons[0]);

      const nameInput = screen.getByLabelText('Entry Point Name');
      await userEvent.clear(nameInput);
      await userEvent.type(nameInput, 'Updated Main Entrance');

      const submitButton = screen.getByRole('button', { name: /update$/i });
      await userEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/updated successfully/i)).toBeInTheDocument();
      });
    });

    it('displays success alert after deleting entry point', async () => {
      render(<EntryPointsManagement />);

      await waitFor(() => {
        expect(screen.getByText('Main Entrance')).toBeInTheDocument();
      });

      const deleteButtons = screen.getAllByRole('button', { name: /delete/i });
      await userEvent.click(deleteButtons[0]);

      const confirmButton = screen.getByRole('button', { name: /delete entry point/i });
      await userEvent.click(confirmButton);

      await waitFor(() => {
        expect(screen.getByText(/deleted successfully/i)).toBeInTheDocument();
      });
    });
  });
});
