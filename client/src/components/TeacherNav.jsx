import React from 'react';
import {
  LayoutDashboard,
  Users,
  AlertTriangle,
  BarChart3,
  Trophy,
  LogOut,
  ShieldCheck,
  ClipboardList,
  UsersRound,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';


const items = [
  {
    id: 'overview',
    icon: LayoutDashboard,
    label: 'Overview',
  },
  {
    id: 'students',
    icon: Users,
    label: 'Adventurers',
  },
  {
    id: 'attention',
    icon: AlertTriangle,
    label: 'Need Attention',
  },
  {
    id: 'analytics',
    icon: BarChart3,
    label: 'Analytics',
  },
  {
    id: 'leaderboard',
    icon: Trophy,
    label: 'Leaderboard',
  },
  {
    id: 'quizzes',
    icon: ClipboardList,
    label: 'Quiz Maker',
  },
  {
    id: 'classes',
    label: 'Classes',
    icon: UsersRound
  }
];

export default function TeacherNav({ page, setPage }) {
  const { user, logout } = useAuth();

  return (
    <aside className="teacher-nav">
      <div className="teacher-brand">
        <div className="teacher-logo">
          <ShieldCheck size={28} strokeWidth={2.2} />
          <span>CodeQuest</span>
        </div>

        <small>TEACHER PORTAL</small>
      </div>

      <div className="teacher-links">
        {items.map((item) => {
          const Icon = item.icon;

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setPage(item.id)}
              className={page === item.id ? 'active' : ''}
            >
              <Icon size={20} strokeWidth={2} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>

      <div className="teacher-user">
        <div className="teacher-user-info">
          <div className="teacher-avatar">
            {user?.name?.charAt(0)?.toUpperCase() || 'T'}
          </div>

          <div>
            <b>{user?.name || 'Teacher'}</b>
            <small>Instructor</small>
          </div>
        </div>

        <button
          type="button"
          className="teacher-logout"
          onClick={logout}
        >
          <LogOut size={18} />
          <span>Log out</span>
        </button>
      </div>
    </aside>
  );
}
