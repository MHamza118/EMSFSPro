import React from 'react';
import { X, FileText, MessageSquare, Eye } from 'lucide-react';

const TextModal = ({ 
  isOpen, 
  onClose, 
  title, 
  content, 
  type = 'text', // 'text', 'remarks', 'details'
  employeeName = '',
  date = '',
  time = ''
}) => {
  if (!isOpen) return null;

  const getIcon = () => {
    switch (type) {
      case 'remarks':
        return <MessageSquare size={24} style={{ color: '#3498db' }} />;
      case 'details':
        return <FileText size={24} style={{ color: '#27ae60' }} />;
      default:
        return <Eye size={24} style={{ color: '#666' }} />;
    }
  };

  const getModalTitle = () => {
    if (title) return title;
    
    switch (type) {
      case 'remarks':
        return 'Admin Remarks';
      case 'details':
        return 'Task Details';
      default:
        return 'View Details';
    }
  };

  return (
    <div 
      className="modal-overlay"
      onClick={onClose}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1000,
        padding: '20px'
      }}
    >
      <div 
        className="modal-content"
        onClick={e => e.stopPropagation()}
        style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          width: '100%',
          maxWidth: '600px',
          maxHeight: '80vh',
          overflow: 'hidden',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.15)',
          animation: 'modalSlideIn 0.3s ease-out'
        }}
      >
        {/* Modal Header */}
        <div 
          className="modal-header"
          style={{
            padding: '24px 24px 0 24px',
            borderBottom: '1px solid #eee',
            marginBottom: '0'
          }}
        >
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'flex-start',
            marginBottom: '20px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
              {getIcon()}
              <div>
                <h3 style={{ 
                  margin: 0, 
                  color: '#333', 
                  fontSize: '18px',
                  fontWeight: '600'
                }}>
                  {getModalTitle()}
                </h3>
                {employeeName && (
                  <p style={{ 
                    margin: '4px 0 0 0', 
                    color: '#666', 
                    fontSize: '14px' 
                  }}>
                    {employeeName}
                    {date && ` • ${date}`}
                    {time && ` • ${time}`}
                  </p>
                )}
              </div>
            </div>
            <button 
              className="modal-close"
              onClick={onClose}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: '#666',
                padding: '8px',
                borderRadius: '6px',
                transition: 'background-color 0.2s',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
              onMouseEnter={e => e.target.style.backgroundColor = '#f5f5f5'}
              onMouseLeave={e => e.target.style.backgroundColor = 'transparent'}
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div 
          className="modal-body"
          style={{
            padding: '24px',
            overflowY: 'auto',
            maxHeight: 'calc(80vh - 120px)'
          }}
        >
          <div style={{
            backgroundColor: '#f8f9fa',
            border: '1px solid #e9ecef',
            borderRadius: '8px',
            padding: '16px',
            minHeight: '120px',
            lineHeight: '1.6',
            fontSize: '14px',
            color: '#333',
            whiteSpace: 'pre-wrap',
            wordWrap: 'break-word',
            fontFamily: 'inherit'
          }}>
            {content || (
              <span style={{ 
                color: '#999', 
                fontStyle: 'italic' 
              }}>
                No {type === 'remarks' ? 'remarks' : 'content'} available
              </span>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div style={{
          padding: '16px 24px 24px 24px',
          borderTop: '1px solid #eee',
          display: 'flex',
          justifyContent: 'flex-end'
        }}>
          <button 
            onClick={onClose}
            className="btn btn-secondary"
            style={{
              padding: '10px 20px',
              fontSize: '14px',
              fontWeight: '500'
            }}
          >
            Close
          </button>
        </div>
      </div>

      <style jsx>{`
        @keyframes modalSlideIn {
          from {
            opacity: 0;
            transform: translateY(-20px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
      `}</style>
    </div>
  );
};

export default TextModal;
