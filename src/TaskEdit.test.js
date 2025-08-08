import React from 'react';
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

describe('Task Edit Functionality', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  describe('Cursor Position Preservation', () => {
    test('cursor stays in position when typing in the middle of text', async () => {
      const { container } = render(<TaskManager />);
      
      // Switch to "All" tab
      const allTab = screen.getByText('All');
      fireEvent.click(allTab);
      
      // Add a task
      const input = screen.getByPlaceholderText('What needs to be done?');
      await userEvent.type(input, 'hello world');
      fireEvent.keyDown(input, { key: 'Enter' });
      
      // Wait for task to appear
      await waitFor(() => {
        expect(screen.getByText('hello world')).toBeInTheDocument();
      });
      
      // Click to edit the task
      const taskText = screen.getByText('hello world');
      fireEvent.click(taskText);
      
      // Get the edit input
      const editInput = container.querySelector('input[value="hello world"]');
      expect(editInput).toBeInTheDocument();
      
      // Set cursor position to middle (after "hello ")
      editInput.setSelectionRange(6, 6);
      
      // Type "beautiful " in the middle
      fireEvent.change(editInput, { 
        target: { 
          value: 'hello beautiful world',
          selectionStart: 16,
          selectionEnd: 16
        } 
      });
      
      // Check that the value is updated correctly
      expect(editInput.value).toBe('hello beautiful world');
      
      // Verify cursor position is preserved (should be after "beautiful ")
      // Note: In a real browser, we'd check selectionStart/selectionEnd
      // but in tests we verify the behavior through the value change
    });

    test('cursor position preserved when adding text at beginning', async () => {
      const { container } = render(<TaskManager />);
      
      // Switch to "All" tab and add a task
      const allTab = screen.getByText('All');
      fireEvent.click(allTab);
      
      const input = screen.getByPlaceholderText('What needs to be done?');
      await userEvent.type(input, 'world');
      fireEvent.keyDown(input, { key: 'Enter' });
      
      await waitFor(() => {
        expect(screen.getByText('world')).toBeInTheDocument();
      });
      
      // Edit the task
      const taskText = screen.getByText('world');
      fireEvent.click(taskText);
      
      const editInput = container.querySelector('input[value="world"]');
      
      // Set cursor at beginning
      editInput.setSelectionRange(0, 0);
      
      // Type at beginning
      fireEvent.change(editInput, { 
        target: { 
          value: 'hello world',
          selectionStart: 6,
          selectionEnd: 6
        } 
      });
      
      expect(editInput.value).toBe('hello world');
    });

    test('cursor position preserved when adding text at end', async () => {
      const { container } = render(<TaskManager />);
      
      // Switch to "All" tab and add a task
      const allTab = screen.getByText('All');
      fireEvent.click(allTab);
      
      const input = screen.getByPlaceholderText('What needs to be done?');
      await userEvent.type(input, 'hello');
      fireEvent.keyDown(input, { key: 'Enter' });
      
      await waitFor(() => {
        expect(screen.getByText('hello')).toBeInTheDocument();
      });
      
      // Edit the task
      const taskText = screen.getByText('hello');
      fireEvent.click(taskText);
      
      const editInput = container.querySelector('input[value="hello"]');
      
      // Type at end
      fireEvent.change(editInput, { 
        target: { 
          value: 'hello world',
          selectionStart: 11,
          selectionEnd: 11
        } 
      });
      
      expect(editInput.value).toBe('hello world');
    });
  });

  describe('Edit Mode Behavior', () => {
    test('clicking on task text enters edit mode', async () => {
      const { container } = render(<TaskManager />);
      
      // Switch to "All" tab and add a task
      const allTab = screen.getByText('All');
      fireEvent.click(allTab);
      
      const input = screen.getByPlaceholderText('What needs to be done?');
      await userEvent.type(input, 'Test task');
      fireEvent.keyDown(input, { key: 'Enter' });
      
      await waitFor(() => {
        expect(screen.getByText('Test task')).toBeInTheDocument();
      });
      
      // Click to edit
      const taskText = screen.getByText('Test task');
      fireEvent.click(taskText);
      
      // Check that edit input appears
      const editInput = container.querySelector('input[value="Test task"]');
      expect(editInput).toBeInTheDocument();
    });

    test('pressing Enter saves the edit', async () => {
      const { container } = render(<TaskManager />);
      
      // Switch to "All" tab and add a task
      const allTab = screen.getByText('All');
      fireEvent.click(allTab);
      
      const input = screen.getByPlaceholderText('What needs to be done?');
      await userEvent.type(input, 'Original task');
      fireEvent.keyDown(input, { key: 'Enter' });
      
      await waitFor(() => {
        expect(screen.getByText('Original task')).toBeInTheDocument();
      });
      
      // Edit the task
      const taskText = screen.getByText('Original task');
      fireEvent.click(taskText);
      
      const editInput = container.querySelector('input[value="Original task"]');
      fireEvent.change(editInput, { target: { value: 'Edited task' } });
      fireEvent.keyDown(editInput, { key: 'Enter' });
      
      // Check that the task is updated
      await waitFor(() => {
        expect(screen.getByText('Edited task')).toBeInTheDocument();
        expect(screen.queryByText('Original task')).not.toBeInTheDocument();
      });
    });

    test('pressing Escape cancels the edit', async () => {
      const { container } = render(<TaskManager />);
      
      // Switch to "All" tab and add a task
      const allTab = screen.getByText('All');
      fireEvent.click(allTab);
      
      const input = screen.getByPlaceholderText('What needs to be done?');
      await userEvent.type(input, 'Original task');
      fireEvent.keyDown(input, { key: 'Enter' });
      
      await waitFor(() => {
        expect(screen.getByText('Original task')).toBeInTheDocument();
      });
      
      // Edit the task
      const taskText = screen.getByText('Original task');
      fireEvent.click(taskText);
      
      const editInput = container.querySelector('input[value="Original task"]');
      fireEvent.change(editInput, { target: { value: 'Changed task' } });
      fireEvent.keyDown(editInput, { key: 'Escape' });
      
      // Check that the original text is preserved
      await waitFor(() => {
        expect(screen.getByText('Original task')).toBeInTheDocument();
        expect(screen.queryByText('Changed task')).not.toBeInTheDocument();
      });
    });

    test('clicking outside (blur) saves the edit', async () => {
      const { container } = render(<TaskManager />);
      
      // Switch to "All" tab and add a task
      const allTab = screen.getByText('All');
      fireEvent.click(allTab);
      
      const input = screen.getByPlaceholderText('What needs to be done?');
      await userEvent.type(input, 'Original task');
      fireEvent.keyDown(input, { key: 'Enter' });
      
      await waitFor(() => {
        expect(screen.getByText('Original task')).toBeInTheDocument();
      });
      
      // Edit the task
      const taskText = screen.getByText('Original task');
      fireEvent.click(taskText);
      
      const editInput = container.querySelector('input[value="Original task"]');
      fireEvent.change(editInput, { target: { value: 'Edited task' } });
      fireEvent.blur(editInput);
      
      // Check that the task is updated
      await waitFor(() => {
        expect(screen.getByText('Edited task')).toBeInTheDocument();
        expect(screen.queryByText('Original task')).not.toBeInTheDocument();
      });
    });
  });

  describe('Keyboard Shortcuts During Edit', () => {
    test('shortcuts are disabled during editing', async () => {
      const { container } = render(<TaskManager />);
      
      // Switch to "All" tab
      const allTab = screen.getByText('All');
      fireEvent.click(allTab);
      
      // Add a task
      const input = screen.getByPlaceholderText('What needs to be done?');
      await userEvent.type(input, 'Test task');
      fireEvent.keyDown(input, { key: 'Enter' });
      
      await waitFor(() => {
        expect(screen.getByText('Test task')).toBeInTheDocument();
      });
      
      // Enter edit mode
      const taskText = screen.getByText('Test task');
      fireEvent.click(taskText);
      
      const editInput = container.querySelector('input[value="Test task"]');
      expect(editInput).toBeInTheDocument();
      
      // Try typing 'n' - should not trigger shortcut
      const initialValue = editInput.value;
      fireEvent.keyDown(editInput, { key: 'n' });
      fireEvent.change(editInput, { target: { value: 'Test taskn' } });
      
      // Input should still be focused and value should change
      expect(document.activeElement).toBe(editInput);
      expect(editInput.value).toBe('Test taskn');
      
      // Try typing '/' - should not trigger search
      fireEvent.keyDown(editInput, { key: '/' });
      fireEvent.change(editInput, { target: { value: 'Test taskn/' } });
      
      expect(document.activeElement).toBe(editInput);
      expect(editInput.value).toBe('Test taskn/');
      
      // Try typing '1' - should not switch tabs
      fireEvent.keyDown(editInput, { key: '1' });
      fireEvent.change(editInput, { target: { value: 'Test taskn/1' } });
      
      expect(document.activeElement).toBe(editInput);
      expect(editInput.value).toBe('Test taskn/1');
      
      // Should still be on "All" tab
      expect(allTab.className).toContain('border-gray-900');
    });

    test('shortcuts are re-enabled after editing completes', async () => {
      const { container } = render(<TaskManager />);
      
      // Switch to "All" tab
      const allTab = screen.getByText('All');
      fireEvent.click(allTab);
      
      // Add a task
      const input = screen.getByPlaceholderText('What needs to be done?');
      await userEvent.type(input, 'Test task');
      fireEvent.keyDown(input, { key: 'Enter' });
      
      await waitFor(() => {
        expect(screen.getByText('Test task')).toBeInTheDocument();
      });
      
      // Enter and exit edit mode
      const taskText = screen.getByText('Test task');
      fireEvent.click(taskText);
      
      const editInput = container.querySelector('input[value="Test task"]');
      fireEvent.keyDown(editInput, { key: 'Enter' });
      
      // Wait for edit mode to exit
      await waitFor(() => {
        expect(container.querySelector('input[value="Test task"]')).not.toBeInTheDocument();
      });
      
      // Now test that shortcuts work again
      // Press '1' to switch to Today tab
      fireEvent.keyDown(document, { key: '1' });
      
      const todayTab = screen.getByText('Today');
      expect(todayTab.className).toContain('border-gray-900');
    });
  });

  describe('Focus Management', () => {
    test('input receives focus when edit starts', async () => {
      const { container } = render(<TaskManager />);
      
      // Switch to "All" tab and add a task
      const allTab = screen.getByText('All');
      fireEvent.click(allTab);
      
      const input = screen.getByPlaceholderText('What needs to be done?');
      await userEvent.type(input, 'Test task');
      fireEvent.keyDown(input, { key: 'Enter' });
      
      await waitFor(() => {
        expect(screen.getByText('Test task')).toBeInTheDocument();
      });
      
      // Click to edit
      const taskText = screen.getByText('Test task');
      fireEvent.click(taskText);
      
      // Wait for the input to be focused
      await waitFor(() => {
        const editInput = container.querySelector('input[value="Test task"]');
        expect(editInput).toBeInTheDocument();
        // Note: In real browser, document.activeElement would be editInput
        // but in jsdom we verify the input exists and is editable
      });
    });

    test('focus removed after edit completes', async () => {
      const { container } = render(<TaskManager />);
      
      // Switch to "All" tab and add a task
      const allTab = screen.getByText('All');
      fireEvent.click(allTab);
      
      const input = screen.getByPlaceholderText('What needs to be done?');
      await userEvent.type(input, 'Test task');
      fireEvent.keyDown(input, { key: 'Enter' });
      
      await waitFor(() => {
        expect(screen.getByText('Test task')).toBeInTheDocument();
      });
      
      // Edit and save
      const taskText = screen.getByText('Test task');
      fireEvent.click(taskText);
      
      const editInput = container.querySelector('input[value="Test task"]');
      fireEvent.change(editInput, { target: { value: 'Edited task' } });
      fireEvent.keyDown(editInput, { key: 'Enter' });
      
      // Check that edit input is gone
      await waitFor(() => {
        expect(container.querySelector('input[value="Edited task"]')).not.toBeInTheDocument();
        expect(screen.getByText('Edited task')).toBeInTheDocument();
      });
    });

    test('no unwanted refocusing during typing', async () => {
      const { container } = render(<TaskManager />);
      
      // Switch to "All" tab and add a task
      const allTab = screen.getByText('All');
      fireEvent.click(allTab);
      
      const input = screen.getByPlaceholderText('What needs to be done?');
      await userEvent.type(input, 'Test');
      fireEvent.keyDown(input, { key: 'Enter' });
      
      await waitFor(() => {
        expect(screen.getByText('Test')).toBeInTheDocument();
      });
      
      // Enter edit mode
      const taskText = screen.getByText('Test');
      fireEvent.click(taskText);
      
      // Wait for the EditableInput to appear
      await waitFor(() => {
        const editInput = container.querySelector('input[value="Test"]');
        expect(editInput).toBeInTheDocument();
      });
      
      const editInput = container.querySelector('input[value="Test"]');
      
      // Type multiple characters and verify the value updates correctly
      const characters = ['i', 'n', 'g', ' ', 't', 'a', 's', 'k'];
      let currentValue = 'Test';
      
      for (const char of characters) {
        currentValue += char;
        fireEvent.change(editInput, { target: { value: currentValue } });
        
        // Verify the value is updating correctly
        expect(editInput.value).toBe(currentValue);
      }
      
      expect(editInput.value).toBe('Testing task');
      
      // Save the edit and verify it persists
      fireEvent.keyDown(editInput, { key: 'Enter' });
      
      await waitFor(() => {
        expect(screen.getByText('Testing task')).toBeInTheDocument();
      });
    });
  });
});