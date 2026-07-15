import React, { useEffect } from 'react';
import { X } from 'lucide-react';

const Modal = ({ isOpen, onClose, title, children }) => {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };

    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-dark-bg/80 backdrop-blur-sm transition-opacity duration-300"
        onClick={onClose}
      />

      {/* Modal Card */}
      <div className="bg-dark-card border border-dark-border/80 w-full max-w-lg rounded-3xl shadow-2xl relative z-10 overflow-hidden transform scale-100 transition-all duration-300 animate-[scaleUp_0.2s_ease-out]">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-dark-border/40">
          <h3 className="text-lg font-bold text-white tracking-wide">{title}</h3>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-xl border border-dark-border bg-dark-input text-dark-muted hover:text-white hover:bg-dark-border transition-all duration-150"
          >
            <X className="h-4.5 w-4.5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {children}
        </div>
      </div>
    </div>
  );
};

export default Modal;
