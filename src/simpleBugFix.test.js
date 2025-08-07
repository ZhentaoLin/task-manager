import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import TaskManager from './App';
import { databaseService } from './services/databaseService';

// Mock the database service
jest.mock('./services/databaseService', () => ({
  databaseService: {
    getTasks: jest.fn(),
    saveTasks: jest.fn(),
    getCompletedTasks: jest.fn(),
    saveCompletedTasks: jest.fn(),
    getSelectedForToday: jest.fn(),
    saveSelectedForToday: jest.fn(),
  }
}));

jest.mock('./services/aiService', () => ({
  aiService: {
    isEnabled: false,
    generateEnhancedSummary: jest.fn()
  }
}));

describe('Simple Bug Fix Verification', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    databaseService.getTasks.mockResolvedValue([]);
    databaseService.getCompletedTasks.mockResolvedValue([]);
    databaseService.getSelectedForToday.mockResolvedValue([]);
    databaseService.saveTasks.mockResolvedValue();
    databaseService.saveCompletedTasks.mockResolvedValue();
    databaseService.saveSelectedForToday.mockResolvedValue();
  });

  test('Task completion flow works correctly', async () => {
    // Initial render with one task
    databaseService.getTasks.mockResolvedValue([
      {
        id: 1,
        text: 'Test Task',
        parentId: null,
        parentText: null,
        level: 0,
        createdAt: '2025-01-01T00:00:00Z'
      }
    ]);

    render(<TaskManager />);
    
    // Wait for data to load
    await waitFor(() => {
      expect(databaseService.getTasks).toHaveBeenCalled();
    });

    // Navigate to All Tasks tab
    const allTasksButton = screen.getByRole('button', { name: /All Tasks/i });
    fireEvent.click(allTasksButton);

    // Verify task is displayed
    expect(screen.getByText('Test Task')).toBeInTheDocument();

    // Click Complete button (there's only one task, so one button)
    const completeButtons = screen.getAllByRole('button', { name: /Complete/i });
    fireEvent.click(completeButtons[0]);

    // Verify the task is removed from the tasks list
    await waitFor(() => {
      // saveTasks should be called
      expect(databaseService.saveTasks).toHaveBeenCalled();
    });
    
    // Debug: Log all calls
    console.log('saveTasks calls:', databaseService.saveTasks.mock.calls);
    
    // Check the last call to saveTasks
    const saveTasksCalls = databaseService.saveTasks.mock.calls;
    const lastSaveTasksCall = saveTasksCalls[saveTasksCalls.length - 1];
    expect(lastSaveTasksCall[0]).toEqual([]);

    // Verify the task was moved to completed tasks
    expect(databaseService.saveCompletedTasks).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          id: 1,
          text: 'Test Task',
          completedAt: expect.any(String),
          completedDate: expect.any(String)
        })
      ])
    );

    // Task should no longer be visible in All Tasks
    expect(screen.queryByText('Test Task')).not.toBeInTheDocument();
  });

  test('The fix: saveTasks is called with correct data after completion', async () => {
    // Start with multiple tasks
    databaseService.getTasks.mockResolvedValue([
      { id: 1, text: 'Task 1', parentId: null, level: 0, createdAt: '2025-01-01T00:00:00Z' },
      { id: 2, text: 'Task 2', parentId: null, level: 0, createdAt: '2025-01-01T00:00:00Z' },
      { id: 3, text: 'Task 3', parentId: null, level: 0, createdAt: '2025-01-01T00:00:00Z' }
    ]);

    render(<TaskManager />);
    
    await waitFor(() => {
      expect(databaseService.getTasks).toHaveBeenCalled();
    });

    // Navigate to All Tasks
    fireEvent.click(screen.getByRole('button', { name: /All Tasks/i }));

    // Complete the first task
    const completeButtons = screen.getAllByRole('button', { name: /Complete/i });
    fireEvent.click(completeButtons[0]);

    // The key test: saveTasks should be called with remaining tasks only
    await waitFor(() => {
      expect(databaseService.saveTasks).toHaveBeenCalled();
      const lastCall = databaseService.saveTasks.mock.calls[databaseService.saveTasks.mock.calls.length - 1];
      const remainingTasks = lastCall[0];
      
      // Should have 2 tasks remaining (Task 2 and Task 3)
      expect(remainingTasks).toHaveLength(2);
      expect(remainingTasks.find(t => t.id === 2)).toBeTruthy();
      expect(remainingTasks.find(t => t.id === 3)).toBeTruthy();
      expect(remainingTasks.find(t => t.id === 1)).toBeFalsy(); // Task 1 should be gone
    });

    // This confirms that the completed task (Task 1) is removed from the tasks array
    // The fix in databaseService.js will ensure it's also deleted from the database
  });
});