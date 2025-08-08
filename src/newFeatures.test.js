import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import TaskManager from './App';
import { databaseService } from './services/databaseService';
import { aiService } from './services/aiService';

// Mock the services
jest.mock('./services/aiService', () => ({
  aiService: {
    generateEnhancedSummary: jest.fn()
  }
}));

jest.mock('./services/databaseService', () => ({
  databaseService: {
    getTasks: jest.fn(() => Promise.resolve([])),
    getCompletedTasks: jest.fn(() => Promise.resolve([])),
    getSelectedForToday: jest.fn(() => Promise.resolve([])),
    saveTasks: jest.fn(),
    saveCompletedTasks: jest.fn(),
    saveSelectedForToday: jest.fn()
  }
}));

describe('New Features - JIRA, GitHub PR, and Description Fields', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Task Creation with New Fields', () => {
    test('creates task with all new fields via bulk import', async () => {
      render(<TaskManager />);
      
      // Switch to All tab
      fireEvent.click(screen.getByText('All'));
      
      // Switch to bulk import
      fireEvent.click(screen.getByText('Bulk'));
      
      const textarea = screen.getByPlaceholderText('Paste tasks (use indentation for sub-tasks)');
      const importButton = screen.getByText('Import');
      
      // Enter task with description and links
      const bulkText = `Fix authentication bug
> This bug prevents users from logging in
> It needs urgent attention
[JIRA: AUTH-123] [PR: #456]`;
      
      await userEvent.type(textarea, bulkText);
      fireEvent.click(importButton);
      
      // Verify task was created
      await waitFor(() => {
        expect(screen.getByText('Fix authentication bug')).toBeInTheDocument();
      });
      
      // Verify database save was called with correct fields
      expect(databaseService.saveTasks).toHaveBeenCalled();
      const savedTasks = databaseService.saveTasks.mock.calls[0][0];
      expect(savedTasks[0]).toMatchObject({
        text: 'Fix authentication bug',
        description: 'This bug prevents users from logging in\nIt needs urgent attention',
        jiraTicket: 'AUTH-123',
        githubPr: '#456'
      });
    });

    test('creates subtask with parent inheritance', async () => {
      // Mock existing task
      databaseService.getTasks.mockResolvedValue([{
        id: 1,
        text: 'Parent task',
        description: 'Parent description',
        jiraTicket: 'PARENT-100',
        githubPr: '#100',
        parentId: null,
        parentText: null,
        level: 0,
        createdAt: new Date().toISOString()
      }]);
      
      render(<TaskManager />);
      
      await waitFor(() => {
        fireEvent.click(screen.getByText('All'));
      });
      
      // Wait for task to load
      await waitFor(() => {
        expect(screen.getByText('Parent task')).toBeInTheDocument();
      });
    });
  });

  describe('Task Display with New Fields', () => {
    test('displays JIRA ticket badge with correct link', async () => {
      databaseService.getTasks.mockResolvedValue([{
        id: 1,
        text: 'Task with JIRA',
        jiraTicket: 'PROJ-123',
        githubPr: null,
        description: null,
        parentId: null,
        parentText: null,
        level: 0,
        createdAt: new Date().toISOString()
      }]);
      
      render(<TaskManager />);
      fireEvent.click(screen.getByText('All'));
      
      await waitFor(() => {
        const jiraBadge = screen.getByText('PROJ-123');
        expect(jiraBadge).toBeInTheDocument();
        expect(jiraBadge.closest('a')).toHaveAttribute('href', 'https://linkedin.atlassian.net/browse/PROJ-123');
      });
    });

    test('displays GitHub PR badge with correct link', async () => {
      databaseService.getTasks.mockResolvedValue([{
        id: 1,
        text: 'Task with PR',
        jiraTicket: null,
        githubPr: '#789',
        description: null,
        parentId: null,
        parentText: null,
        level: 0,
        createdAt: new Date().toISOString()
      }]);
      
      render(<TaskManager />);
      fireEvent.click(screen.getByText('All'));
      
      await waitFor(() => {
        const prBadge = screen.getByText('#789');
        expect(prBadge).toBeInTheDocument();
        expect(prBadge.closest('a')).toHaveAttribute('href', 'https://github.com/#789');
      });
    });

    test('expands to show description when clicked', async () => {
      databaseService.getTasks.mockResolvedValue([{
        id: 1,
        text: 'Task with description',
        description: 'This is a detailed description',
        jiraTicket: null,
        githubPr: null,
        parentId: null,
        parentText: null,
        level: 0,
        createdAt: new Date().toISOString()
      }]);
      
      render(<TaskManager />);
      fireEvent.click(screen.getByText('All'));
      
      await waitFor(() => {
        expect(screen.getByText('Task with description')).toBeInTheDocument();
      });
      
      // Description should not be visible initially
      expect(screen.queryByText('This is a detailed description')).not.toBeInTheDocument();
      
      // Click expand button
      const expandButton = screen.getByRole('button', { expanded: false });
      fireEvent.click(expandButton);
      
      // Description should now be visible
      expect(screen.getByText('This is a detailed description')).toBeInTheDocument();
    });
  });

  describe('Task Editing with New Fields', () => {
    test('edits task with all fields', async () => {
      databaseService.getTasks.mockResolvedValue([{
        id: 1,
        text: 'Original task',
        description: 'Original description',
        jiraTicket: 'OLD-123',
        githubPr: '#111',
        parentId: null,
        parentText: null,
        level: 0,
        createdAt: new Date().toISOString()
      }]);
      
      render(<TaskManager />);
      fireEvent.click(screen.getByText('All'));
      
      await waitFor(() => {
        expect(screen.getByText('Original task')).toBeInTheDocument();
      });
      
      // Click to edit
      fireEvent.click(screen.getByText('Original task'));
      
      // Find all input fields
      const inputs = screen.getAllByRole('textbox');
      const taskInput = inputs[0]; // Task title
      const descriptionInput = inputs[1]; // Description
      const jiraInput = screen.getByPlaceholderText('JIRA ticket (e.g., ABC-123)');
      const githubInput = screen.getByPlaceholderText('GitHub PR (e.g., #123)');
      
      // Update all fields
      await userEvent.clear(taskInput);
      await userEvent.type(taskInput, 'Updated task');
      
      await userEvent.clear(descriptionInput);
      await userEvent.type(descriptionInput, 'Updated description');
      
      await userEvent.clear(jiraInput);
      await userEvent.type(jiraInput, 'NEW-456');
      
      await userEvent.clear(githubInput);
      await userEvent.type(githubInput, '#222');
      
      // Save
      fireEvent.click(screen.getByText('Save'));
      
      // Verify updates
      await waitFor(() => {
        expect(screen.getByText('Updated task')).toBeInTheDocument();
        expect(databaseService.saveTasks).toHaveBeenCalled();
      });
      
      const savedTasks = databaseService.saveTasks.mock.calls[0][0];
      expect(savedTasks[0]).toMatchObject({
        text: 'Updated task',
        description: 'Updated description',
        jiraTicket: 'NEW-456',
        githubPr: '#222'
      });
    });
  });

  describe('JIRA Integration with Description', () => {
    test('uses description field in JIRA payload', async () => {
      const task = {
        id: 1,
        text: 'Task title',
        description: 'Detailed task description\nWith multiple lines',
        jiraTicket: null,
        githubPr: '#333',
        parentId: null,
        parentText: null,
        level: 0,
        createdAt: new Date().toISOString()
      };
      
      databaseService.getTasks.mockResolvedValue([task]);
      
      render(<TaskManager />);
      fireEvent.click(screen.getByText('All'));
      
      await waitFor(() => {
        expect(screen.getByText('Task title')).toBeInTheDocument();
      });
      
      // Mock clipboard
      const originalClipboard = navigator.clipboard;
      const writeTextMock = jest.fn();
      Object.assign(navigator, {
        clipboard: {
          writeText: writeTextMock
        }
      });
      
      // Open more menu and click JIRA option
      const moreButton = screen.getByRole('button', { name: '' });
      fireEvent.click(moreButton);
      fireEvent.click(screen.getByText('Copy JIRA payload'));
      
      // Verify payload includes description
      expect(writeTextMock).toHaveBeenCalled();
      const payload = writeTextMock.mock.calls[0][0];
      expect(payload).toContain('Detailed task description');
      expect(payload).toContain('GitHub PR: #333');
      
      // Restore clipboard
      Object.assign(navigator, { clipboard: originalClipboard });
    });
  });

  describe('AI Summary with Links', () => {
    test('includes JIRA tickets and GitHub PRs in AI summary', async () => {
      const completedTasks = [
        {
          id: 1,
          text: 'Fix bug',
          description: 'Fixed critical authentication bug',
          jiraTicket: 'BUG-100',
          githubPr: '#500',
          completedAt: new Date().toISOString(),
          completedDate: new Date().toLocaleDateString()
        },
        {
          id: 2,
          text: 'Add feature',
          description: 'Added new dashboard',
          jiraTicket: 'FEAT-200',
          githubPr: '#501',
          completedAt: new Date().toISOString(),
          completedDate: new Date().toLocaleDateString()
        }
      ];
      
      databaseService.getCompletedTasks.mockResolvedValue(completedTasks);
      aiService.generateEnhancedSummary.mockResolvedValue('AI generated summary with links');
      
      render(<TaskManager />);
      fireEvent.click(screen.getByText('Completed'));
      
      await waitFor(() => {
        expect(screen.getByText('Fix bug')).toBeInTheDocument();
      });
      
      // Generate daily summary
      fireEvent.click(screen.getByText("Today's summary"));
      
      // Verify AI service was called with complete task data
      await waitFor(() => {
        expect(aiService.generateEnhancedSummary).toHaveBeenCalled();
      });
      
      const aiCallArgs = aiService.generateEnhancedSummary.mock.calls[0];
      expect(aiCallArgs[0]).toEqual(completedTasks);
      expect(aiCallArgs[0][0].jiraTicket).toBe('BUG-100');
      expect(aiCallArgs[0][0].githubPr).toBe('#500');
      expect(aiCallArgs[0][0].description).toBe('Fixed critical authentication bug');
    });

    test('generates basic summary with links when AI is disabled', async () => {
      const completedTasks = [
        {
          id: 1,
          text: 'Task 1',
          description: 'Description 1',
          jiraTicket: 'TASK-1',
          githubPr: '#1',
          completedAt: new Date().toISOString(),
          completedDate: new Date().toLocaleDateString()
        }
      ];
      
      databaseService.getCompletedTasks.mockResolvedValue(completedTasks);
      aiService.generateEnhancedSummary.mockResolvedValue(null); // AI disabled
      
      render(<TaskManager />);
      fireEvent.click(screen.getByText('Completed'));
      
      await waitFor(() => {
        expect(screen.getByText('Task 1')).toBeInTheDocument();
      });
      
      // Generate summary
      fireEvent.click(screen.getByText("Today's summary"));
      
      // Check that summary modal contains links
      await waitFor(() => {
        const modal = screen.getByRole('dialog');
        expect(modal).toHaveTextContent('JIRA Tickets:');
        expect(modal).toHaveTextContent('TASK-1');
        expect(modal).toHaveTextContent('GitHub PRs:');
        expect(modal).toHaveTextContent('#1');
      });
    });
  });

  describe('Bulk Import Parsing', () => {
    test('parses complex bulk import with descriptions and links', async () => {
      render(<TaskManager />);
      fireEvent.click(screen.getByText('All'));
      fireEvent.click(screen.getByText('Bulk'));
      
      const textarea = screen.getByPlaceholderText('Paste tasks (use indentation for sub-tasks)');
      const bulkText = `Main task
> This is the main task description
> It has multiple lines
[JIRA: MAIN-1] [PR: #100]
    Subtask 1
    > Subtask description
    [JIRA: SUB-1]
    Subtask 2
    [PR: #101]
Another main task
> Simple description
[JIRA: MAIN-2]`;
      
      await userEvent.type(textarea, bulkText);
      fireEvent.click(screen.getByText('Import'));
      
      await waitFor(() => {
        expect(screen.getByText('Main task')).toBeInTheDocument();
        expect(screen.getByText('Subtask 1')).toBeInTheDocument();
        expect(screen.getByText('Subtask 2')).toBeInTheDocument();
        expect(screen.getByText('Another main task')).toBeInTheDocument();
      });
      
      // Verify the tasks were parsed correctly
      expect(databaseService.saveTasks).toHaveBeenCalled();
      const savedTasks = databaseService.saveTasks.mock.calls[0][0];
      
      expect(savedTasks[0]).toMatchObject({
        text: 'Main task',
        description: 'This is the main task description\nIt has multiple lines',
        jiraTicket: 'MAIN-1',
        githubPr: '#100',
        level: 0
      });
      
      expect(savedTasks[1]).toMatchObject({
        text: 'Subtask 1',
        description: 'Subtask description',
        jiraTicket: 'SUB-1',
        level: 1
      });
      
      expect(savedTasks[2]).toMatchObject({
        text: 'Subtask 2',
        githubPr: '#101',
        level: 1
      });
    });
  });
});