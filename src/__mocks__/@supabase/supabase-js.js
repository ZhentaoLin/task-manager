// Mock for @supabase/supabase-js
export const createClient = jest.fn(() => {
  const mockSupabase = {
    from: jest.fn((tableName) => {
      const mockChain = {
        select: jest.fn().mockReturnThis(),
        insert: jest.fn().mockReturnThis(),
        upsert: jest.fn().mockReturnThis(),
        update: jest.fn().mockReturnThis(),
        delete: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        in: jest.fn().mockReturnThis(),
        gt: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        data: null,
        error: null
      };
      
      // Make methods return promises when needed
      mockChain.select = jest.fn(() => {
        mockChain.data = [];
        mockChain.error = null;
        return Promise.resolve(mockChain);
      });
      
      mockChain.insert = jest.fn(() => {
        return Promise.resolve({ data: null, error: null });
      });
      
      mockChain.upsert = jest.fn(() => {
        return Promise.resolve({ data: null, error: null });
      });
      
      mockChain.delete = jest.fn().mockReturnThis();
      mockChain.in = jest.fn(() => {
        return Promise.resolve({ data: null, error: null });
      });
      mockChain.gt = jest.fn(() => {
        return Promise.resolve({ data: null, error: null });
      });
      
      return mockChain;
    }),
    auth: {
      getSession: jest.fn(),
      onAuthStateChange: jest.fn()
    }
  };
  
  return mockSupabase;
});