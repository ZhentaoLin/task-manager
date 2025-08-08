import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import TaskManager from './App';

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

describe('TaskManager App', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders TaskManager with all tabs', async () => {
    render(<TaskManager />);
    
    // Check that all tabs are present
    expect(screen.getByText('Today')).toBeInTheDocument();
    expect(screen.getByText('All')).toBeInTheDocument();
    expect(screen.getByText('Completed')).toBeInTheDocument();
    
    // Check that the title is present
    expect(screen.getByText('Tasks')).toBeInTheDocument();
  });

  test('can switch between tabs', async () => {
    render(<TaskManager />);
    
    // Initially on Today tab
    const todayTab = screen.getByText('Today');
    expect(todayTab.className).toContain('border-gray-900');
    
    // Switch to All tab
    const allTab = screen.getByText('All');
    fireEvent.click(allTab);
    expect(allTab.className).toContain('border-gray-900');
    expect(todayTab.className).not.toContain('border-gray-900');
    
    // Switch to Completed tab
    const completedTab = screen.getByText('Completed');
    fireEvent.click(completedTab);
    expect(completedTab.className).toContain('border-gray-900');
    expect(allTab.className).not.toContain('border-gray-900');
  });

  test('can add a new task', async () => {
    render(<TaskManager />);
    
    // Switch to All tab
    const allTab = screen.getByText('All');
    fireEvent.click(allTab);
    
    // Find the input and add button
    const input = screen.getByPlaceholderText('What needs to be done?');
    const addButton = screen.getByText('Add');
    
    // Type a task
    await userEvent.type(input, 'New test task');
    
    // Click add button
    fireEvent.click(addButton);
    
    // Check that the task appears
    await waitFor(() => {
      expect(screen.getByText('New test task')).toBeInTheDocument();
    });
    
    // Check that input is cleared
    expect(input.value).toBe('');
  });

  test('can add task with Enter key', async () => {
    render(<TaskManager />);
    
    // Switch to All tab
    const allTab = screen.getByText('All');
    fireEvent.click(allTab);
    
    const input = screen.getByPlaceholderText('What needs to be done?');
    
    // Type and press Enter
    await userEvent.type(input, 'Task with Enter');
    fireEvent.keyDown(input, { key: 'Enter' });
    
    // Check that the task appears
    await waitFor(() => {
      expect(screen.getByText('Task with Enter')).toBeInTheDocument();
    });
  });

  test('shows empty state messages', () => {
    render(<TaskManager />);
    
    // Check Today tab empty state
    expect(screen.getByText('No tasks for today')).toBeInTheDocument();
    
    // Switch to All tab
    const allTab = screen.getByText('All');
    fireEvent.click(allTab);
    expect(screen.getByText('No tasks yet')).toBeInTheDocument();
    
    // Switch to Completed tab
    const completedTab = screen.getByText('Completed');
    fireEvent.click(completedTab);
    expect(screen.getByText('No completed tasks found')).toBeInTheDocument();
  });

  test('can toggle bulk import mode', () => {
    render(<TaskManager />);
    
    // Switch to All tab
    const allTab = screen.getByText('All');
    fireEvent.click(allTab);
    
    // Initially shows single task input
    expect(screen.getByPlaceholderText('What needs to be done?')).toBeInTheDocument();
    
    // Click Bulk button
    const bulkButton = screen.getByText('Bulk');
    fireEvent.click(bulkButton);
    
    // Should show bulk import textarea
    expect(screen.getByPlaceholderText('Paste tasks (use indentation for sub-tasks)')).toBeInTheDocument();
    
    // Click Single button to go back
    const singleButton = screen.getByText('Single');
    fireEvent.click(singleButton);
    
    // Should show single input again
    expect(screen.getByPlaceholderText('What needs to be done?')).toBeInTheDocument();
  });

  test('keyboard shortcuts for tab navigation', () => {
    render(<TaskManager />);
    
    // Start on Today tab
    let todayTab = screen.getByText('Today');
    expect(todayTab.className).toContain('border-gray-900');
    
    // Press '2' to go to All tab
    fireEvent.keyDown(document, { key: '2' });
    const allTab = screen.getByText('All');
    expect(allTab.className).toContain('border-gray-900');
    
    // Press '3' to go to Completed tab
    fireEvent.keyDown(document, { key: '3' });
    const completedTab = screen.getByText('Completed');
    expect(completedTab.className).toContain('border-gray-900');
    
    // Press '1' to go back to Today tab
    fireEvent.keyDown(document, { key: '1' });
    todayTab = screen.getByText('Today');
    expect(todayTab.className).toContain('border-gray-900');
  });
});
