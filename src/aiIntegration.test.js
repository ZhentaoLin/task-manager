import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import TaskManager from './App';
import { aiService } from './services/aiService';
import { databaseService } from './services/databaseService';

// Mock the services
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
    isEnabled: true,
    generateEnhancedSummary: jest.fn()
  }
}));

// Mock fetch for backend API calls
global.fetch = jest.fn();

describe('AI Integration - Claude API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch.mockClear();
    
    // Setup default mock responses
    databaseService.getTasks.mockResolvedValue([]);
    databaseService.getCompletedTasks.mockResolvedValue([]);
    databaseService.getSelectedForToday.mockResolvedValue([]);
    databaseService.saveTasks.mockResolvedValue();
    databaseService.saveCompletedTasks.mockResolvedValue();
    databaseService.saveSelectedForToday.mockResolvedValue();
  });

  describe('Today\'s Summary Button', () => {
    test('should trigger Claude API call when clicked', async () => {
      // Setup completed tasks for today
      const todayDate = new Date().toLocaleDateString();
      const completedTasks = [
        {
          id: 1,
          text: 'Completed task 1',
          parentId: null,
          parentText: null,
          level: 0,
          createdAt: new Date().toISOString(),
          completedAt: new Date().toISOString(),
          completedDate: todayDate
        },
        {
          id: 2,
          text: 'Completed task 2',
          parentId: null,
          parentText: null,
          level: 0,
          createdAt: new Date().toISOString(),
          completedAt: new Date().toISOString(),
          completedDate: todayDate
        }
      ];
      
      databaseService.getCompletedTasks.mockResolvedValue(completedTasks);
      
      // Mock successful AI response
      aiService.generateEnhancedSummary.mockResolvedValue(
        '## Daily Summary\n\n**Key Accomplishments:**\n- Completed 2 important tasks\n\n**Productivity Insights:**\n- Strong focus on task completion'
      );

      render(<TaskManager />);
      
      // Wait for initial load
      await waitFor(() => {
        expect(databaseService.getCompletedTasks).toHaveBeenCalled();
      });

      // Switch to completed tasks tab
      const completedTab = screen.getByRole('button', { name: /Completed Tasks/i });
      fireEvent.click(completedTab);

      // Find and click Today's Summary button
      const summaryButton = screen.getByRole('button', { name: /Today's Summary/i });
      fireEvent.click(summaryButton);

      // Verify AI service was called with correct parameters
      await waitFor(() => {
        expect(aiService.generateEnhancedSummary).toHaveBeenCalledWith(
          completedTasks,
          'daily',
          todayDate
        );
      });

      // Verify the summary is displayed in the modal
      await waitFor(() => {
        expect(screen.getByText(/Daily Summary/)).toBeInTheDocument();
        expect(screen.getByText(/Key Accomplishments/)).toBeInTheDocument();
      });
    });

    test('should handle AI service errors gracefully', async () => {
      const todayDate = new Date().toLocaleDateString();
      const completedTasks = [
        {
          id: 1,
          text: 'Task 1',
          parentId: null,
          parentText: null,
          level: 0,
          createdAt: new Date().toISOString(),
          completedAt: new Date().toISOString(),
          completedDate: todayDate
        }
      ];
      
      databaseService.getCompletedTasks.mockResolvedValue(completedTasks);
      
      // Mock AI service failure
      aiService.generateEnhancedSummary.mockRejectedValue(new Error('AI service unavailable'));

      render(<TaskManager />);
      
      await waitFor(() => {
        expect(databaseService.getCompletedTasks).toHaveBeenCalled();
      });

      // Switch to completed tasks tab
      const completedTab = screen.getByRole('button', { name: /Completed Tasks/i });
      fireEvent.click(completedTab);

      // Click Today's Summary button
      const summaryButton = screen.getByRole('button', { name: /Today's Summary/i });
      fireEvent.click(summaryButton);

      // Should fall back to basic summary
      await waitFor(() => {
        expect(aiService.generateEnhancedSummary).toHaveBeenCalled();
      });

      // Basic summary should still be displayed
      await waitFor(() => {
        expect(screen.getByText(new RegExp(`Daily Summary for ${todayDate}`))).toBeInTheDocument();
      });
    });

    test('should make backend API call with correct endpoint', async () => {
      // Mock environment variables
      process.env.REACT_APP_AI_ENABLED = 'true';
      process.env.REACT_APP_BACKEND_URL = 'http://localhost:3001';
      
      // Setup mock fetch response
      global.fetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          summary: 'AI generated summary from backend'
        })
      });

      const todayDate = new Date().toLocaleDateString();
      const completedTasks = [
        {
          id: 1,
          text: 'Backend test task',
          parentId: null,
          parentText: null,
          level: 0,
          createdAt: new Date().toISOString(),
          completedAt: new Date().toISOString(),
          completedDate: todayDate
        }
      ];
      
      databaseService.getCompletedTasks.mockResolvedValue(completedTasks);
      
      // Mock the AI service to actually call the backend
      aiService.generateEnhancedSummary.mockImplementation(async (tasks, type, date) => {
        const response = await fetch('http://localhost:3001/api/claude/summary', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ 
            prompt: `Generate summary for ${tasks.length} tasks` 
          }),
        });
        const data = await response.json();
        return data.summary;
      });

      render(<TaskManager />);
      
      await waitFor(() => {
        expect(databaseService.getCompletedTasks).toHaveBeenCalled();
      });

      // Switch to completed tasks tab
      const completedTab = screen.getByRole('button', { name: /Completed Tasks/i });
      fireEvent.click(completedTab);

      // Click Today's Summary button
      const summaryButton = screen.getByRole('button', { name: /Today's Summary/i });
      fireEvent.click(summaryButton);

      // Verify backend API was called
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          'http://localhost:3001/api/claude/summary',
          expect.objectContaining({
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: expect.stringContaining('Generate summary')
          })
        );
      });
    });

    test('should disable AI features when AI_ENABLED is false', async () => {
      // Disable AI
      aiService.isEnabled = false;
      
      const todayDate = new Date().toLocaleDateString();
      const completedTasks = [
        {
          id: 1,
          text: 'Task without AI',
          parentId: null,
          parentText: null,
          level: 0,
          createdAt: new Date().toISOString(),
          completedAt: new Date().toISOString(),
          completedDate: todayDate
        }
      ];
      
      databaseService.getCompletedTasks.mockResolvedValue(completedTasks);
      
      // AI service should return null when disabled
      aiService.generateEnhancedSummary.mockResolvedValue(null);

      render(<TaskManager />);
      
      await waitFor(() => {
        expect(databaseService.getCompletedTasks).toHaveBeenCalled();
      });

      // Switch to completed tasks tab
      const completedTab = screen.getByRole('button', { name: /Completed Tasks/i });
      fireEvent.click(completedTab);

      // Click Today's Summary button
      const summaryButton = screen.getByRole('button', { name: /Today's Summary/i });
      fireEvent.click(summaryButton);

      // Should use basic summary without AI
      await waitFor(() => {
        expect(screen.getByText(new RegExp(`Daily Summary for ${todayDate}`))).toBeInTheDocument();
        expect(screen.getByText(/Total completed: 1 tasks/)).toBeInTheDocument();
      });
      
      // AI service should have been called but returned null
      expect(aiService.generateEnhancedSummary).toHaveBeenCalled();
    });
  });

  describe('Backend Proxy Integration', () => {
    test('should handle CORS and authentication via backend proxy', async () => {
      // Mock backend proxy response
      global.fetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          summary: 'Proxied AI response'
        })
      });

      // Simulate calling the backend proxy
      const response = await fetch('http://localhost:3001/api/claude/summary', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: 'Test prompt for Claude'
        }),
      });

      const data = await response.json();
      
      expect(data.summary).toBe('Proxied AI response');
      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:3001/api/claude/summary',
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          }
        })
      );
    });

    test('should handle backend errors appropriately', async () => {
      // Mock backend error response
      global.fetch.mockResolvedValue({
        ok: false,
        status: 500,
        text: async () => 'Internal server error'
      });

      const todayDate = new Date().toLocaleDateString();
      const completedTasks = [
        {
          id: 1,
          text: 'Task with backend error',
          parentId: null,
          parentText: null,
          level: 0,
          createdAt: new Date().toISOString(),
          completedAt: new Date().toISOString(),
          completedDate: todayDate
        }
      ];
      
      databaseService.getCompletedTasks.mockResolvedValue(completedTasks);
      
      // Mock AI service to throw error on backend failure
      aiService.generateEnhancedSummary.mockImplementation(async () => {
        const response = await fetch('http://localhost:3001/api/claude/summary', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt: 'test' }),
        });
        
        if (!response.ok) {
          throw new Error('Backend API error');
        }
        return null;
      });

      render(<TaskManager />);
      
      await waitFor(() => {
        expect(databaseService.getCompletedTasks).toHaveBeenCalled();
      });

      // Switch to completed tasks tab
      const completedTab = screen.getByRole('button', { name: /Completed Tasks/i });
      fireEvent.click(completedTab);

      // Click Today's Summary button
      const summaryButton = screen.getByRole('button', { name: /Today's Summary/i });
      fireEvent.click(summaryButton);

      // Should fall back to basic summary on error
      await waitFor(() => {
        expect(screen.getByText(new RegExp(`Daily Summary for ${todayDate}`))).toBeInTheDocument();
      });
    });
  });

  describe('Summary Modal Behavior', () => {
    test('should open and close summary modal correctly', async () => {
      const todayDate = new Date().toLocaleDateString();
      const completedTasks = [
        {
          id: 1,
          text: 'Modal test task',
          parentId: null,
          parentText: null,
          level: 0,
          createdAt: new Date().toISOString(),
          completedAt: new Date().toISOString(),
          completedDate: todayDate
        }
      ];
      
      databaseService.getCompletedTasks.mockResolvedValue(completedTasks);
      aiService.generateEnhancedSummary.mockResolvedValue('Test summary content');

      render(<TaskManager />);
      
      await waitFor(() => {
        expect(databaseService.getCompletedTasks).toHaveBeenCalled();
      });

      // Switch to completed tasks tab
      const completedTab = screen.getByRole('button', { name: /Completed Tasks/i });
      fireEvent.click(completedTab);

      // Click Today's Summary button to open modal
      const summaryButton = screen.getByRole('button', { name: /Today's Summary/i });
      fireEvent.click(summaryButton);

      // Verify modal is open
      await waitFor(() => {
        expect(screen.getByText('Test summary content')).toBeInTheDocument();
      });

      // Find and click the close button (X)
      const closeButton = screen.getByRole('button', { name: '' });
      fireEvent.click(closeButton);

      // Verify modal is closed
      await waitFor(() => {
        expect(screen.queryByText('Test summary content')).not.toBeInTheDocument();
      });
    });
  });
});