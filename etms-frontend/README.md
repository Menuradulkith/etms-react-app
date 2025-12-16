# Employee Task Management System (ETMS) - React Web Application

## 🎯 Project Overview

This is a **modern web-based conversion** of the Harischandra Mills Employee Task Management System from Java Swing to React. The application provides a comprehensive task management platform with role-based access for Admin, Manager, and Staff users.

## ✨ Features

### 🔐 Authentication
- Role-based login (Admin, Manager, Staff)
- Protected routes with authentication
- Session management

### 👨‍💼 Admin Features
- Dashboard overview with statistics
- Create and assign tasks to managers
- User management (Add/Edit/Delete users)
- View all tasks with filtering
- Generate reports
- Comprehensive sidebar navigation

### 👔 Manager Features
- View assigned tasks from admin
- Create subtasks for staff members
- Track task completion
- Dashboard with task statistics

### 👷 Staff Features
- View assigned tasks
- Update task status
- Track completed tasks
- Simple dashboard interface

## 🚀 Getting Started

### Prerequisites
- **Node.js** (v16 or higher)
- **npm** or **yarn** package manager

### Installation

1. **Navigate to the project directory:**
   ```powershell
   cd "c:\Users\medulk\Downloads\Harischandra Mills ETMS\etms-react-app"
   ```

2. **Install dependencies:**
   ```powershell
   npm install
   ```

3. **Start the development server:**
   ```powershell
   npm run dev
   ```

4. **Open your browser:**
   The application will automatically open at `http://localhost:3000`

## 🎨 UI/UX Improvements from Java Swing

### Design Enhancements
- **Modern gradient backgrounds** instead of flat colors
- **Smooth animations and transitions** on all interactions
- **Responsive design** that works on desktop, tablet, and mobile
- **Card-based layouts** for better content organization
- **Intuitive icons** using Lucide React icon library
- **Hover effects** and visual feedback on all interactive elements

### Color Scheme
- **Primary:** Teal/Cyan (`#069a9a`) - Professional and calming
- **Secondary:** Purple gradient - Modern and elegant
- **Accent:** Yellow (`#f7cf31`) - Attention-grabbing for actions
- **Status Colors:** 
  - Success: Green
  - Warning: Yellow
  - Danger: Red
  - Info: Blue

### Component Structure
```
src/
├── components/
│   ├── Login.jsx                 # Login page with role selection
│   ├── ProtectedRoute.jsx        # Route protection HOC
│   ├── Admin/
│   │   ├── AdminDashboard.jsx    # Admin main layout with sidebar
│   │   ├── DashboardOverview.jsx # Statistics and recent activity
│   │   ├── CreateTask.jsx        # Task creation form
│   │   ├── AllTasks.jsx          # Task listing with actions
│   │   ├── UserManagement.jsx    # User CRUD operations
│   │   └── Reports.jsx           # Report generation
│   ├── Manager/
│   │   └── ManagerDashboard.jsx  # Manager interface
│   └── Staff/
│       └── StaffDashboard.jsx    # Staff interface
├── context/
│   └── AuthContext.jsx           # Authentication state management
├── App.jsx                       # Main app with routing
├── main.jsx                      # Entry point
└── index.css                     # Global styles
```

## 🔑 Demo Credentials

You can login with any credentials using these roles:

### Admin
- Username: `admin`
- Password: `admin`
- Role: `Admin`

### Manager
- Username: `manager`
- Password: `manager`
- Role: `Manager`

### Staff
- Username: `staff`
- Password: `staff`
- Role: `Staff`

*Note: This is a demo app. In production, connect to a real authentication backend.*

## 📦 Dependencies

### Core
- **React 18** - UI library
- **React Router DOM 6** - Client-side routing
- **Vite** - Build tool and dev server

### UI Components
- **Lucide React** - Beautiful icon library
- **React DatePicker** - Date selection component
- **date-fns** - Date formatting utilities

## 🛠️ Available Scripts

```powershell
# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## 🎯 Key Differences from Java Swing

| Feature | Java Swing | React Web |
|---------|-----------|-----------|
| Platform | Desktop only | Cross-platform (Web) |
| UI Framework | AWT/Swing | React Components |
| Styling | Java Look & Feel | Modern CSS with animations |
| State Management | Class-based | React Hooks & Context |
| Responsiveness | Fixed window size | Fully responsive |
| Accessibility | Limited | Enhanced with ARIA |
| Performance | Desktop native | Fast virtual DOM |
| Deployment | .jar file | Web hosting |

## 🚀 Production Deployment

### Build for production:
```powershell
npm run build
```

This creates an optimized build in the `dist` folder that can be deployed to:
- **Netlify**
- **Vercel**
- **AWS S3 + CloudFront**
- **GitHub Pages**
- Any static hosting service

## 🔮 Future Enhancements

- [ ] Backend API integration (Node.js/Express or Spring Boot)
- [ ] Database connectivity (PostgreSQL/MongoDB)
- [ ] Real-time updates with WebSocket
- [ ] File upload functionality
- [ ] Advanced filtering and search
- [ ] Email notifications
- [ ] Dark mode toggle
- [ ] Internationalization (i18n)
- [ ] PDF report generation
- [ ] Calendar view for tasks
- [ ] Drag-and-drop task prioritization

## 📱 Browser Support

- ✅ Chrome (latest)
- ✅ Firefox (latest)
- ✅ Safari (latest)
- ✅ Edge (latest)

## 📄 License

This project is a conversion of the Harischandra Mills ETMS system for educational purposes.

## 🤝 Contributing

Feel free to fork this project and submit pull requests for improvements!

---

**Built with ❤️ using React and modern web technologies**
