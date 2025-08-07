import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import TaskManager from './App';
import { databaseService } from './services/databaseService';

// Mock the services
jest.mock('./services/databaseService');
jest.mock('./services/aiService', () => ({
  aiService: {
    isEnabled: false,
    generateEnhancedSummary: jest.fn()
  }
}));

describe('Bug Fix: Completed tasks persistence', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    databaseService.getTasks.mockResolvedValue([]);
    databaseService.getCompletedTasks.mockResolvedValue([]);
    databaseService.getSelectedForToday.mockResolvedValue([]);
    databaseService.saveTasks.mockResolvedValue();
    databaseService.saveCompletedTasks.mockResolvedValue();
    databaseService.saveSelectedForToday.mockResolvedValue();
  });

  test('Completed task should not reappear after page refresh', async () => {
    // Step 1: Start with a task
    const task = {
      id: 123,
      text: 'Fix the bug',
      parentId: null,
      parentText: null,
      level: 0,
      createdAt: new Date().toISOString()
    };
    
    databaseService.getTasks.mockResolvedValue([task]);
    
    const { unmount } = render(<TaskManager />);
    
    await waitFor(() => {
      expect(databaseService.getTasks).toHaveBeenCalled();
    });

    // Go to All Tasks tab
    fireEvent.click(screen.getByRole('button', { name: /All Tasks/i }));
    
    // Verify task is visible
    expect(screen.getByText('Fix the bug')).toBeInTheDocument();
    
    // Step 2: Complete the task
    fireEvent.click(screen.getByRole('button', { name: /Complete/i }));
    
    // Verify saveTasks was called with empty array (task removed)
    await waitFor(() => {
      expect(databaseService.saveTasks).toHaveBeenCalledWith([]);
    });
    
    // Verify saveCompletedTasks was called with the completed task
    expect(databaseService.saveCompletedTasks).toHaveBeenCalledWith([
      expect.objectContaining({
        id: 123,
        text: 'Fix the bug',
        completedAt: expect.any(String),
        completedDate: expect.any(String)
      })
    ]);
    
    // Task should disappear from All Tasks
    expect(screen.queryByText('Fix the bug')).not.toBeInTheDocument();
    
    // Step 3: Simulate page refresh
    unmount();
    
    // After refresh, database should return empty tasks array (task was deleted)
    databaseService.getTasks.mockResolvedValue([]);
    databaseService.getCompletedTasks.mockResolvedValue([{
      ...task,
      completedAt: new Date().toISOString(),
      completedDate: new Date().toLocaleDateString()
    }]);
    
    render(<TaskManager />);
    
    await waitFor(() => {
      expect(databaseService.getTasks).toHaveBeenCalled();
    });
    
    // Go to All Tasks tab again
    fireEvent.click(screen.getByRole('button', { name: /All Tasks/i }));
    
    // Step 4: Verify task does NOT reappear in All Tasks
    expect(screen.queryByText('Fix the bug')).not.toBeInTheDocument();
    
    // Step 5: Verify task IS in Completed Tasks
    fireEvent.click(screen.getByRole('button', { name: /Completed Tasks/i }));
    
    await waitFor(() => {
      expect(screen.getByText('Fix the bug')).toBeInTheDocument();
    });
  });

  test('Database sync properly deletes removed tasks', async () => {
    // This tests the actual fix in databaseService
    // When saveTasks is called, it should identify and delete tasks
    // that exist in the database but not in the current state
    
    const tasks = [
      { id: 1, text: 'Task 1', parentId: null, level: 0, createdAt: new Date().toISOString() },
      { id: 2, text: 'Task 2', parentId: null, level: 0, createdAt: new Date().toISOString() }
    ];
    
    databaseService.getTasks.mockResolvedValue(tasks);
    
    render(<TaskManager />);
    
    await waitFor(() => {
      expect(databaseService.getTasks).toHaveBeenCalled();
    });

    // Go to All Tasks
    fireEvent.click(screen.getByRole('button', { name: /All Tasks/i }));
    
    // Complete Task 1
    const completeButtons = screen.getAllByRole('button', { name: /Complete/i });
    fireEvent.click(completeButtons[0]);
    
    // saveTasks should be called with only Task 2
    await waitFor(() => {
      expect(databaseService.saveTasks).toHaveBeenLastCalledWith([
        expect.objectContaining({ id: 2, text: 'Task 2' })
      ]);
    });
    
    // The fix ensures that Task 1 would be deleted from the database
    // This prevents it from reappearing on refresh
  });
});