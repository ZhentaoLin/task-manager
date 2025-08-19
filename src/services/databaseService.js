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
        description: task.description,
        jiraTicket: task.jira_ticket,
        githubPr: task.github_pr,
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
            description: task.description || null,
            jira_ticket: task.jiraTicket || null,
            github_pr: task.githubPr || null,
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
        description: task.description,
        jiraTicket: task.jira_ticket,
        githubPr: task.github_pr,
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
            description: task.description || null,
            jira_ticket: task.jiraTicket || null,
            github_pr: task.githubPr || null,
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

  // Selected for today operations (with rollover support)
  async getSelectedForToday() {
    if (!this.useDatabase) {
      return [];
    }

    try {
      const today = new Date().toISOString().split('T')[0];
      
      // First, check and update rollovers
      await this.checkAndUpdateRollovers();
      
      // Get today's explicitly selected tasks
      const { data: todayTasks, error: todayError } = await this.supabase
        .from('selected_for_today')
        .select('task_id')
        .eq('selected_date', today);
      
      if (todayError) throw todayError;
      
      // Get active rollover tasks
      const { data: rolloverTasks, error: rolloverError } = await this.supabase
        .from('task_rollover_status')
        .select('task_id')
        .eq('is_active', true);
      
      if (rolloverError) throw rolloverError;
      
      // Combine and deduplicate task IDs
      const todayIds = todayTasks ? todayTasks.map(item => item.task_id) : [];
      const rolloverIds = rolloverTasks ? rolloverTasks.map(item => item.task_id) : [];
      const allIds = [...new Set([...todayIds, ...rolloverIds])];
      
      // Filter out completed tasks
      const { data: completedTasks, error: completedError } = await this.supabase
        .from('completed_tasks')
        .select('id')
        .in('id', allIds);
      
      if (completedError) throw completedError;
      
      const completedIds = completedTasks ? completedTasks.map(t => t.id) : [];
      const finalIds = allIds.filter(id => !completedIds.includes(id));
      
      return finalIds;
    } catch (error) {
      console.error('Error fetching selected for today with rollovers:', error);
      return [];
    }
  }

  async saveSelectedForToday(selectedIds) {
    if (!this.useDatabase) {
      return;
    }

    try {
      const today = new Date().toISOString().split('T')[0];
      
      // First, delete only today's selections (preserve historical data)
      const { error: deleteError } = await this.supabase
        .from('selected_for_today')
        .delete()
        .eq('selected_date', today);
      
      if (deleteError) {
        console.error('Error deleting old selections:', deleteError);
      }
      
      if (selectedIds.length > 0) {
        const { error } = await this.supabase
          .from('selected_for_today')
          .upsert(selectedIds.map(taskId => ({ 
            task_id: taskId,
            selected_date: today
          })), {
            onConflict: 'task_id,selected_date'
          });
        
        if (error) throw error;
      }
    } catch (error) {
      console.error('Error saving selected for today:', error);
    }
  }

  // Get tasks selected for a specific date (for historical data)
  async getSelectedForDate(date) {
    if (!this.useDatabase) {
      return [];
    }

    try {
      const { data, error } = await this.supabase
        .from('selected_for_today')
        .select('task_id')
        .eq('selected_date', date);
      
      if (error) throw error;
      return data ? data.map(item => item.task_id) : [];
    } catch (error) {
      console.error('Error fetching selected for date:', error);
      return [];
    }
  }

  // Daily highlight operations
  async getTodayHighlight() {
    if (!this.useDatabase) {
      const localHighlight = localStorage.getItem('todayHighlight');
      if (localHighlight) {
        const parsed = JSON.parse(localHighlight);
        const today = new Date().toDateString();
        if (parsed.date === today) {
          return parsed.taskId;
        }
      }
      return null;
    }

    try {
      const today = new Date().toISOString().split('T')[0];
      const { data, error } = await this.supabase
        .from('daily_highlights')
        .select('task_id')
        .eq('date', today)
        .single();
      
      if (error && error.code !== 'PGRST116') throw error; // PGRST116 is "no rows returned"
      return data ? data.task_id : null;
    } catch (error) {
      console.error('Error fetching today highlight:', error);
      return null;
    }
  }

  async saveTodayHighlight(taskId) {
    const today = new Date().toDateString();
    const todayISO = new Date().toISOString().split('T')[0];
    
    if (!this.useDatabase) {
      if (taskId === null) {
        localStorage.removeItem('todayHighlight');
      } else {
        localStorage.setItem('todayHighlight', JSON.stringify({
          taskId,
          date: today
        }));
      }
      return;
    }

    try {
      if (taskId === null) {
        await this.supabase
          .from('daily_highlights')
          .delete()
          .eq('date', todayISO);
      } else {
        const { error } = await this.supabase
          .from('daily_highlights')
          .upsert({
            date: todayISO,
            task_id: taskId,
            created_at: new Date().toISOString()
          }, {
            onConflict: 'date'
          });
        
        if (error) throw error;
      }
    } catch (error) {
      console.error('Error saving today highlight:', error);
    }
  }

  // Rollover/Spillover operations
  async checkAndUpdateRollovers() {
    if (!this.useDatabase) return;
    
    try {
      const today = new Date().toISOString().split('T')[0];
      
      // Get all historical selected_for_today entries before today
      const { data: historicalSelections, error: histError } = await this.supabase
        .from('selected_for_today')
        .select('task_id, selected_date')
        .lt('selected_date', today);
      
      if (histError) throw histError;
      if (!historicalSelections || historicalSelections.length === 0) return;
      
      // Get all task IDs from historical selections
      const taskIds = historicalSelections.map(s => s.task_id);
      
      // Check which tasks are completed
      const { data: completedTasks, error: compError } = await this.supabase
        .from('completed_tasks')
        .select('id')
        .in('id', taskIds);
      
      if (compError) throw compError;
      
      const completedIds = completedTasks ? completedTasks.map(t => t.id) : [];
      
      // Get existing rollover records
      const { data: existingRollovers, error: rollError } = await this.supabase
        .from('task_rollover_status')
        .select('task_id, is_active');
      
      if (rollError) throw rollError;
      
      const existingRolloverMap = new Map();
      if (existingRollovers) {
        existingRollovers.forEach(r => existingRolloverMap.set(r.task_id, r.is_active));
      }
      
      // Process each historical selection
      for (const selection of historicalSelections) {
        const isCompleted = completedIds.includes(selection.task_id);
        const existsInRollover = existingRolloverMap.has(selection.task_id);
        
        if (isCompleted) {
          // If task is completed, deactivate any rollover record
          if (existsInRollover && existingRolloverMap.get(selection.task_id)) {
            await this.supabase
              .from('task_rollover_status')
              .update({ is_active: false, updated_at: new Date().toISOString() })
              .eq('task_id', selection.task_id);
          }
        } else {
          // If task is incomplete, ensure it's in rollover table and active
          if (!existsInRollover) {
            // Insert new rollover record
            await this.supabase
              .from('task_rollover_status')
              .upsert({
                task_id: selection.task_id,
                original_selected_date: selection.selected_date,
                rollover_reason: 'incomplete',
                is_active: true
              }, { onConflict: 'task_id' });
          } else if (!existingRolloverMap.get(selection.task_id)) {
            // Reactivate if it was previously dismissed
            await this.supabase
              .from('task_rollover_status')
              .update({ 
                is_active: true, 
                dismissed_at: null,
                updated_at: new Date().toISOString() 
              })
              .eq('task_id', selection.task_id);
          }
        }
      }
      
      console.log('Rollover status updated');
    } catch (error) {
      console.error('Error checking and updating rollovers:', error);
    }
  }
  
  async dismissRolloverTask(taskId) {
    if (!this.useDatabase) return;
    
    try {
      const { error } = await this.supabase
        .from('task_rollover_status')
        .update({ 
          is_active: false, 
          dismissed_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('task_id', taskId);
      
      if (error) throw error;
      console.log('Rollover task dismissed:', taskId);
    } catch (error) {
      console.error('Error dismissing rollover task:', error);
    }
  }
  
  async clearAllRollovers() {
    if (!this.useDatabase) return;
    
    try {
      const { error } = await this.supabase
        .from('task_rollover_status')
        .update({ 
          is_active: false, 
          dismissed_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('is_active', true);
      
      if (error) throw error;
      console.log('All rollover tasks cleared');
    } catch (error) {
      console.error('Error clearing all rollovers:', error);
    }
  }
  
  async getRolloverInfo() {
    if (!this.useDatabase) return [];
    
    try {
      const { data, error } = await this.supabase
        .from('task_rollover_status')
        .select('task_id, original_selected_date')
        .eq('is_active', true);
      
      if (error) throw error;
      
      // Convert to a map for easy lookup
      const rolloverMap = new Map();
      if (data) {
        data.forEach(item => {
          rolloverMap.set(item.task_id, item.original_selected_date);
        });
      }
      
      return rolloverMap;
    } catch (error) {
      console.error('Error fetching rollover info:', error);
      return new Map();
    }
  }

  // Clean up old "today" selections from previous days
  async cleanupOldTodaySelections() {
    if (!this.useDatabase) return;
    
    try {
      const today = new Date().toISOString().split('T')[0];
      const { error } = await this.supabase
        .from('selected_for_today')
        .delete()
        .lt('selected_date', today);
      
      if (error) throw error;
      console.log('Cleaned up old today selections');
    } catch (error) {
      console.error('Error cleaning up old today selections:', error);
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