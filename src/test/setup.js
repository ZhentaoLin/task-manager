// Test setup and mocks
import '@testing-library/jest-dom';
import { TextEncoder, TextDecoder } from 'util';

// Polyfill for TextEncoder/TextDecoder
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

// Mock environment variables
process.env.REACT_APP_USE_DATABASE = 'true';
process.env.REACT_APP_SUPABASE_URL = 'https://test.supabase.co';
process.env.REACT_APP_SUPABASE_ANON_KEY = 'test-key';
process.env.REACT_APP_AI_ENABLED = 'true';
process.env.REACT_APP_BACKEND_URL = 'http://localhost:3001';

// Mock Supabase client
export const mockSupabaseClient = {
  from: jest.fn(),
  auth: {
    getSession: jest.fn(),
    onAuthStateChange: jest.fn()
  }
};

// Mock fetch for API calls
global.fetch = jest.fn();

// Reset mocks between tests
beforeEach(() => {
  jest.clearAllMocks();
  global.fetch.mockClear();
});

// Helper to create mock Supabase responses
export const createMockSupabaseResponse = (data = [], error = null) => ({
  data,
  error,
  select: jest.fn().mockReturnThis(),
  order: jest.fn().mockReturnThis(),
  insert: jest.fn().mockResolvedValue({ data, error }),
  upsert: jest.fn().mockResolvedValue({ data, error }),
  delete: jest.fn().mockReturnThis(),
  gt: jest.fn().mockReturnThis(),
  in: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis()
});

// Helper to create mock tasks
export const createMockTask = (overrides = {}) => ({
  id: Date.now(),
  text: 'Test task',
  parentId: null,
  parentText: null,
  level: 0,
  createdAt: new Date().toISOString(),
  ...overrides
});

// Helper to create mock completed tasks
export const createMockCompletedTask = (overrides = {}) => ({
  ...createMockTask(overrides),
  completedAt: new Date().toISOString(),
  completedDate: new Date().toLocaleDateString()
});