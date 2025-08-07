import React, { useState, useEffect, useRef } from 'react';
import { Plus, Calendar, CheckSquare, Clock, Search, Filter, Trash2, Edit3, Save, X, FileText, ChevronDown, ChevronRight, ExternalLink, BarChart3 } from 'lucide-react';
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
  const [dateFilter, setDateFilter] = useState('');
  const [activeTab, setActiveTab] = useState('today');
  const [summaryModal, setSummaryModal] = useState({ isOpen: false, content: '', title: '' });
  const [displayedSummary, setDisplayedSummary] = useState({ content: '', type: '' });

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
    return tasks.filter(task => selectedForToday.includes(task.id));
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

  const TaskItem = ({ task, showActions = true, isCompleted = false, showCheckbox = false }) => {
    const subtaskInputRef = useRef(null);
    const indentationStyle = {
      marginLeft: `${(task.level || 0) * 24}px`
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

    return (
      <div 
        className={`p-4 rounded-lg border ${isCompleted ? 'bg-green-50 border-green-200' : 'bg-white border-gray-200'} shadow-sm`}
        style={indentationStyle}
      >
        {editingTask === task.id ? (
          <div className="space-y-3">
            <textarea
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              rows="3"
            />
            <div className="flex gap-2">
              <button
                onClick={saveEdit}
                className="flex items-center gap-1 px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
              >
                <Save size={16} /> Save
              </button>
              <button
                onClick={cancelEdit}
                className="flex items-center gap-1 px-3 py-1 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
              >
                <X size={16} /> Cancel
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-start gap-3 mb-3">
              {showCheckbox && (
                <input
                  type="checkbox"
                  checked={selectedTasks.includes(task.id)}
                  onChange={() => toggleTaskSelection(task.id)}
                  className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
              )}
              <div className="flex-1">
                {task.parentText && (
                  <div className="text-xs text-gray-500 mb-1 font-medium">
                    📋 {task.parentText}
                  </div>
                )}
                <pre className="whitespace-pre-wrap text-sm text-gray-800 font-mono">{task.text}</pre>
                {isCompleted && (
                  <div className="text-xs text-gray-500 mt-2">
                    Completed: {new Date(task.completedAt).toLocaleString()}
                  </div>
                )}
              </div>
            </div>
            
            {showActions && !isCompleted && (
              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={() => toggleTaskForToday(task.id)}
                  className={`flex items-center gap-1 px-3 py-1 rounded text-sm transition-colors ${
                    selectedForToday.includes(task.id)
                      ? 'bg-blue-600 text-white hover:bg-blue-700'
                      : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                  }`}
                >
                  <Calendar size={16} />
                  {selectedForToday.includes(task.id) ? 'Remove from Today' : 'Add to Today'}
                </button>
                
                <button
                  onClick={() => completeTask(task.id)}
                  className="flex items-center gap-1 px-3 py-1 bg-green-100 text-green-700 rounded text-sm hover:bg-green-200 transition-colors"
                >
                  <CheckSquare size={16} /> Complete
                </button>
                
                <button
                  onClick={() => startEditing(task)}
                  className="flex items-center gap-1 px-3 py-1 bg-gray-100 text-gray-700 rounded text-sm hover:bg-gray-200 transition-colors"
                >
                  <Edit3 size={16} /> Edit
                </button>
                
                <button
                  onClick={() => startAddingSubTask(task)}
                  className="flex items-center gap-1 px-3 py-1 bg-purple-100 text-purple-700 rounded text-sm hover:bg-purple-200 transition-colors"
                >
                  <Plus size={16} /> Add Sub-task
                </button>
                
                <button
                  onClick={() => createJiraTicket(task)}
                  className="flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-700 rounded text-sm hover:bg-blue-200 transition-colors"
                >
                  <ExternalLink size={16} /> Create JIRA Ticket
                </button>
                
                <button
                  onClick={() => copyTaskToJira(task)}
                  className="flex items-center gap-1 px-3 py-1 bg-orange-100 text-orange-700 rounded text-sm hover:bg-orange-200 transition-colors"
                >
                  <ExternalLink size={16} /> Copy to Console
                </button>
                
                <button
                  onClick={() => deleteTask(task.id)}
                  className="flex items-center gap-1 px-3 py-1 bg-red-100 text-red-700 rounded text-sm hover:bg-red-200 transition-colors"
                >
                  <Trash2 size={16} /> Delete
                </button>
              </div>
            )}
            
            {/* Sub-task creation UI */}
            {addingSubTaskTo === task.id && (
              <div className="mt-4 p-3 bg-gray-50 rounded border border-gray-200">
                <div className="text-sm text-gray-600 mb-2 font-medium">
                  Adding sub-task to: "{task.text}"
                </div>
                <div className="flex gap-2">
                  <textarea
                    ref={subtaskInputRef}
                    value={subTaskTexts[task.id] || ''}
                    onChange={(e) => updateSubTaskText(task.id, e.target.value)}
                    placeholder="Enter sub-task description..."
                    className="flex-1 p-2 border border-gray-300 rounded resize-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    rows="2"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && e.ctrlKey) {
                        addSubTask(task);
                      }
                    }}
                  />
                  <div className="flex flex-col gap-1">
                    <button
                      onClick={() => addSubTask(task)}
                      className="px-3 py-1 bg-purple-600 text-white rounded hover:bg-purple-700 transition-colors flex items-center gap-1"
                    >
                      <Plus size={14} />
                      Add
                    </button>
                    <button
                      onClick={() => cancelAddingSubTask(task.id)}
                      className="px-3 py-1 bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors flex items-center gap-1"
                    >
                      <X size={14} />
                      Cancel
                    </button>
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-1">Press Ctrl+Enter to add quickly</p>
              </div>
            )}
          </>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto p-6">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Task Manager</h1>
          <p className="text-gray-600">Plan your day, track progress, and maintain an audit trail</p>
        </header>

        {/* Navigation Tabs */}
        <div className="mb-6 border-b border-gray-200">
          <nav className="flex space-x-8">
            {[
              { id: 'today', label: 'Today\'s Tasks', icon: Clock },
              { id: 'all', label: 'All Tasks', icon: Plus },
              { id: 'completed', label: 'Completed Tasks', icon: CheckSquare }
            ].map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`flex items-center gap-2 py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon size={18} />
                {label}
              </button>
            ))}
          </nav>
        </div>

        {/* Today's Tasks Tab */}
        {activeTab === 'today' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-gray-900">Today's Focus</h2>
                {completedTasks.filter(t => t.completedDate === new Date().toLocaleDateString()).length > 0 && (
                  <button
                    onClick={async () => {
                      const summary = await generateDailySummary(new Date().toLocaleDateString(), true);
                      setSummaryModal({ isOpen: true, content: summary, title: 'AI Summary for Today' });
                    }}
                    className="px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all flex items-center gap-2 shadow-sm"
                  >
                    <BarChart3 size={16} />
                    AI Summary for Today
                  </button>
                )}
              </div>
              
              {getTodaysTasks().length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Clock size={48} className="mx-auto mb-4 opacity-50" />
                  <p>No tasks selected for today</p>
                  <p className="text-sm">Go to "All Tasks" to add tasks to your daily plan</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {getTodaysTasks().map(task => (
                    <TaskItem key={task.id} task={task} />
                  ))}
                </div>
              )}
            </div>

            <div className="bg-blue-50 rounded-lg border border-blue-200 p-6">
              <h3 className="text-lg font-semibold text-blue-900 mb-3">Status Update</h3>
              <div className="bg-white rounded p-4 border">
                <pre className="whitespace-pre-wrap text-sm text-gray-800 font-mono">{generateStatusUpdate()}</pre>
              </div>
              <button
                onClick={() => navigator.clipboard.writeText(generateStatusUpdate())}
                className="mt-3 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
              >
                Copy to Clipboard
              </button>
            </div>
          </div>
        )}

        {/* All Tasks Tab */}
        {activeTab === 'all' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-gray-900">Add New Task</h2>
                <button
                  onClick={() => setShowBulkImport(!showBulkImport)}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
                >
                  <FileText size={16} />
                  {showBulkImport ? 'Single Task' : 'Bulk Import'}
                </button>
              </div>
              
              {!showBulkImport ? (
                <>
                  <div className="flex gap-3">
                    <textarea
                      value={newTask}
                      onChange={(e) => setNewTask(e.target.value)}
                      placeholder="Enter task description (supports markdown formatting)..."
                      className="flex-1 p-3 border border-gray-300 rounded resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      rows="3"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && e.ctrlKey) {
                          addTask();
                        }
                      }}
                    />
                    <button
                      onClick={addTask}
                      className="px-6 py-3 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors flex items-center gap-2"
                    >
                      <Plus size={20} />
                      Add Task
                    </button>
                  </div>
                  <p className="text-sm text-gray-500 mt-2">Press Ctrl+Enter to add quickly</p>
                </>
              ) : (
                <>
                  <div className="space-y-3">
                    <textarea
                      value={bulkTasks}
                      onChange={(e) => setBulkTasks(e.target.value)}
                      placeholder="Paste your hierarchical task list here:&#10;- Recapping the odie redesign sync&#10;    - List out questions asked from the meeting&#10;- Ei mysql proxy testing&#10;- Internal routing class&#10;- Espresso global index task&#10;    - Review features left&#10;    - Persistent chat tables creation&#10;    - Ramp plan"
                      className="w-full p-3 border border-gray-300 rounded resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      rows="8"
                    />
                    <div className="flex gap-3">
                      <button
                        onClick={addBulkTasks}
                        className="px-6 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors flex items-center gap-2"
                      >
                        <Plus size={16} />
                        Import All Tasks
                      </button>
                      <button
                        onClick={() => setBulkTasks('')}
                        className="px-4 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
                      >
                        Clear
                      </button>
                    </div>
                  </div>
                  <p className="text-sm text-gray-500 mt-2">
                    Supports: • - * bullets, 1. 2) numbered lists. Use 4 spaces for indentation to create sub-tasks.
                  </p>
                </>
              )}
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-gray-900">All Tasks ({tasks.length})</h2>
                
                {tasks.length > 0 && (
                  <div className="flex gap-2 items-center">
                    {selectedTasks.length > 0 && (
                      <span className="text-sm text-gray-600 mr-2">
                        {selectedTasks.length} selected
                      </span>
                    )}
                    
                    <button
                      onClick={selectedTasks.length === tasks.length ? deselectAllTasks : selectAllTasks}
                      className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
                    >
                      {selectedTasks.length === tasks.length ? 'Deselect All' : 'Select All'}
                    </button>
                    
                    {selectedTasks.length > 0 && (
                      <button
                        onClick={deleteSelectedTasks}
                        className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors flex items-center gap-1"
                      >
                        <Trash2 size={14} />
                        Delete Selected ({selectedTasks.length})
                      </button>
                    )}
                    
                    <button
                      onClick={deleteAllTasks}
                      className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700 transition-colors flex items-center gap-1"
                    >
                      <Trash2 size={14} />
                      Delete All
                    </button>
                  </div>
                )}
              </div>
              
              {tasks.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Plus size={48} className="mx-auto mb-4 opacity-50" />
                  <p>No tasks yet</p>
                  <p className="text-sm">Add your first task above to get started</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {getSortedTasks().map(task => (
                    <TaskItem key={task.id} task={task} showCheckbox={true} />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Completed Tasks Tab */}
        {activeTab === 'completed' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-gray-900">Search Completed Tasks</h2>
                <div className="flex gap-2">
                  {completedTasks.filter(t => t.completedDate === new Date().toLocaleDateString()).length > 0 && (
                    <button
                      onClick={async () => {
                        const summary = await generateDailySummary(new Date().toLocaleDateString(), true);
                        setSummaryModal({ isOpen: true, content: summary, title: 'Daily Summary' });
                      }}
                      className="px-3 py-1.5 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded hover:from-purple-700 hover:to-blue-700 transition-all flex items-center gap-2 text-sm"
                    >
                      <BarChart3 size={14} />
                      Today's Summary
                    </button>
                  )}
                  <button
                    onClick={async () => {
                      const summary = await generateWeeklySummary();
                      setSummaryModal({ isOpen: true, content: summary, title: 'Weekly Summary' });
                    }}
                    className="px-3 py-1.5 bg-gradient-to-r from-green-600 to-teal-600 text-white rounded hover:from-green-700 hover:to-teal-700 transition-all flex items-center gap-2 text-sm"
                  >
                    <BarChart3 size={14} />
                    Weekly Summary
                  </button>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="relative">
                  <Search size={20} className="absolute left-3 top-3 text-gray-400" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search completed tasks..."
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                
                <div className="relative">
                  <Filter size={20} className="absolute left-3 top-3 text-gray-400" />
                  <input
                    type="date"
                    value={dateFilter}
                    onChange={(e) => setDateFilter(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
            </div>

            <div className="bg-blue-50 rounded-lg shadow-sm border border-blue-200 p-6">
              <h2 className="text-xl font-semibold text-blue-900 mb-4 flex items-center gap-2">
                <BarChart3 size={20} />
                Task Summary
              </h2>
              
              <div className="space-y-4">
                <div className="flex gap-3 flex-wrap">
                  <button
                    onClick={async () => {
                      setDisplayedSummary({ content: 'Generating AI summary...', type: 'daily' });
                      const summary = await generateDailySummary(null, true);
                      setDisplayedSummary({ content: summary, type: 'daily' });
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                  >
                    <Calendar size={16} />
                    Today's Summary
                  </button>
                  
                  <button
                    onClick={async () => {
                      setDisplayedSummary({ content: 'Generating...', type: 'weekly' });
                      const summary = await generateWeeklySummary();
                      setDisplayedSummary({ content: summary, type: 'weekly' });
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
                  >
                    <BarChart3 size={16} />
                    This Week's Summary
                  </button>
                  
                  {dateFilter && (
                    <button
                      onClick={async () => {
                        setDisplayedSummary({ content: 'Generating AI summary...', type: 'custom' });
                        const [year, month, day] = dateFilter.split('-');
                        const targetDate = new Date(year, month - 1, day, 12, 0, 0).toLocaleDateString();
                        const summary = await generateDailySummary(targetDate, true);
                        setDisplayedSummary({ content: summary, type: 'custom' });
                      }}
                      className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 transition-colors"
                    >
                      <Calendar size={16} />
                      Summary for {dateFilter}
                    </button>
                  )}
                </div>
                
                {displayedSummary.content && (
                  <div className="mt-4 space-y-2">
                    <div className="bg-white rounded-lg p-4 border border-blue-200">
                      <pre className="whitespace-pre-wrap text-sm text-gray-800 font-sans">{displayedSummary.content}</pre>
                    </div>
                    <div className="flex justify-end">
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(displayedSummary.content);
                          alert('Summary copied to clipboard!');
                        }}
                        className="text-sm px-3 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
                      >
                        Copy to Clipboard
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                Completed Tasks ({getFilteredCompletedTasks().length})
              </h2>
              
              {getFilteredCompletedTasks().length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <CheckSquare size={48} className="mx-auto mb-4 opacity-50" />
                  <p>No completed tasks found</p>
                  {(searchTerm || dateFilter) && (
                    <p className="text-sm">Try adjusting your search filters</p>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[80vh] overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <div className="flex justify-between items-start">
                <h3 className="text-2xl font-bold text-gray-900">{summaryModal.title}</h3>
                <button
                  onClick={() => setSummaryModal({ isOpen: false, content: '', title: '' })}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
            </div>
            <div className="p-6 overflow-y-auto max-h-[60vh]">
              <div className="prose prose-sm max-w-none">
                {summaryModal.content.split('\n').map((line, i) => (
                  <p key={i} className="mb-2">{line}</p>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TaskManager;