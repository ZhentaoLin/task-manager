import React, { useState, useEffect, useRef } from 'react';
import { Plus, Calendar, Search, Trash2, Edit3, X, FileText, ExternalLink, MoreVertical, Check } from 'lucide-react';
import { aiService } from './services/aiService';
import { databaseService } from './services/databaseService';

const TaskManager = () => {
  const [tasks, setTasks] = useState([]);
  const [completedTasks, setCompletedTasks] = useState([]);
  const [selectedForToday, setSelectedForToday] = useState([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [newTask, setNewTask] = useState('');
  const [bulkTasks, setBulkTasks] = useState('');
  const [showBulkImport, setShowBulkImport] = useState(false);
  const [selectedTasks, setSelectedTasks] = useState([]);
  const [editingTask, setEditingTask] = useState(null);
  const [editText, setEditText] = useState('');
  const [addingSubTaskTo, setAddingSubTaskTo] = useState(null);
  const [subTaskTexts, setSubTaskTexts] = useState({});
  const [searchTerm, setSearchTerm] = useState('');
  const [allTasksSearchTerm, setAllTasksSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [activeTab, setActiveTab] = useState('today');
  const [summaryModal, setSummaryModal] = useState({ isOpen: false, content: '', title: '' });

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Skip if user is typing in an input/textarea
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      
      // Tab navigation shortcuts
      if (e.key === '1' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        setActiveTab('today');
      } else if (e.key === '2' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        setActiveTab('all');
      } else if (e.key === '3' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        setActiveTab('completed');
      }
      
      // New task shortcut
      if (e.key === 'n' && activeTab === 'all') {
        e.preventDefault();
        const input = document.querySelector('input[placeholder="What needs to be done?"]');
        if (input) input.focus();
      }
      
      // Search shortcut
      if (e.key === '/') {
        e.preventDefault();
        if (activeTab === 'all') {
          const searchInput = document.querySelector('input[placeholder="Search tasks..."]');
          if (searchInput) searchInput.focus();
        } else if (activeTab === 'completed') {
          const searchInput = document.querySelector('input[placeholder="Search..."]');
          if (searchInput) searchInput.focus();
        }
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [activeTab]);

  // Load data on component mount
  useEffect(() => {
    const loadData = async () => {
      console.log('Loading data from database...');
      
      try {
        const [loadedTasks, loadedCompleted, loadedToday] = await Promise.all([
          databaseService.getTasks(),
          databaseService.getCompletedTasks(),
          databaseService.getSelectedForToday()
        ]);
        
        console.log('Loaded data:', { 
          tasks: loadedTasks.length, 
          completed: loadedCompleted.length, 
          today: loadedToday.length 
        });
        
        setTasks(loadedTasks);
        setCompletedTasks(loadedCompleted);
        setSelectedForToday(loadedToday);
        
      } catch (error) {
        console.error('Error loading data:', error);
      }
      
      setIsLoaded(true);
      console.log('Data loading completed');
    };
    
    loadData();
  }, []);

  // Save to database whenever state changes (but only after initial load)
  useEffect(() => {
    if (isLoaded) {
      console.log('Saving tasks:', tasks.length, 'tasks');
      databaseService.saveTasks(tasks);
    }
  }, [tasks, isLoaded]);

  useEffect(() => {
    if (isLoaded) {
      console.log('Saving completed tasks:', completedTasks.length, 'completed tasks');
      databaseService.saveCompletedTasks(completedTasks);
    }
  }, [completedTasks, isLoaded]);

  useEffect(() => {
    if (isLoaded) {
      console.log('Saving selected for today:', selectedForToday.length, 'selected tasks');
      databaseService.saveSelectedForToday(selectedForToday);
    }
  }, [selectedForToday, isLoaded]);

  const parseBulkTasks = (text) => {
    const lines = text.split('\n').filter(line => line.trim());
    const tasks = [];
    const stack = []; // Stack to keep track of parent tasks
    
    for (const line of lines) {
      // Count indentation level (spaces or tabs)
      const indentMatch = line.match(/^(\s*)/);
      const indentLevel = indentMatch ? Math.floor(indentMatch[1].length / 4) : 0; // 4 spaces = 1 level
      
      // Remove common bullet point formats and indentation
      const cleaned = line.trim().replace(/^[-*•]\s*/, '').replace(/^\d+[.)]\s*/, '').trim();
      
      if (cleaned) {
        // Adjust stack to current indentation level
        while (stack.length > indentLevel) {
          stack.pop();
        }
        
        const parentId = stack.length > 0 ? stack[stack.length - 1].id : null;
        const parentText = stack.length > 0 ? stack[stack.length - 1].text : null;
        
        const task = {
          text: cleaned,
          parentId,
          parentText,
          level: indentLevel
        };
        
        tasks.push(task);
        stack.push({ id: tasks.length - 1, text: cleaned }); // Use index as temp ID
      }
    }
    
    return tasks;
  };

  const addTask = () => {
    if (newTask.trim()) {
      const task = {
        id: Date.now(),
        text: newTask.trim(),
        createdAt: new Date().toISOString(),
        parentId: null,
        parentText: null,
        level: 0
      };
      setTasks([...tasks, task]);
      setNewTask('');
    }
  };

  const addBulkTasks = () => {
    if (bulkTasks.trim()) {
      const parsedTasks = parseBulkTasks(bulkTasks);
      const baseId = Date.now();
      const parentIdMap = new Map(); // Map temp IDs to real IDs
      
      const newTasks = parsedTasks.map((taskData, index) => {
        const realId = baseId + index;
        const realParentId = taskData.parentId !== null ? parentIdMap.get(taskData.parentId) : null;
        
        const task = {
          id: realId,
          text: taskData.text,
          parentId: realParentId,
          parentText: taskData.parentText,
          level: taskData.level,
          createdAt: new Date().toISOString()
        };
        
        parentIdMap.set(index, realId);
        return task;
      });
      
      setTasks([...tasks, ...newTasks]);
      setBulkTasks('');
      setShowBulkImport(false);
    }
  };

  const deleteTask = (taskId) => {
    setTasks(tasks.filter(t => t.id !== taskId));
    setSelectedForToday(selectedForToday.filter(id => id !== taskId));
    setSelectedTasks(selectedTasks.filter(id => id !== taskId));
  };

  const toggleTaskSelection = (taskId) => {
    setSelectedTasks(prev => 
      prev.includes(taskId) 
        ? prev.filter(id => id !== taskId)
        : [...prev, taskId]
    );
  };

  const selectAllTasks = () => {
    const allTaskIds = tasks.map(task => task.id);
    setSelectedTasks(allTaskIds);
  };

  const deselectAllTasks = () => {
    setSelectedTasks([]);
  };

  const deleteSelectedTasks = () => {
    setTasks(tasks.filter(t => !selectedTasks.includes(t.id)));
    setSelectedForToday(selectedForToday.filter(id => !selectedTasks.includes(id)));
    setSelectedTasks([]);
  };

  const deleteAllTasks = () => {
    setTasks([]);
    setSelectedForToday([]);
    setSelectedTasks([]);
  };

  const addSubTask = (parentTask) => {
    const taskText = subTaskTexts[parentTask.id] || '';
    
    if (taskText.trim()) {
      const subTaskId = Date.now();
      const subTask = {
        id: subTaskId,
        text: taskText.trim(),
        parentId: parentTask.id,
        parentText: parentTask.text,
        level: (parentTask.level || 0) + 1,
        createdAt: new Date().toISOString()
      };
      
      setTasks(prev => [...prev, subTask]);
      
      // If the parent task is in today's list, automatically add the sub-task too
      setSelectedForToday(prev => {
        if (prev.includes(parentTask.id)) {
          return [...prev, subTaskId];
        }
        return prev;
      });
      
      setSubTaskTexts(prev => ({ ...prev, [parentTask.id]: '' }));
      setAddingSubTaskTo(null);
    }
  };

  const startAddingSubTask = (parentTask) => {
    setAddingSubTaskTo(parentTask.id);
    setSubTaskTexts(prev => ({ ...prev, [parentTask.id]: '' }));
  };

  const cancelAddingSubTask = (taskId) => {
    setAddingSubTaskTo(null);
    setSubTaskTexts(prev => ({ ...prev, [taskId]: '' }));
  };

  const updateSubTaskText = (taskId, text) => {
    setSubTaskTexts(prev => ({ ...prev, [taskId]: text }));
  };

  const buildJiraPayload = (task) => {
    const summary = task.parentText ? `${task.parentText} - ${task.text}` : task.text;
    const description = task.parentText ? `Parent Task: ${task.parentText}\n\n${task.text}` : task.text;
    
    return {
      "fields": {
        "project": {"id": "10732"},
        "issuetype": {"id": "10002"},
        "summary": summary,
        "versions": [],
        "fixVersions": [],
        "reporter": {"id": "5e94eb483a8b910c084751b0"},
        "assignee": {"id": "5e94eb483a8b910c084751b0"},
        "priority": {"id": "10006", "name": "Unspecified", "iconUrl": "https://linkedin.atlassian.net/images/icons/priorities/major.svg"},
        "description": {
          "version": 1,
          "type": "doc",
          "content": [{
            "type": "paragraph",
            "content": [{
              "type": "text",
              "text": description
            }]
          }]
        },
        "customfield_10382": {"id": "14141", "value": "EI2"},
        "components": [],
        "customfield_10338": [],
        "customfield_10361": [{"id": "15333", "value": "Not complete"}],
        "customfield_10347": [],
        "customfield_10437": [],
        "customfield_10398": {
          "type": "doc",
          "version": 1,
          "content": [{
            "type": "paragraph",
            "content": [{
              "type": "text",
              "text": "Plan:\n\nProgress:\n\nIssues:"
            }]
          }]
        },
        "customfield_10413": {"id": "13066", "value": "Yes"},
        "labels": ["odie"],
        "customfield_10332": {"id": "11449", "value": "No"},
        "customfield_10409": {"id": "14844", "value": "Gray"},
        "customfield_10449": [],
        "customfield_10389": [],
        "customfield_10471": [],
        "customfield_10443": []
      },
      "update": {},
      "watchers": ["5e94eb483a8b910c084751b0"],
      "externalToken": Math.random().toString()
    };
  };

  const copyTaskToJira = (task) => {
    const jiraPayload = buildJiraPayload(task);
    const fetchCommand = `fetch("https://linkedin.atlassian.net/rest/api/3/issue?updateHistory=true&applyDefaultValues=false&skipAutoWatch=true", {
  "headers": {
    "accept": "application/json,text/javascript,*/*",
    "accept-language": "en-US,en;q=0.9,zh-CN;q=0.8,zh;q=0.7",
    "content-type": "application/json",
    "priority": "u=1, i",
    "sec-ch-ua": "\\"Not;A=Brand\\";v=\\"99\\", \\"Google Chrome\\";v=\\"139\\", \\"Chromium\\";v=\\"139\\"",
    "sec-ch-ua-mobile": "?0",
    "sec-ch-ua-platform": "\\"macOS\\"",
    "sec-fetch-dest": "empty",
    "sec-fetch-mode": "cors",
    "sec-fetch-site": "same-origin",
    "x-atlassian-capability": "ISSUE_VIEW--other"
  },
  "body": ${JSON.stringify(JSON.stringify(jiraPayload))},
  "method": "POST"
}).then(r => r.json()).then(result => {
  console.log('JIRA ticket created:', result);
  if (result.key) {
    console.log('Ticket URL: https://linkedin.atlassian.net/browse/' + result.key);
  }
});`;

    navigator.clipboard.writeText(fetchCommand).then(() => {
      alert('Complete JIRA fetch command copied to clipboard!\n\n1. Open JIRA in your browser\n2. Open Developer Console (F12)\n3. Paste and press Enter\n\nNote: You may need to update auth headers if they expire.');
    }).catch(() => {
      alert('Failed to copy to clipboard');
    });
  };

  const createJiraTicket = async (task) => {
    const jiraPayload = buildJiraPayload(task);
    
    try {
      const response = await fetch("https://linkedin.atlassian.net/rest/api/3/issue?updateHistory=true&applyDefaultValues=false&skipAutoWatch=true", {
        method: "POST",
        headers: {
          "accept": "application/json,text/javascript,*/*",
          "content-type": "application/json",
          "x-atlassian-capability": "ISSUE_VIEW--other"
        },
        body: JSON.stringify(jiraPayload),
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      if (result.key) {
        const ticketUrl = `https://linkedin.atlassian.net/browse/${result.key}`;
        alert(`✅ JIRA ticket created successfully!\n\nTicket: ${result.key}\nURL: ${ticketUrl}`);
        
        // Optional: Open the ticket in a new tab
        window.open(ticketUrl, '_blank');
      } else {
        alert('✅ Ticket created but no key returned. Check JIRA for the new ticket.');
      }
    } catch (error) {
      console.error('Error creating JIRA ticket:', error);
      alert(`❌ Failed to create JIRA ticket: ${error.message}\n\nThis might be due to CORS restrictions or authentication. Try the "Copy to Console" option instead.`);
    }
  };

  const startEditing = (task) => {
    setEditingTask(task.id);
    setEditText(task.text);
  };

  const saveEdit = () => {
    setTasks(tasks.map(t => 
      t.id === editingTask ? { ...t, text: editText } : t
    ));
    setEditingTask(null);
    setEditText('');
  };

  const cancelEdit = () => {
    setEditingTask(null);
    setEditText('');
  };

  const toggleTaskForToday = (taskId) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    
    setSelectedForToday(prev => {
      const isCurrentlySelected = prev.includes(taskId);
      
      if (isCurrentlySelected) {
        // Removing from today
        let newSelection = prev.filter(id => id !== taskId);
        
        // If this is a parent task (has no parentId), also remove all its children
        if (!task.parentId) {
          const childTasks = tasks.filter(t => t.parentId === taskId);
          const childIds = childTasks.map(t => t.id);
          
          // Remove all children from today's selection
          newSelection = newSelection.filter(id => !childIds.includes(id));
        }
        
        return newSelection;
      } else {
        // Adding to today
        let newSelection = [...prev, taskId];
        
        // If this is a parent task (has no parentId), also add all its children
        if (!task.parentId) {
          const childTasks = tasks.filter(t => t.parentId === taskId);
          const childIds = childTasks.map(t => t.id);
          
          // Add children that aren't already selected
          childIds.forEach(childId => {
            if (!newSelection.includes(childId)) {
              newSelection.push(childId);
            }
          });
        }
        
        return newSelection;
      }
    });
  };

  const completeTask = (taskId) => {
    const task = tasks.find(t => t.id === taskId);
    if (task) {
      const completedTask = {
        ...task,
        completedAt: new Date().toISOString(),
        completedDate: new Date().toLocaleDateString()
      };
      setCompletedTasks([completedTask, ...completedTasks]);
      setTasks(tasks.filter(t => t.id !== taskId));
      setSelectedForToday(selectedForToday.filter(id => id !== taskId));
    }
  };

  const getTodaysTasks = () => {
    const todayTasks = tasks.filter(task => selectedForToday.includes(task.id));
    
    // Create a set of task IDs that are in today's view for quick lookup
    const todayTaskIds = new Set(todayTasks.map(t => t.id));
    
    // Build a proper hierarchy for today's tasks
    const adjustedTasks = todayTasks.map(task => {
      // If the task's parent is also in today's view, maintain its level
      // Otherwise, treat it as a root task (level 0)
      const adjustedLevel = task.parentId && todayTaskIds.has(task.parentId) 
        ? task.level 
        : 0;
      
      return {
        ...task,
        level: adjustedLevel
      };
    });
    
    // Sort tasks to ensure parents appear before their children
    const sortedTasks = [];
    const processed = new Set();
    
    // Helper function to add task and its children in order
    const addTaskWithChildren = (task) => {
      if (processed.has(task.id)) return;
      
      sortedTasks.push(task);
      processed.add(task.id);
      
      // Find and add children that are in today's selection
      const children = adjustedTasks
        .filter(t => t.parentId === task.id)
        .sort((a, b) => {
          const aDate = a.createdAt || new Date().toISOString();
          const bDate = b.createdAt || new Date().toISOString();
          return aDate.localeCompare(bDate);
        });
      
      children.forEach(child => addTaskWithChildren(child));
    };
    
    // First add all root tasks (those without parents in today's view)
    const rootTasks = adjustedTasks
      .filter(task => !task.parentId || !todayTaskIds.has(task.parentId))
      .sort((a, b) => {
        const aDate = a.createdAt || new Date().toISOString();
        const bDate = b.createdAt || new Date().toISOString();
        return aDate.localeCompare(bDate);
      });
    
    rootTasks.forEach(task => addTaskWithChildren(task));
    
    // Add any remaining tasks that weren't processed (shouldn't happen, but just in case)
    adjustedTasks.forEach(task => {
      if (!processed.has(task.id)) {
        sortedTasks.push(task);
      }
    });
    
    return sortedTasks;
  };

  const getFilteredCompletedTasks = () => {
    return completedTasks.filter(task => {
      const matchesSearch = task.text.toLowerCase().includes(searchTerm.toLowerCase());
      
      let matchesDate = true;
      if (dateFilter) {
        // Fix timezone issue by creating date at noon local time
        const [year, month, day] = dateFilter.split('-');
        const filterDate = new Date(year, month - 1, day, 12, 0, 0).toLocaleDateString();
        const taskDate = task.completedDate;
        matchesDate = taskDate === filterDate;
        
        // Debug logging
        console.log('Date filter comparison:', {
          dateFilter,
          filterDate,
          taskDate,
          matches: matchesDate
        });
      }
      
      return matchesSearch && matchesDate;
    });
  };

  const generateStatusUpdate = () => {
    const today = new Date().toLocaleDateString();
    const todaysCompleted = completedTasks.filter(task => task.completedDate === today);
    
    if (todaysCompleted.length === 0) {
      return "No tasks completed today yet.";
    }

    return `Status Update for ${today}:\n\nCompleted:\n${todaysCompleted.map(task => `• ${task.text}`).join('\n')}`;
  };

  const generateDailySummary = async (date = null, useAI = false) => {
    const targetDate = date || new Date().toLocaleDateString();
    const dayTasks = completedTasks.filter(task => task.completedDate === targetDate);
    
    if (dayTasks.length === 0) {
      return `No tasks completed on ${targetDate}.`;
    }

    // Try AI-enhanced summary first
    if (useAI) {
      console.log('Attempting to generate AI summary...');
      try {
        const aiSummary = await aiService.generateEnhancedSummary(dayTasks, 'daily', targetDate);
        console.log('AI summary response:', aiSummary);
        if (aiSummary) {
          return aiSummary;
        }
        console.log('AI summary was null, falling back to basic summary');
      } catch (error) {
        console.error('AI summary failed, falling back to basic summary:', error);
      }
    } else {
      console.log('useAI is false, generating basic summary');
    }

    // Fallback to basic summary
    const parentGroups = {};
    const standaloneTasks = [];
    
    dayTasks.forEach(task => {
      if (task.parentText) {
        if (!parentGroups[task.parentText]) {
          parentGroups[task.parentText] = [];
        }
        parentGroups[task.parentText].push(task);
      } else {
        standaloneTasks.push(task);
      }
    });

    let summary = `Daily Summary for ${targetDate}\n`;
    summary += `Total completed: ${dayTasks.length} tasks\n\n`;

    // Add grouped tasks
    Object.entries(parentGroups).forEach(([parent, tasks]) => {
      summary += `📋 ${parent}:\n`;
      tasks.forEach(task => {
        summary += `  • ${task.text}\n`;
      });
      summary += `\n`;
    });

    // Add standalone tasks
    if (standaloneTasks.length > 0) {
      summary += `📝 Other Tasks:\n`;
      standaloneTasks.forEach(task => {
        summary += `  • ${task.text}\n`;
      });
    }

    return summary;
  };

  const generateWeeklySummary = async (endDate = null) => {
    const end = endDate ? new Date(endDate) : new Date();
    const start = new Date(end);
    start.setDate(end.getDate() - 6); // 7 days including end date
    
    const weekTasks = completedTasks.filter(task => {
      const taskDate = new Date(task.completedAt);
      return taskDate >= start && taskDate <= end;
    });

    if (weekTasks.length === 0) {
      return `No tasks completed in the week ending ${end.toLocaleDateString()}.`;
    }

    // Group by date
    const dailyGroups = {};
    weekTasks.forEach(task => {
      const date = task.completedDate;
      if (!dailyGroups[date]) {
        dailyGroups[date] = [];
      }
      dailyGroups[date].push(task);
    });

    let summary = `Weekly Summary (${start.toLocaleDateString()} - ${end.toLocaleDateString()})\n`;
    summary += `Total completed: ${weekTasks.length} tasks\n\n`;

    // Add daily breakdown
    Object.entries(dailyGroups)
      .sort(([a], [b]) => new Date(a) - new Date(b))
      .forEach(([date, tasks]) => {
        summary += `📅 ${date} (${tasks.length} tasks):\n`;
        tasks.forEach(task => {
          summary += `  • ${task.text}${task.parentText ? ` (${task.parentText})` : ''}\n`;
        });
        summary += `\n`;
      });

    return summary;
  };

  const copySummary = (summaryText) => {
    navigator.clipboard.writeText(summaryText).then(() => {
      alert('Summary copied to clipboard!');
    }).catch(() => {
      alert('Failed to copy summary');
    });
  };

  const getSortedTasks = () => {
    const taskMap = new Map();
    tasks.forEach(task => taskMap.set(task.id, task));
    
    const result = [];
    const processed = new Set();
    
    // Function to recursively add a task and all its children
    const addTaskWithChildren = (task) => {
      if (processed.has(task.id)) return;
      
      result.push(task);
      processed.add(task.id);
      
      // Find and add all direct children of this task
      const children = tasks
        .filter(t => t.parentId === task.id)
        .sort((a, b) => {
          const aDate = a.createdAt || a.created_at || new Date().toISOString();
          const bDate = b.createdAt || b.created_at || new Date().toISOString();
          return aDate.localeCompare(bDate);
        });
      
      children.forEach(child => addTaskWithChildren(child));
    };
    
    // First, add all root tasks (no parent) and their hierarchies
    const rootTasks = tasks
      .filter(task => !task.parentId)
      .sort((a, b) => {
        const aDate = a.createdAt || a.created_at || new Date().toISOString();
        const bDate = b.createdAt || b.created_at || new Date().toISOString();
        return aDate.localeCompare(bDate);
      });
    
    rootTasks.forEach(rootTask => addTaskWithChildren(rootTask));
    
    // Add any orphaned tasks (tasks whose parent doesn't exist)
    tasks.forEach(task => {
      if (!processed.has(task.id)) {
        addTaskWithChildren(task);
      }
    });
    
    return result;
  };

  const getFilteredAllTasks = () => {
    if (!allTasksSearchTerm.trim()) {
      return getSortedTasks();
    }
    
    const searchLower = allTasksSearchTerm.toLowerCase();
    const filteredTasks = tasks.filter(task => {
      const matchesTaskText = task.text.toLowerCase().includes(searchLower);
      const matchesParentText = task.parentText && task.parentText.toLowerCase().includes(searchLower);
      return matchesTaskText || matchesParentText;
    });
    
    // Now sort the filtered tasks maintaining hierarchy
    const taskMap = new Map();
    filteredTasks.forEach(task => taskMap.set(task.id, task));
    
    const result = [];
    const processed = new Set();
    
    // Function to recursively add a task and all its children
    const addTaskWithChildren = (task) => {
      if (processed.has(task.id)) return;
      
      result.push(task);
      processed.add(task.id);
      
      // Find and add all direct children of this task that are in the filtered list
      const children = filteredTasks
        .filter(t => t.parentId === task.id)
        .sort((a, b) => {
          const aDate = a.createdAt || a.created_at || new Date().toISOString();
          const bDate = b.createdAt || b.created_at || new Date().toISOString();
          return aDate.localeCompare(bDate);
        });
      
      children.forEach(child => addTaskWithChildren(child));
    };
    
    // First, add all root tasks (no parent) and their hierarchies
    const rootTasks = filteredTasks
      .filter(task => !task.parentId)
      .sort((a, b) => {
        const aDate = a.createdAt || a.created_at || new Date().toISOString();
        const bDate = b.createdAt || b.created_at || new Date().toISOString();
        return aDate.localeCompare(bDate);
      });
    
    rootTasks.forEach(rootTask => addTaskWithChildren(rootTask));
    
    // Add any orphaned tasks (tasks whose parent doesn't exist in filtered results)
    filteredTasks.forEach(task => {
      if (!processed.has(task.id)) {
        addTaskWithChildren(task);
      }
    });
    
    return result;
  };

  const TaskItem = ({ task, showActions = true, isCompleted = false, showCheckbox = false }) => {
    const subtaskInputRef = useRef(null);
    const [showMenu, setShowMenu] = useState(false);
    const [isHovered, setIsHovered] = useState(false);
    const menuRef = useRef(null);
    const indentationStyle = {
      marginLeft: `${(task.level || 0) * 20}px`
    };

    // Auto-focus when sub-task input appears
    useEffect(() => {
      if (addingSubTaskTo === task.id && subtaskInputRef.current) {
        const input = subtaskInputRef.current;
        input.focus();
        // Set cursor to end of text
        const length = input.value.length;
        input.setSelectionRange(length, length);
      }
    }, [addingSubTaskTo, task.id]);

    // Close menu when clicking outside
    useEffect(() => {
      const handleClickOutside = (event) => {
        if (menuRef.current && !menuRef.current.contains(event.target)) {
          setShowMenu(false);
        }
      };
      if (showMenu) {
        document.addEventListener('mousedown', handleClickOutside);
      }
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }, [showMenu]);

    return (
      <div 
        className={`group relative py-2 px-3 rounded ${isCompleted ? 'bg-gray-50' : 'hover:bg-gray-50'} transition-colors`}
        style={indentationStyle}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {editingTask === task.id ? (
          <div className="space-y-2">
            <textarea
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              className="w-full p-2 border border-gray-200 rounded text-sm resize-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 focus:outline-none"
              rows="2"
              autoFocus
            />
            <div className="flex gap-2">
              <button
                onClick={saveEdit}
                className="text-sm px-2 py-1 text-blue-600 hover:bg-blue-50 rounded transition-colors"
              >
                Save
              </button>
              <button
                onClick={cancelEdit}
                className="text-sm px-2 py-1 text-gray-500 hover:bg-gray-100 rounded transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-start gap-2">
              {showCheckbox && (
                <input
                  type="checkbox"
                  checked={selectedTasks.includes(task.id)}
                  onChange={() => toggleTaskSelection(task.id)}
                  className="mt-0.5 h-3.5 w-3.5 text-blue-600 focus:ring-1 focus:ring-blue-500 border-gray-300 rounded"
                />
              )}
              <div className="flex-1 min-w-0">
                {task.parentText && (
                  <div className="text-xs text-gray-400 mb-0.5">
                    {task.parentText}
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <div className={`text-sm ${isCompleted ? 'text-gray-400 line-through' : 'text-gray-900'}`}>{task.text}</div>
                  {!isCompleted && selectedForToday.includes(task.id) && (
                    <span className="inline-flex items-center px-1.5 py-0.5 text-xs font-medium bg-blue-100 text-blue-700 rounded">
                      Today
                    </span>
                  )}
                </div>
                {isCompleted && (
                  <div className="text-xs text-gray-400 mt-1">
                    {new Date(task.completedAt).toLocaleDateString()}
                  </div>
                )}
              </div>
              
              {showActions && !isCompleted && (
                <div className="flex items-start gap-1">
                  {/* Primary actions - always visible on hover, calendar always visible if selected */}
                  <div className={`flex gap-1 transition-opacity ${
                    isHovered || selectedForToday.includes(task.id) ? 'opacity-100' : 'opacity-0'
                  }`}>
                    <button
                      onClick={() => completeTask(task.id)}
                      className={`p-1 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded transition-colors ${
                        !isHovered && selectedForToday.includes(task.id) ? 'opacity-0' : 'opacity-100'
                      }`}
                      title="Complete task"
                    >
                      <Check size={16} />
                    </button>
                    
                    <button
                      onClick={() => toggleTaskForToday(task.id)}
                      className={`p-1 rounded transition-colors ${
                        selectedForToday.includes(task.id)
                          ? 'text-blue-600 bg-blue-50'
                          : 'text-gray-400 hover:text-blue-600 hover:bg-blue-50'
                      }`}
                      title={selectedForToday.includes(task.id) ? 'Remove from today' : 'Add to today'}
                    >
                      <Calendar size={16} />
                    </button>
                  </div>
                  
                  {/* More actions menu */}
                  <div className="relative" ref={menuRef}>
                    <button
                      onClick={() => setShowMenu(!showMenu)}
                      className={`p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-all ${
                        showMenu ? 'bg-gray-100 text-gray-600' : ''
                      } ${
                        isHovered ? 'opacity-100' : 'opacity-0'
                      }`}
                    >
                      <MoreVertical size={16} />
                    </button>
                    
                    {showMenu && (
                      <div className="absolute right-0 top-8 w-48 bg-white rounded-md shadow-lg border border-gray-200 py-1 z-10">
                        <button
                          onClick={() => {
                            startEditing(task);
                            setShowMenu(false);
                          }}
                          className="w-full text-left px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                        >
                          <Edit3 size={14} /> Edit
                        </button>
                        
                        <button
                          onClick={() => {
                            startAddingSubTask(task);
                            setShowMenu(false);
                          }}
                          className="w-full text-left px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                        >
                          <Plus size={14} /> Add sub-task
                        </button>
                        
                        <div className="border-t border-gray-100 my-1"></div>
                        
                        <button
                          onClick={() => {
                            createJiraTicket(task);
                            setShowMenu(false);
                          }}
                          className="w-full text-left px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                        >
                          <ExternalLink size={14} /> Create JIRA ticket
                        </button>
                        
                        <button
                          onClick={() => {
                            copyTaskToJira(task);
                            setShowMenu(false);
                          }}
                          className="w-full text-left px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                        >
                          <FileText size={14} /> Copy JIRA payload
                        </button>
                        
                        <div className="border-t border-gray-100 my-1"></div>
                        
                        <button
                          onClick={() => {
                            deleteTask(task.id);
                            setShowMenu(false);
                          }}
                          className="w-full text-left px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                        >
                          <Trash2 size={14} /> Delete
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
            
            {/* Sub-task creation UI */}
            {addingSubTaskTo === task.id && (
              <div className="mt-2 ml-6">
                <div className="flex gap-2">
                  <input
                    ref={subtaskInputRef}
                    type="text"
                    value={subTaskTexts[task.id] || ''}
                    onChange={(e) => updateSubTaskText(task.id, e.target.value)}
                    placeholder="Enter sub-task..."
                    className="flex-1 px-2 py-1 text-sm border border-gray-200 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500 focus:outline-none"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        addSubTask(task);
                      }
                      if (e.key === 'Escape') {
                        cancelAddingSubTask(task.id);
                      }
                    }}
                  />
                  <button
                    onClick={() => addSubTask(task)}
                    className="px-2 py-1 text-sm text-blue-600 hover:bg-blue-50 rounded transition-colors"
                  >
                    Add
                  </button>
                  <button
                    onClick={() => cancelAddingSubTask(task.id)}
                    className="px-2 py-1 text-sm text-gray-500 hover:bg-gray-100 rounded transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-4xl mx-auto px-4 py-6">
        <header className="mb-6">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-semibold text-gray-900">Tasks</h1>
            <div className="text-xs text-gray-400">
              <span className="hidden sm:inline">Press 1/2/3 to switch tabs, / to search</span>
            </div>
          </div>
        </header>

        {/* Navigation Tabs */}
        <div className="mb-6 border-b border-gray-100">
          <nav className="flex space-x-6">
            {[
              { id: 'today', label: 'Today' },
              { id: 'all', label: 'All' },
              { id: 'completed', label: 'Completed' }
            ].map(({ id, label }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`pb-2 text-sm font-medium transition-colors border-b-2 ${
                  activeTab === id
                    ? 'border-gray-900 text-gray-900'
                    : 'border-transparent text-gray-400 hover:text-gray-600'
                }`}
              >
                {label}
              </button>
            ))}
          </nav>
        </div>

        {/* Today's Tasks Tab */}
        {activeTab === 'today' && (
          <div className="space-y-4">
            <div>
              <div className="flex justify-between items-center mb-3">
                <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wide">Today's Focus</h2>
                {completedTasks.filter(t => t.completedDate === new Date().toLocaleDateString()).length > 0 && (
                  <button
                    onClick={async () => {
                      const summary = await generateDailySummary(new Date().toLocaleDateString(), true);
                      setSummaryModal({ isOpen: true, content: summary, title: 'AI Summary for Today' });
                    }}
                    className="text-sm text-blue-600 hover:text-blue-700 transition-colors"
                  >
                    Generate summary
                  </button>
                )}
              </div>
              
              {getTodaysTasks().length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <p className="text-sm">No tasks for today</p>
                  <p className="text-xs mt-1">Add tasks from the "All" tab</p>
                </div>
              ) : (
                <div className="space-y-1">
                  {getTodaysTasks().map(task => (
                    <TaskItem key={task.id} task={task} />
                  ))}
                </div>
              )}
            </div>

            {completedTasks.filter(t => t.completedDate === new Date().toLocaleDateString()).length > 0 && (
              <div className="mt-8 pt-4 border-t border-gray-100">
                <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-3">Status Update</h3>
                <div className="bg-gray-50 rounded p-3">
                  <pre className="whitespace-pre-wrap text-sm text-gray-700">{generateStatusUpdate()}</pre>
                </div>
                <button
                  onClick={() => navigator.clipboard.writeText(generateStatusUpdate())}
                  className="mt-2 text-sm text-blue-600 hover:text-blue-700 transition-colors"
                >
                  Copy to clipboard
                </button>
              </div>
            )}
          </div>
        )}

        {/* All Tasks Tab */}
        {activeTab === 'all' && (
          <div className="space-y-4">
            <div>
              <div className="flex justify-between items-center mb-3">
                <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wide">Add Task</h2>
                <button
                  onClick={() => setShowBulkImport(!showBulkImport)}
                  className="text-sm text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showBulkImport ? 'Single' : 'Bulk'}
                </button>
              </div>
              
              {!showBulkImport ? (
                <>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newTask}
                      onChange={(e) => setNewTask(e.target.value)}
                      placeholder="What needs to be done?"
                      className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500 focus:outline-none"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          addTask();
                        }
                      }}
                    />
                    <button
                      onClick={addTask}
                      className="px-3 py-2 text-sm bg-gray-900 text-white rounded hover:bg-gray-800 transition-colors"
                    >
                      Add
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="space-y-2">
                    <textarea
                      value={bulkTasks}
                      onChange={(e) => setBulkTasks(e.target.value)}
                      placeholder="Paste tasks (use indentation for sub-tasks)"
                      className="w-full p-2 text-sm border border-gray-200 rounded resize-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 focus:outline-none"
                      rows="6"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={addBulkTasks}
                        className="px-3 py-1.5 text-sm bg-gray-900 text-white rounded hover:bg-gray-800 transition-colors"
                      >
                        Import
                      </button>
                      <button
                        onClick={() => setBulkTasks('')}
                        className="px-3 py-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors"
                      >
                        Clear
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="mt-6">
              {/* Search bar for All Tasks */}
              <div className="mb-4">
                <div className="relative">
                  <Search size={16} className="absolute left-2.5 top-2.5 text-gray-400" />
                  <input
                    type="text"
                    value={allTasksSearchTerm}
                    onChange={(e) => setAllTasksSearchTerm(e.target.value)}
                    placeholder="Search tasks..."
                    className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-between items-center mb-3">
                <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wide">
                  All Tasks ({allTasksSearchTerm ? `${getFilteredAllTasks().length} of ${tasks.length}` : tasks.length})
                </h2>
                
                {tasks.length > 0 && (
                  <div className="flex gap-2 items-center">
                    {selectedTasks.length > 0 && (
                      <span className="text-xs text-gray-400 mr-2">
                        {selectedTasks.length} selected
                      </span>
                    )}
                    
                    <button
                      onClick={selectedTasks.length === tasks.length ? deselectAllTasks : selectAllTasks}
                      className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      {selectedTasks.length === tasks.length ? 'Deselect all' : 'Select all'}
                    </button>
                    
                    {selectedTasks.length > 0 && (
                      <button
                        onClick={deleteSelectedTasks}
                        className="text-xs text-red-500 hover:text-red-600 transition-colors"
                      >
                        Delete selected
                      </button>
                    )}
                    
                    {tasks.length > 5 && (
                      <button
                        onClick={deleteAllTasks}
                        className="text-xs text-red-500 hover:text-red-600 transition-colors"
                      >
                        Delete all
                      </button>
                    )}
                  </div>
                )}
              </div>
              
              {tasks.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <p className="text-sm">No tasks yet</p>
                </div>
              ) : getFilteredAllTasks().length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <p className="text-sm">No tasks found matching "{allTasksSearchTerm}"</p>
                  <button
                    onClick={() => setAllTasksSearchTerm('')}
                    className="text-xs mt-2 text-blue-600 hover:text-blue-700 transition-colors"
                  >
                    Clear search
                  </button>
                </div>
              ) : (
                <div className="space-y-1">
                  {getFilteredAllTasks().map(task => (
                    <TaskItem key={task.id} task={task} showCheckbox={true} />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Completed Tasks Tab */}
        {activeTab === 'completed' && (
          <div className="space-y-4">
            <div>
              <div className="flex justify-between items-center mb-3">
                <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wide">Completed Tasks</h2>
                <div className="flex gap-3">
                  {completedTasks.filter(t => t.completedDate === new Date().toLocaleDateString()).length > 0 && (
                    <button
                      onClick={async () => {
                        const summary = await generateDailySummary(new Date().toLocaleDateString(), true);
                        setSummaryModal({ isOpen: true, content: summary, title: 'Daily Summary' });
                      }}
                      className="text-sm text-blue-600 hover:text-blue-700 transition-colors"
                    >
                      Today's summary
                    </button>
                  )}
                  <button
                    onClick={async () => {
                      const summary = await generateWeeklySummary();
                      setSummaryModal({ isOpen: true, content: summary, title: 'Weekly Summary' });
                    }}
                    className="text-sm text-blue-600 hover:text-blue-700 transition-colors"
                  >
                    Weekly summary
                  </button>
                </div>
              </div>
              
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search size={16} className="absolute left-2.5 top-2.5 text-gray-400" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search..."
                    className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500 focus:outline-none"
                  />
                </div>
                
                <input
                  type="date"
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                  className="px-3 py-2 text-sm border border-gray-200 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>


            <div className="mt-4">
              {getFilteredCompletedTasks().length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <p className="text-sm">No completed tasks found</p>
                  {(searchTerm || dateFilter) && (
                    <p className="text-xs mt-1">Try adjusting your filters</p>
                  )}
                </div>
              ) : (
                <div className="space-y-1">
                  {getFilteredCompletedTasks().map(task => (
                    <TaskItem key={task.id} task={task} showActions={false} isCompleted={true} />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Summary Modal */}
      {summaryModal.isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
            <div className="p-4 border-b border-gray-100">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium text-gray-900">{summaryModal.title}</h3>
                <button
                  onClick={() => setSummaryModal({ isOpen: false, content: '', title: '' })}
                  className="p-1 hover:bg-gray-100 rounded transition-colors"
                >
                  <X size={18} />
                </button>
              </div>
            </div>
            <div className="p-4 overflow-y-auto max-h-[60vh]">
              <pre className="whitespace-pre-wrap text-sm text-gray-700">{summaryModal.content}</pre>
            </div>
            <div className="p-4 border-t border-gray-100 flex justify-end">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(summaryModal.content);
                  alert('Summary copied to clipboard!');
                }}
                className="px-3 py-1.5 text-sm bg-gray-900 text-white rounded hover:bg-gray-800 transition-colors"
              >
                Copy to clipboard
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TaskManager;