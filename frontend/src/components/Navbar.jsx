import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LayoutDashboard, History, PieChart, LogOut, Wallet } from 'lucide-react';

const Navbar = () => {
  const { user, logout } = useAuth();
  const location = useLocation();

  const navItems = [
    { path: '/', name: 'Dashboard', icon: LayoutDashboard },
    { path: '/history', name: 'History', icon: History },
    { path: '/analytics', name: 'Analytics', icon: PieChart },
  ];

  if (!user) return null;

  return (
    <nav className="bg-dark-card border-b border-dark-border sticky top-0 z-50 transition-all duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center">
            <Link to="/" className="flex items-center space-x-2 group">
              <div className="p-2 bg-gradient-to-tr from-accent-teal to-accent-violet rounded-xl shadow-md group-hover:scale-105 transition-transform duration-200">
                <Wallet className="h-5 w-5 text-dark-bg" />
              </div>
              <span className="font-bold text-xl tracking-wide bg-gradient-to-r from-white via-slate-100 to-accent-teal bg-clip-text text-transparent">
                RupeeControl
              </span>
            </Link>
          </div>

          {/* Navigation Links */}
          <div className="hidden md:flex items-center space-x-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                    isActive
                      ? 'bg-accent-teal/10 text-accent-teal border border-accent-teal/20'
                      : 'text-dark-muted hover:text-dark-text hover:bg-dark-border/45'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </div>

          {/* User Profile & Logout */}
          <div className="flex items-center space-x-4">
            <div className="hidden sm:flex flex-col text-right">
              <span className="text-sm font-semibold text-dark-text">{user.name}</span>
              <span className="text-xs text-dark-muted">{user.email}</span>
            </div>
            
            {/* Logout button */}
            <button
              onClick={logout}
              className="flex items-center justify-center p-2 rounded-xl border border-dark-border bg-dark-input text-dark-muted hover:text-accent-rose hover:bg-accent-rose/10 hover:border-accent-rose/25 transition-all duration-200"
              title="Logout"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Mobile Navigation bar at the bottom or inline */}
        <div className="md:hidden flex justify-around py-2 border-t border-dark-border/40">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex flex-col items-center space-x-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 ${
                  isActive
                    ? 'text-accent-teal'
                    : 'text-dark-muted hover:text-dark-text'
                }`}
              >
                <Icon className="h-5 w-5" />
                <span className="mt-0.5">{item.name}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
