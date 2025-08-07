import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY;
const useDatabase = process.env.REACT_APP_USE_DATABASE === 'true';

class DatabaseService {
  constructor() {
    this.useDatabase = useDatabase && supabaseUrl && supabaseKey && 
                     supabaseUrl !== 'your_supabase_url_here';
    
    if (this.useDatabase) {
      this.supabase = createClient(supabaseUrl, supabaseKey);
    }
    
    console.log('Database service initialized:', this.useDatabase ? 'Supabase' : 'localStorage');
  }

  // Tasks operations
  async getTasks() {
    if (!this.useDatabase) {
      return [];
    }

    try {
      const { data, error } = await this.supabase
        .from('tasks')
        .select('*')
        .order('created_at', { ascending: true });
      
      if (error) throw error;
      
      // Map database field names to app field names
      return (data || []).map(task => ({
        id: task.id,
        text: task.text,
        parentId: task.parent_id,
        parentText: task.parent_text,
        level: task.level,
        createdAt: task.created_at
      }));
    } catch (error) {
      console.error('Error fetching tasks:', error);
      return [];
    }
  }

  async saveTasks(tasks) {
    if (!this.useDatabase) {
      return;
    }

    try {
      // First, get all existing task IDs from the database
      const { data: existingTasks, error: fetchError } = await this.supabase
        .from('tasks')
        .select('id');
      
      if (fetchError) throw fetchError;
      
      // Find tasks that exist in the database but not in the current state
      const currentTaskIds = tasks.map(t => t.id);
      const existingTaskIds = (existingTasks || []).map(t => t.id);
      const tasksToDelete = existingTaskIds.filter(id => !currentTaskIds.includes(id));
      
      // Delete tasks that are no longer in the current state
      if (tasksToDelete.length > 0) {
        const { error: deleteError } = await this.supabase
          .from('tasks')
          .delete()
          .in('id', tasksToDelete);
        
        if (deleteError) throw deleteError;
        console.log(`Deleted ${tasksToDelete.length} tasks from database`);
      }
      
      // Now upsert the current tasks
      if (tasks.length > 0) {
        const { error } = await this.supabase
          .from('tasks')
          .upsert(tasks.map(task => ({
            id: task.id,
            text: task.text,
            parent_id: task.parentId,
            parent_text: task.parentText,
            level: task.level || 0,
            created_at: task.createdAt || new Date().toISOString()
          })), { 
            onConflict: 'id' 
          });
        
        if (error) throw error;
      }
    } catch (error) {
      console.error('Error saving tasks:', error);
    }
  }

  // Completed tasks operations
  async getCompletedTasks() {
    if (!this.useDatabase) {
      return [];
    }

    try {
      const { data, error } = await this.supabase
        .from('completed_tasks')
        .select('*')
        .order('completed_at', { ascending: false });
      
      if (error) throw error;
      
      // Map database field names to app field names
      return (data || []).map(task => ({
        id: task.id,
        text: task.text,
        parentId: task.parent_id,
        parentText: task.parent_text,
        level: task.level,
        completedAt: task.completed_at,
        completedDate: task.completed_date,
        createdAt: task.created_at
      }));
    } catch (error) {
      console.error('Error fetching completed tasks:', error);
      return [];
    }
  }

  async saveCompletedTasks(completedTasks) {
    if (!this.useDatabase) {
      return;
    }

    try {
      // First, get all existing completed task IDs from the database
      const { data: existingCompletedTasks, error: fetchError } = await this.supabase
        .from('completed_tasks')
        .select('id');
      
      if (fetchError) throw fetchError;
      
      // Find completed tasks that exist in the database but not in the current state
      const currentCompletedIds = completedTasks.map(t => t.id);
      const existingCompletedIds = (existingCompletedTasks || []).map(t => t.id);
      const completedToDelete = existingCompletedIds.filter(id => !currentCompletedIds.includes(id));
      
      // Delete completed tasks that are no longer in the current state
      if (completedToDelete.length > 0) {
        const { error: deleteError } = await this.supabase
          .from('completed_tasks')
          .delete()
          .in('id', completedToDelete);
        
        if (deleteError) throw deleteError;
        console.log(`Deleted ${completedToDelete.length} completed tasks from database`);
      }
      
      // Now upsert the current completed tasks
      if (completedTasks.length > 0) {
        const { error } = await this.supabase
          .from('completed_tasks')
          .upsert(completedTasks.map(task => ({
            id: task.id,
            text: task.text,
            parent_id: task.parentId,
            parent_text: task.parentText,
            level: task.level || 0,
            completed_at: task.completedAt || new Date().toISOString(),
            completed_date: task.completedDate || new Date().toLocaleDateString(),
            created_at: task.createdAt || new Date().toISOString()
          })), { 
            onConflict: 'id' 
          });
        
        if (error) throw error;
      }
    } catch (error) {
      console.error('Error saving completed tasks:', error);
    }
  }

  // Selected for today operations
  async getSelectedForToday() {
    if (!this.useDatabase) {
      return [];
    }

    try {
      const { data, error } = await this.supabase
        .from('selected_for_today')
        .select('task_id');
      
      if (error) throw error;
      return data ? data.map(item => item.task_id) : [];
    } catch (error) {
      console.error('Error fetching selected for today:', error);
      return [];
    }
  }

  async saveSelectedForToday(selectedIds) {
    if (!this.useDatabase) {
      return;
    }

    try {
      await this.supabase.from('selected_for_today').delete().gt('id', 0);
      
      if (selectedIds.length > 0) {
        const { error } = await this.supabase
          .from('selected_for_today')
          .insert(selectedIds.map(taskId => ({ task_id: taskId })));
        
        if (error) throw error;
      }
    } catch (error) {
      console.error('Error saving selected for today:', error);
    }
  }

  // Migration helper
  async migrateFromLocalStorage() {
    if (!this.useDatabase) return;

    console.log('Migrating data from localStorage to Supabase...');
    
    try {
      const tasks = localStorage.getItem('tasks');
      const completedTasks = localStorage.getItem('completedTasks');
      const selectedForToday = localStorage.getItem('selectedForToday');

      // Fix missing timestamps in localStorage data
      if (tasks) {
        const parsedTasks = JSON.parse(tasks).map(task => ({
          ...task,
          createdAt: task.createdAt || new Date().toISOString()
        }));
        await this.saveTasks(parsedTasks);
      }
      
      if (completedTasks) {
        const parsedCompleted = JSON.parse(completedTasks).map(task => ({
          ...task,
          completedAt: task.completedAt || new Date().toISOString(),
          completedDate: task.completedDate || new Date().toLocaleDateString(),
          createdAt: task.createdAt || new Date().toISOString()
        }));
        await this.saveCompletedTasks(parsedCompleted);
      }
      
      if (selectedForToday) {
        await this.saveSelectedForToday(JSON.parse(selectedForToday));
      }

      console.log('Migration completed successfully!');
    } catch (error) {
      console.error('Migration failed:', error);
      console.log('Continuing with localStorage fallback...');
    }
  }
}

export const databaseService = new DatabaseService();