/**
 * Modern UI Enhancements for FSPro
 * This script adds interactive animations and effects without changing functionality
 */

document.addEventListener('DOMContentLoaded', function() {
    // Apply entrance animations to cards
    animateCards();
    
    // Add hover effects to buttons
    enhanceButtons();
    
    // Add animation to sidebar navigation
    enhanceSidebar();
    
    // Add animation to stat items
    enhanceStatItems();
    
    // Add animation to tables
    enhanceTables();
    
    // Add notification badge
    addNotificationBadge();
    
    // Add scroll animations
    initScrollAnimations();
});

/**
 * Apply entrance animations to cards with staggered delay
 */
function animateCards() {
    const cards = document.querySelectorAll('.card');
    
    cards.forEach((card, index) => {
        // Add animation classes with staggered delay
        setTimeout(() => {
            card.classList.add('fade-in');
            card.style.opacity = '1';
        }, 100 * index);
        
        // Add animation to card headers
        const header = card.querySelector('h2, h3');
        if (header) {
            header.classList.add('slide-in-left');
        }
    });
}

/**
 * Add hover effects and animations to buttons
 */
function enhanceButtons() {
    const buttons = document.querySelectorAll('.btn');
    
    buttons.forEach(button => {
        // Add ripple effect on click
        button.addEventListener('click', function(e) {
            const ripple = document.createElement('span');
            ripple.classList.add('btn-ripple');
            
            const rect = this.getBoundingClientRect();
            const size = Math.max(rect.width, rect.height);
            
            ripple.style.width = ripple.style.height = `${size}px`;
            ripple.style.left = `${e.clientX - rect.left - size/2}px`;
            ripple.style.top = `${e.clientY - rect.top - size/2}px`;
            
            this.appendChild(ripple);
            
            setTimeout(() => {
                ripple.remove();
            }, 600);
        });
    });
    
    // Add special effects to quick action buttons
    const quickActionBtns = document.querySelectorAll('.quick-actions .btn');
    quickActionBtns.forEach(btn => {
        const icon = btn.querySelector('i') || document.createElement('i');
        if (!btn.querySelector('i')) {
            // Add icon if not present
            if (btn.id === 'checkInBtn') icon.className = 'fas fa-sign-in-alt';
            else if (btn.id === 'checkOutBtn') icon.className = 'fas fa-sign-out-alt';
            else if (btn.id === 'addLateCheckInBtn') icon.className = 'fas fa-clock';
            else if (btn.id === 'requestHolidayBtn') icon.className = 'fas fa-calendar-alt';
            
            btn.prepend(icon);
            icon.style.marginRight = '8px';
        }
    });
}

/**
 * Enhance sidebar with animations and effects
 */
function enhanceSidebar() {
    const sidebarLinks = document.querySelectorAll('.sidebar-nav a');
    
    sidebarLinks.forEach((link, index) => {
        // Add staggered animation on page load
        setTimeout(() => {
            link.classList.add('slide-in-left');
        }, 50 * index);
        
        // Add hover animation
        link.addEventListener('mouseenter', function() {
            const icon = this.querySelector('i');
            if (icon) {
                icon.classList.add('fa-beat');
                setTimeout(() => {
                    icon.classList.remove('fa-beat');
                }, 500);
            }
        });
    });
    
    // Add glow effect to active link
    const activeLink = document.querySelector('.sidebar-nav a.active');
    if (activeLink) {
        activeLink.classList.add('pulse');
    }
}

/**
 * Enhance stat items with animations
 */
function enhanceStatItems() {
    const statItems = document.querySelectorAll('.stat-item');
    
    statItems.forEach((item, index) => {
        // Add staggered animation on page load
        setTimeout(() => {
            item.classList.add('slide-in-up');
        }, 100 * index);
        
        // Add counter animation to stat values
        const statValue = item.querySelector('.stat-value');
        if (statValue) {
            const finalValue = parseInt(statValue.textContent);
            if (!isNaN(finalValue)) {
                animateCounter(statValue, 0, finalValue, 1500);
            }
        }
    });
}

/**
 * Animate number counter
 */
function animateCounter(element, start, end, duration) {
    let startTimestamp = null;
    const step = (timestamp) => {
        if (!startTimestamp) startTimestamp = timestamp;
        const progress = Math.min((timestamp - startTimestamp) / duration, 1);
        const currentValue = Math.floor(progress * (end - start) + start);
        element.textContent = currentValue;
        
        if (progress < 1) {
            window.requestAnimationFrame(step);
        } else {
            element.textContent = end;
        }
    };
    window.requestAnimationFrame(step);
}

/**
 * Enhance tables with row animations
 */
function enhanceTables() {
    const tables = document.querySelectorAll('.table');
    
    tables.forEach(table => {
        const rows = table.querySelectorAll('tbody tr');
        
        rows.forEach((row, index) => {
            // Add staggered animation on page load
            setTimeout(() => {
                row.classList.add('fade-in');
                row.style.opacity = '1';
            }, 50 * index);
        });
    });
}

/**
 * Add notification badge to notification icon
 */
function addNotificationBadge() {
    const notificationHeaders = document.querySelectorAll('.card h3 i.fa-bell');
    
    notificationHeaders.forEach(icon => {
        const badge = document.createElement('span');
        badge.className = 'notification-badge pulse';
        
        // Get number of notifications
        const notificationItems = icon.closest('.card').querySelectorAll('.notification-item');
        const count = notificationItems.length;
        
        if (count > 0) {
            badge.textContent = count;
            icon.parentNode.style.position = 'relative';
            icon.parentNode.appendChild(badge);
        }
    });
}

/**
 * Initialize scroll animations
 */
function initScrollAnimations() {
    // Add scroll observer for animation on scroll
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('in-view');
                observer.unobserve(entry.target);
            }
        });
    }, {
        threshold: 0.1
    });
    
    // Observe all animatable elements
    document.querySelectorAll('.card, .table, .stat-item').forEach(el => {
        observer.observe(el);
    });
}

// Add CSS for dynamic elements
const style = document.createElement('style');
style.textContent = `
    .btn-ripple {
        position: absolute;
        border-radius: 50%;
        background-color: rgba(255, 255, 255, 0.3);
        transform: scale(0);
        animation: ripple 0.6s linear;
        pointer-events: none;
    }
    
    @keyframes ripple {
        to {
            transform: scale(4);
            opacity: 0;
        }
    }
    
    .notification-badge {
        position: absolute;
        top: -8px;
        right: -8px;
        background-color: #e74c3c;
        color: white;
        border-radius: 50%;
        width: 20px;
        height: 20px;
        font-size: 12px;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 2px 5px rgba(0,0,0,0.2);
    }
    
    .in-view {
        animation: fadeInUp 0.5s ease-out forwards;
    }
    
    @keyframes fadeInUp {
        from {
            opacity: 0;
            transform: translateY(20px);
        }
        to {
            opacity: 1;
            transform: translateY(0);
        }
    }
    
    /* Hide elements before animation */
    .card, .table tbody tr {
        opacity: 0;
    }
    
    /* FontAwesome animation classes */
    .fa-beat {
        animation: fa-beat 0.5s ease;
    }
    
    @keyframes fa-beat {
        0%, 100% {
            transform: scale(1);
        }
        50% {
            transform: scale(1.3);
        }
    }
`;

document.head.appendChild(style);
