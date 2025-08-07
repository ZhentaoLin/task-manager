import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
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

// Mock the AI service
jest.mock('./services/aiService', () => ({
  aiService: {
    isEnabled: false,
    generateEnhancedSummary: jest.fn()
  }
}));

describe('Task Status Management', () => {
  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Setup default mock responses
    databaseService.getTasks.mockResolvedValue([]);
    databaseService.getCompletedTasks.mockResolvedValue([]);
    databaseService.getSelectedForToday.mockResolvedValue([]);
    databaseService.saveTasks.mockResolvedValue();
    databaseService.saveCompletedTasks.mockResolvedValue();
    databaseService.saveSelectedForToday.mockResolvedValue();
  });

  describe('Task Lifecycle: Open -> Today -> Completed', () => {
    test('should create a new task in open status', async () => {
      const { container } = render(<TaskManager />);
      
      // Wait for initial load
      await waitFor(() => {
        expect(databaseService.getTasks).toHaveBeenCalled();
      });

      // Switch to All Tasks tab first
      const allTasksTab = screen.getByRole('button', { name: /All Tasks/i });
      fireEvent.click(allTasksTab);

      // Find the task input and add button
      const taskInput = container.querySelector('textarea[placeholder*="Enter task description"]');
      const addButton = screen.getByRole('button', { name: /Add Task/i });

      // Add a new task
      fireEvent.change(taskInput, { target: { value: 'Test task 1' } });
      fireEvent.click(addButton);

      // Verify the task appears in the UI
      await waitFor(() => {
        expect(screen.getByText('Test task 1')).toBeInTheDocument();
      });

      // Verify saveTasks was called with the new task
      expect(databaseService.saveTasks).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            text: 'Test task 1',
            parentId: null,
            level: 0
          })
        ])
      );
    });

    test('should add task to today list', async () => {
      // Setup initial task
      const mockTask = {
        id: 1,
        text: 'Test task for today',
        parentId: null,
        parentText: null,
        level: 0,
        createdAt: new Date().toISOString()
      };
      
      databaseService.getTasks.mockResolvedValue([mockTask]);
      
      const { container } = render(<TaskManager />);
      
      // Wait for initial load
      await waitFor(() => {
        expect(databaseService.getTasks).toHaveBeenCalled();
      });

      // Switch to All Tasks tab
      const allTasksTab = screen.getByRole('button', { name: /All Tasks/i });
      fireEvent.click(allTasksTab);
      
      // Wait for tasks to load
      await waitFor(() => {
        expect(screen.getByText('Test task for today')).toBeInTheDocument();
      });

      // Click "Add to Today" button
      const addToTodayButton = screen.getByRole('button', { name: /Add to Today/i });
      fireEvent.click(addToTodayButton);

      // Verify saveSelectedForToday was called
      await waitFor(() => {
        expect(databaseService.saveSelectedForToday).toHaveBeenCalledWith([1]);
      });

      // Button should now say "Remove from Today"
      expect(screen.getByRole('button', { name: /Remove from Today/i })).toBeInTheDocument();
    });

    test('should complete task and move to completed_tasks table', async () => {
      // Setup initial task
      const mockTask = {
        id: 1,
        text: 'Task to complete',
        parentId: null,
        parentText: null,
        level: 0,
        createdAt: new Date().toISOString()
      };
      
      databaseService.getTasks.mockResolvedValue([mockTask]);
      
      const { container } = render(<TaskManager />);
      
      // Wait for initial load
      await waitFor(() => {
        expect(databaseService.getTasks).toHaveBeenCalled();
      });

      // Switch to All Tasks tab
      const allTasksTab = screen.getByRole('button', { name: /All Tasks/i });
      fireEvent.click(allTasksTab);
      
      // Wait for tasks to load
      await waitFor(() => {
        expect(screen.getByText('Task to complete')).toBeInTheDocument();
      });

      // Click "Complete" button
      const completeButton = screen.getByRole('button', { name: /Complete/i });
      fireEvent.click(completeButton);

      // Verify the task is removed from open tasks
      await waitFor(() => {
        expect(databaseService.saveTasks).toHaveBeenCalledWith([]);
      });

      // Verify the task is added to completed tasks
      expect(databaseService.saveCompletedTasks).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            id: 1,
            text: 'Task to complete',
            completedAt: expect.any(String),
            completedDate: expect.any(String)
          })
        ])
      );
    });

    test('should handle parent-child task relationships', async () => {
      const parentTask = {
        id: 1,
        text: 'Parent task',
        parentId: null,
        parentText: null,
        level: 0,
        createdAt: new Date().toISOString()
      };
      
      const childTask = {
        id: 2,
        text: 'Child task',
        parentId: 1,
        parentText: 'Parent task',
        level: 1,
        createdAt: new Date().toISOString()
      };
      
      databaseService.getTasks.mockResolvedValue([parentTask, childTask]);
      
      render(<TaskManager />);
      
      // Verify both tasks are displayed
      await waitFor(() => {
        expect(screen.getByText('Parent task')).toBeInTheDocument();
        expect(screen.getByText('Child task')).toBeInTheDocument();
      });

      // Verify child task shows parent context
      const childTaskElement = screen.getByText('Child task').closest('div');
      expect(childTaskElement).toHaveTextContent('Parent task');
    });
  });

  describe('Bug: Completed tasks reappearing after refresh', () => {
    test('should reproduce the bug - completed task reappears on reload', async () => {
      // Initial state with one task
      const mockTask = {
        id: 1,
        text: 'Task that will be completed',
        parentId: null,
        parentText: null,
        level: 0,
        createdAt: new Date().toISOString()
      };
      
      databaseService.getTasks.mockResolvedValue([mockTask]);
      
      const { rerender } = render(<TaskManager />);
      
      // Wait for initial load
      await waitFor(() => {
        expect(databaseService.getTasks).toHaveBeenCalled();
      });

      // Switch to All Tasks tab to see the task
      const allTasksTab = screen.getByRole('button', { name: /All Tasks/i });
      fireEvent.click(allTasksTab);
      
      // Now wait for the task to appear
      await waitFor(() => {
        expect(screen.getByText('Task that will be completed')).toBeInTheDocument();
      });

      // Complete the task
      const completeButton = screen.getByRole('button', { name: /Complete/i });
      fireEvent.click(completeButton);

      // Task should be removed from view
      await waitFor(() => {
        expect(screen.queryByText('Task that will be completed')).not.toBeInTheDocument();
      });

      // Simulate a page refresh by re-rendering with the task still in getTasks
      // This simulates the bug where the task wasn't deleted from the database
      databaseService.getTasks.mockResolvedValue([mockTask]);
      databaseService.getCompletedTasks.mockResolvedValue([{
        ...mockTask,
        completedAt: new Date().toISOString(),
        completedDate: new Date().toLocaleDateString()
      }]);
      
      // Force component remount to simulate page refresh
      rerender(<TaskManager key="refresh" />);

      // Wait for reload
      await waitFor(() => {
        expect(databaseService.getTasks).toHaveBeenCalledTimes(2);
      });

      // Switch to All Tasks tab again
      const allTasksTabAfterRefresh = screen.getByRole('button', { name: /All Tasks/i });
      fireEvent.click(allTasksTabAfterRefresh);

      // BUG: The completed task reappears in the open tasks list
      await waitFor(() => {
        // This demonstrates the bug - the task shouldn't be here but it is
        expect(screen.getByText('Task that will be completed')).toBeInTheDocument();
      });
    });

    test('expected behavior: completed task should NOT reappear after refresh', async () => {
      // This test shows what SHOULD happen
      const mockTask = {
        id: 1,
        text: 'Task that will stay completed',
        parentId: null,
        parentText: null,
        level: 0,
        createdAt: new Date().toISOString()
      };
      
      databaseService.getTasks.mockResolvedValue([mockTask]);
      
      const { rerender } = render(<TaskManager />);
      
      // Wait for initial load
      await waitFor(() => {
        expect(databaseService.getTasks).toHaveBeenCalled();
      });

      // Switch to All Tasks tab
      const allTasksTab = screen.getByRole('button', { name: /All Tasks/i });
      fireEvent.click(allTasksTab);
      
      await waitFor(() => {
        expect(screen.getByText('Task that will stay completed')).toBeInTheDocument();
      });

      // Complete the task
      const completeButton = screen.getByRole('button', { name: /Complete/i });
      fireEvent.click(completeButton);

      await waitFor(() => {
        expect(screen.queryByText('Task that will stay completed')).not.toBeInTheDocument();
      });

      // After fix: getTasks should return empty array (task was deleted)
      databaseService.getTasks.mockResolvedValue([]);
      databaseService.getCompletedTasks.mockResolvedValue([{
        ...mockTask,
        completedAt: new Date().toISOString(),
        completedDate: new Date().toLocaleDateString()
      }]);
      
      // Simulate page refresh
      rerender(<TaskManager key="refresh-fixed" />);

      // Switch to All Tasks tab to check if task is there
      const allTasksTabAfterRefresh = screen.getByRole('button', { name: /All Tasks/i });
      fireEvent.click(allTasksTabAfterRefresh);

      // Task should NOT reappear in open tasks
      await waitFor(() => {
        expect(screen.queryByText('Task that will stay completed')).not.toBeInTheDocument();
      });

      // Switch to completed tab to verify task is there
      const completedTab = screen.getByRole('button', { name: /Completed Tasks/i });
      fireEvent.click(completedTab);

      // Task should be in completed tasks
      await waitFor(() => {
        expect(screen.getByText('Task that will stay completed')).toBeInTheDocument();
      });
    });
  });

  describe('Data Persistence', () => {
    test('should properly sync all three tables', async () => {
      const mockTasks = [
        {
          id: 1,
          text: 'Open task',
          parentId: null,
          parentText: null,
          level: 0,
          createdAt: new Date().toISOString()
        },
        {
          id: 2,
          text: 'Task for today',
          parentId: null,
          parentText: null,
          level: 0,
          createdAt: new Date().toISOString()
        }
      ];
      
      const mockCompleted = [
        {
          id: 3,
          text: 'Completed task',
          parentId: null,
          parentText: null,
          level: 0,
          createdAt: new Date().toISOString(),
          completedAt: new Date().toISOString(),
          completedDate: new Date().toLocaleDateString()
        }
      ];
      
      databaseService.getTasks.mockResolvedValue(mockTasks);
      databaseService.getCompletedTasks.mockResolvedValue(mockCompleted);
      databaseService.getSelectedForToday.mockResolvedValue([2]);
      
      render(<TaskManager />);
      
      // Verify all data is loaded correctly
      await waitFor(() => {
        expect(databaseService.getTasks).toHaveBeenCalled();
        expect(databaseService.getCompletedTasks).toHaveBeenCalled();
        expect(databaseService.getSelectedForToday).toHaveBeenCalled();
      });

      // Check open tasks
      expect(screen.getByText('Open task')).toBeInTheDocument();
      expect(screen.getByText('Task for today')).toBeInTheDocument();

      // Check completed tasks (switch to completed tab)
      const completedTab = screen.getByRole('button', { name: /Completed Tasks/i });
      fireEvent.click(completedTab);
      
      await waitFor(() => {
        expect(screen.getByText('Completed task')).toBeInTheDocument();
      });

      // Check today's tasks (switch to today tab)
      const todayTab = screen.getByRole('button', { name: /Today's Tasks/i });
      fireEvent.click(todayTab);
      
      await waitFor(() => {
        expect(screen.getByText('Task for today')).toBeInTheDocument();
      });
    });
  });
});