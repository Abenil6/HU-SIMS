# HU Non-Boarding School Information Management System (HU-SIMS)

A comprehensive school information management system built for HU Non-Boarding School, enabling efficient management of students, teachers, parents, academic records, attendance, reports, and more.

## 🚀 Live Demo

- **Frontend**: https://hunb-sims.vercel.app
- **Backend**: https://hu-sims-backend.onrender.com

## ✨ Features

### User Management
- Multi-role authentication (System Admin, School Admin, Teacher, Student, Parent)
- Two-factor authentication (2FA) support
- Email verification system
- Password reset functionality
- User profile management

### Academic Management
- Student enrollment and records
- Teacher management
- Academic year and term management
- Grade and performance tracking
- Exam scheduling and management

### Attendance System
- Daily attendance tracking
- Absence alerts and notifications
- Attendance reports and analytics
- Parent notifications for absences

### Reporting System
- Academic performance reports
- Attendance reports
- Custom report generation
- Official report archiving
- Export functionality

### Communication
- Internal messaging system
- Announcement management
- Notification system
- Email notifications for important events

### Additional Features
- Material and resource management
- Certificate generation
- System logs and audit trails
- Data backup and recovery
- Responsive design for all devices

## 🛠 Tech Stack

### Frontend
- **Framework**: React 19 with TypeScript
- **Build Tool**: Vite
- **UI Components**: Material UI (MUI), Radix UI
- **Styling**: Tailwind CSS, Emotion
- **State Management**: Zustand
- **Forms**: React Hook Form with Zod validation
- **Data Fetching**: Axios, TanStack Query
- **Routing**: React Router DOM
- **Charts**: ApexCharts
- **Icons**: Lucide React, Material Icons
- **Animations**: Framer Motion
- **Notifications**: React Hot Toast

### Backend
- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MongoDB (MongoDB Atlas)
- **Authentication**: JWT (JSON Web Tokens)
- **Password Hashing**: bcryptjs
- **Email Service**: Nodemailer with Gmail SMTP
- **File Upload**: Multer
- **API Documentation**: Swagger UI
- **Testing**: Jest, Supertest

### Deployment
- **Frontend**: Vercel
- **Backend**: Render
- **Database**: MongoDB Atlas

## 📋 Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- MongoDB Atlas account
- Gmail account (for email services)

## 🔧 Installation

### 1. Clone the Repository

```bash
git clone https://github.com/Abenil6/HU-SIMS.git
cd HU-SIMS
```

### 2. Backend Setup

```bash
cd backend
npm install
```
# Frontend URL
FRONTEND_URL=http://localhost:5173
```

### 3. Frontend Setup

```bash
cd frontend
npm install
```
## 🚀 Running the Project

### Development Mode

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

- Frontend will be available at http://localhost:5173
- Backend API will be available at http://localhost:5001
- API Documentation available at http://localhost:5001/api-docs

### Production Mode

**Backend:**
```bash
cd backend
npm start
```

**Frontend:**
```bash
cd frontend
npm run build
npm run preview
```

## 📁 Project Structure

```
HU-SIMS/
├── backend/
│   ├── config/          # Database and configuration files
│   ├── controllers/     # Route controllers
│   ├── middleware/      # Custom middleware (auth, error handling)
│   ├── models/          # MongoDB models
│   ├── routes/          # API routes
│   ├── utils/           # Utility functions
│   ├── tests/           # Backend tests
│   ├── uploads/         # File upload directory
│   ├── server.js        # Server entry point
│   └── package.json
├── frontend/
│   ├── public/          # Static assets
│   ├── src/
│   │   ├── components/  # Reusable components
│   │   ├── lib/         # Utility functions
│   │   ├── pages/       # Page components
│   │   ├── services/    # API services
│   │   ├── stores/      # State management (Zustand)
│   │   ├── types/       # TypeScript types
│   │   └── main.tsx     # App entry point
│   ├── index.html
│   └── package.json
├── .gitignore
└── README.md
```


## 🧪 Testing

### Backend Tests

```bash
cd backend
npm test                # Run all tests
npm run test:watch      # Run tests in watch mode
npm run test:coverage   # Run tests with coverage
```

### Frontend Tests

```bash
cd frontend
npm run lint            # Run ESLint
```


## 📊 API Documentation

Once the backend is running, visit `/api-docs` to view the interactive Swagger documentation.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the ISC License.

## 👥 Authors

- **Abenezer** - Initial development

## 🙏 Acknowledgments

- Material UI for the component library
- Vercel for frontend hosting
- Render for backend hosting
- MongoDB Atlas for database hosting

## 📞 Support

For support, email abenilee740@gmail.com or open an issue in the repository.

## 🔒 Security Notes

- Use strong JWT secrets in production
- Enable 2FA for all admin accounts
- Regularly update dependencies
- Use environment-specific configurations
- Implement rate limiting for API endpoints
- Sanitize all user inputs

## 🗺 Roadmap

- [ ] Mobile app development
- [ ] Real-time chat functionality
- [ ] Advanced analytics dashboard
- [ ] Integration with payment gateways
- [ ] Multi-language support
- [ ] Offline mode support
