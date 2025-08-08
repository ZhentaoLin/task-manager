# Task Manager

A modern, feature-rich task management application built with React that helps you organize, prioritize, and track your daily work with AI-powered summaries and integrations.

## ✨ Features

### Core Task Management
- **Hierarchical Tasks**: Create tasks with sub-tasks for better organization
- **Today's Focus**: Select specific tasks to focus on today
- **Daily Highlight**: Mark one task as your main priority for the day
- **Bulk Import**: Import multiple tasks at once with automatic hierarchy detection
- **Smart Search**: Search across all tasks with real-time filtering

### Advanced Features
- **AI-Powered Summaries**: Generate intelligent daily and weekly summaries using Claude AI
- **JIRA Integration**: Create JIRA tickets directly from tasks or copy formatted payloads
- **GitHub Integration**: Link tasks to pull requests for better development tracking
- **Rich Task Details**: Add descriptions, JIRA tickets, and GitHub PR links to tasks
- **Keyboard Shortcuts**: Navigate efficiently with keyboard commands

### Data Persistence
- **Supabase Integration**: Optional cloud database for multi-device sync
- **Local Storage Fallback**: Works offline with browser storage
- **Automatic Migration**: Seamlessly migrate from local to cloud storage

## 🛠️ Tech Stack

- **Frontend**: React 19, Tailwind CSS
- **Icons**: Lucide React
- **Database**: Supabase (PostgreSQL) with local storage fallback
- **AI Integration**: Claude API (via backend proxy)
- **Backend**: Node.js/Express (for AI proxy)
- **Deployment**: Vercel (frontend), Render (backend)

## 🚀 Getting Started

### Prerequisites
- Node.js 16+ and npm
- (Optional) Supabase account for cloud storage
- (Optional) Claude API key for AI summaries

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/task-manager.git
cd task-manager
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
Create a `.env` file in the root directory:
```env
# Frontend Environment Variables
REACT_APP_USE_DATABASE=true
REACT_APP_SUPABASE_URL=your_supabase_url_here
REACT_APP_SUPABASE_ANON_KEY=your_supabase_anon_key_here
REACT_APP_AI_ENABLED=true
REACT_APP_BACKEND_URL=http://localhost:3001
```

4. (Optional) Set up the backend for AI summaries:
```bash
cd backend
npm install
```

Create `backend/.env`:
```env
CLAUDE_API_KEY=your_claude_api_key_here
PORT=3001
```

### Running the Application

#### Development Mode
```bash
# Terminal 1 - Backend (optional, for AI summaries)
cd backend
npm start

# Terminal 2 - Frontend
npm start
```

The app will open at [http://localhost:3000](http://localhost:3000)

#### Production Build
```bash
npm run build
```

## 📚 Usage Guide

### Keyboard Shortcuts
- `1` - Switch to Today tab
- `2` - Switch to All Tasks tab
- `3` - Switch to Completed tab
- `/` - Focus search box
- `n` - Create new task (in All Tasks tab)
- `h` - Set/unset highlight for selected task (in Today tab)

### Task Management

#### Creating Tasks
1. **Single Task**: Type in the input field and press Enter
2. **Bulk Import**: Click "Bulk" and paste multiple tasks with indentation for hierarchy
3. **Sub-tasks**: Click the menu (⋮) on any task and select "Add sub-task"

#### Task Organization
- **Add to Today**: Click the calendar icon to add tasks to today's focus
- **Set Highlight**: Mark your most important task with the star icon
- **Edit Tasks**: Click on any task text to edit inline
- **Add Details**: Include descriptions, JIRA tickets, and GitHub PRs

#### Tracking Progress
- **Complete Tasks**: Click the checkmark to mark tasks as done
- **View Completed**: Switch to the Completed tab to see your history
- **Generate Summaries**: Use AI to create daily/weekly summaries for status updates

### JIRA Integration
1. Click the menu (⋮) on any task
2. Select "Create JIRA ticket" to attempt direct creation
3. Or select "Copy JIRA payload" to get a console command for manual creation

## 🗂️ Project Structure

```
task-manager/
├── src/
│   ├── App.js                 # Main application component
│   ├── services/
│   │   ├── aiService.js       # AI integration service
│   │   └── databaseService.js # Database operations
│   └── test/                  # Test files
├── backend/
│   └── server.js              # Express server for AI proxy
├── public/                    # Static assets
└── supabase-setup.sql        # Database schema
```

## 🗄️ Database Setup

### Supabase Configuration

1. Create a new Supabase project at [supabase.com](https://supabase.com)

2. Run the setup SQL in your Supabase SQL editor:
```sql
-- See supabase-setup.sql for the complete schema
```

3. Get your project URL and anon key from Settings → API

4. Update your `.env` file with the credentials

### Database Schema
- `tasks` - Active tasks with hierarchy support
- `completed_tasks` - Completed task history
- `selected_for_today` - Tasks marked for today
- `daily_highlights` - Today's highlighted task

## 🚢 Deployment

### Quick Deploy

#### Frontend (Vercel)
```bash
vercel
```

#### Backend (Render)
1. Push code to GitHub
2. Connect repository on [render.com](https://render.com)
3. Deploy as Web Service with environment variables

See [DEPLOYMENT.md](DEPLOYMENT.md) for detailed instructions.

## 🧪 Testing

Run the test suite:
```bash
npm test
```

For coverage report:
```bash
npm test -- --coverage
```

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

### Development Guidelines
- Follow the existing code style
- Add tests for new features
- Update documentation as needed
- Ensure all tests pass before submitting PR

## 📝 Environment Variables Reference

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `REACT_APP_USE_DATABASE` | Enable Supabase integration | No | `false` |
| `REACT_APP_SUPABASE_URL` | Supabase project URL | If database enabled | - |
| `REACT_APP_SUPABASE_ANON_KEY` | Supabase anonymous key | If database enabled | - |
| `REACT_APP_AI_ENABLED` | Enable AI summaries | No | `false` |
| `REACT_APP_BACKEND_URL` | Backend server URL | If AI enabled | `http://localhost:3001` |
| `CLAUDE_API_KEY` | Claude API key (backend) | If AI enabled | - |

## 🐛 Troubleshooting

### Common Issues

**AI Summaries not working:**
- Ensure backend server is running
- Check CLAUDE_API_KEY is set correctly
- Verify CORS settings in backend

**Database not syncing:**
- Check Supabase credentials
- Ensure tables are created with the setup SQL
- Check browser console for errors

**Tasks not persisting:**
- If database is disabled, check browser local storage
- Ensure cookies/storage is not blocked

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built with [Create React App](https://create-react-app.dev/)
- Icons by [Lucide](https://lucide.dev/)
- Database by [Supabase](https://supabase.com/)
- AI powered by [Claude](https://www.anthropic.com/)

## 📮 Support

For issues, questions, or suggestions, please open an issue on GitHub.

---

Made with ❤️ for better productivity