// AI Service for enhanced summaries and task analysis
const AI_ENABLED = process.env.REACT_APP_AI_ENABLED === 'true';
const CLAUDE_API_KEY = process.env.REACT_APP_CLAUDE_API_KEY;
const AI_MODEL = process.env.REACT_APP_AI_MODEL || 'claude-3-haiku-20240307';

class AIService {
  constructor() {
    // AI is enabled if the flag is true and we have a configured backend
    this.isEnabled = AI_ENABLED;
    console.log('AI Service initialized. Enabled:', this.isEnabled);
  }

  async generateEnhancedSummary(tasks, summaryType = 'daily', targetDate = null) {
    if (!this.isEnabled) {
      console.log('AI is not enabled, returning null');
      return null; // Fall back to basic summary
    }
    console.log('AI is enabled, generating enhanced summary...');

    try {
      const prompt = this.buildSummaryPrompt(tasks, summaryType, targetDate);
      const response = await this.callClaude(prompt);
      return response;
    } catch (error) {
      console.error('AI summary generation failed:', error);
      return null; // Fall back to basic summary
    }
  }

  buildSummaryPrompt(tasks, summaryType, targetDate) {
    const taskList = tasks.map(task => ({
      text: task.text,
      parentText: task.parentText,
      description: task.description,
      jiraTicket: task.jiraTicket,
      githubPr: task.githubPr,
      completedAt: task.completedAt,
      completedDate: task.completedDate
    }));

    const dateContext = targetDate || new Date().toLocaleDateString();
    const timeframe = summaryType === 'weekly' ? 'week' : 'day';
    
    // Collect all JIRA tickets and GitHub PRs
    const jiraTickets = tasks.filter(t => t.jiraTicket).map(t => t.jiraTicket);
    const githubPrs = tasks.filter(t => t.githubPr).map(t => t.githubPr);

    return `
You are a productivity assistant analyzing completed tasks. Generate an insightful summary that goes beyond just listing tasks.

COMPLETED TASKS (${timeframe} ending ${dateContext}):
${JSON.stringify(taskList, null, 2)}

Please provide:
1. **Key Accomplishments** - Major themes and achievements (use task descriptions for context)
2. **Productivity Insights** - Patterns, focus areas, or notable progress
3. **Task Analysis** - Breakdown by projects/categories
${jiraTickets.length > 0 ? '4. **JIRA Tickets** - List all associated JIRA tickets' : ''}
${githubPrs.length > 0 ? '5. **GitHub PRs** - List all associated pull requests' : ''}
6. **Recommendations** - Suggestions for future work or improvements

Format as a professional summary suitable for status updates or personal reflection. Be concise but insightful.
Use bullet points and clear sections. Aim for 150-200 words.

Focus on VALUE and IMPACT rather than just listing what was done. Use the description fields to understand the context and importance of each task.
`;
  }

  async callClaude(prompt) {
    console.log('Calling Claude API via backend proxy...');
    const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:3001';
    // Call our backend proxy instead of Claude API directly
    const response = await fetch(`${backendUrl}/api/claude/summary`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ prompt }),
    });

    console.log('Backend response status:', response.status);
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Backend error response:', errorText);
      throw new Error(`Backend API error: ${response.status}`);
    }

    const data = await response.json();
    console.log('Received summary from backend:', data.summary?.substring(0, 100) + '...');
    return data.summary;
  }

  // Alternative: Backend proxy approach
  async callAIProxy(prompt) {
    // Call your own backend endpoint that handles the AI API
    const response = await fetch('/api/ai/summary', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ prompt }),
    });

    if (!response.ok) {
      throw new Error('AI proxy error');
    }

    const data = await response.json();
    return data.summary;
  }
}

export const aiService = new AIService();