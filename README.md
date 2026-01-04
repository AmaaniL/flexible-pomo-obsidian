## Flexible Pomo — Pomodoro Timer & Task Timeboxing for Obsidian

A flexible Pomodoro timer plugin for Obsidian that helps you manage work sessions, break intervals, task logging, and integrate timeboxing with other plugins (e.g., Day Planner).

---

##  Features

- Status bar Pomodoro timer with start/pause/stop controls  
- Stopwatch mode for manual timing  
- Custom duration support for Pomodoro and break intervals  
- Workbench: track multiple active notes and tasks  
- Automatic logging to daily notes or specified log files  
- Integration with your Day Planner via inline timeboxed tasks _(extended feature)_

---

##  Quick Start

1. Clone this repo into your vault:
    
    `.obsidian/plugins/flexible-pomo-obsidian/`
    
2. Run:
    
    `npm install npm run build`
    
3. Enable the plugin in **Settings → Community Plugins**.
    
4. Start a Pomodoro by clicking the clock icon or via command:
    
    - `Start Pomodoro`
        
    - `Start Custom Pomodoro`
        

---

##  Usage

###  Pomodoro & Stopwatch

- Click the status bar icon to start/pause.
    
- Default Pomodoro (e.g., 25 min) or custom durations.
    
- After a Pomodoro completes, choose to extend, start a break, or log early.
    
###  Workbench

Use the workbench to monitor multiple files during your session:

- **Link Active File**
    
- **Unlink File**
    
- **Save / Load Workbench**
    
- Sort and reorder tasks
    

###  Task Logging

By default, Pomodoro logs are appended to your daily note or a log file.

---

##  Timebox & Day Planner Integration

You can now write inline timeboxed tasks in your daily note like:

`- [ ] Write report 15m @09:30`

The plugin will parse this, schedule it, and export a time range to your **Day Planner** timeline automatically (idempotently). Make sure Day Planner plugin is installed & enabled.

---

##  Settings

- Custom Pomodoro duration
    
- Break intervals
    
- Auto-start next session
    
- Logging preferences
    
- Status bar display options
    

---

##  Installation

Clone, build, enable in Obsidian, and restart the app if needed.

---

##  Contributing

Pull requests are welcome! Please follow conventional commits:

`feat: add new feature fix: fix bug docs: documentation changes refactor: non-functional code cleanup`

---

##  License

MIT
