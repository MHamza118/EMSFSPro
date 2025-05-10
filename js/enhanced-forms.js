/**
 * Enhanced Forms and Modals JavaScript
 * This script adds interactive animations and effects to forms and modals without changing functionality
 */

document.addEventListener('DOMContentLoaded', function() {
    // Enhance login page
    enhanceLoginPage();
    
    // Enhance form inputs
    enhanceFormInputs();
    
    // Enhance buttons
    enhanceButtons();
    
    // Enhance modals
    enhanceModals();
    
    // Add particle background to login page
    if (document.querySelector('.login-container')) {
        createParticleBackground();
    }
});

/**
 * Enhance the login page with interactive effects
 */
function enhanceLoginPage() {
    const loginContainer = document.querySelector('.login-container');
    if (!loginContainer) return;
    
    // Add 3D tilt effect to login wrapper
    const loginWrapper = document.querySelector('.login-wrapper');
    if (loginWrapper) {
        loginWrapper.addEventListener('mousemove', function(e) {
            const rect = this.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            
            const xPercent = (x / rect.width - 0.5) * 2; // -1 to 1
            const yPercent = (y / rect.height - 0.5) * 2; // -1 to 1
            
            // Apply subtle rotation
            this.style.transform = `perspective(1000px) rotateY(${xPercent * 3}deg) rotateX(${yPercent * -3}deg) translateZ(10px)`;
        });
        
        loginWrapper.addEventListener('mouseleave', function() {
            this.style.transform = 'perspective(1000px) rotateY(0) rotateX(0) translateZ(0)';
        });
    }
    
    // Add interactive effect to logo
    const logoText = document.querySelector('.logo-text');
    if (logoText) {
        logoText.addEventListener('mouseover', function() {
            this.style.transform = 'scale(1.05)';
            this.style.textShadow = '0 10px 20px rgba(0, 0, 0, 0.4)';
        });
        
        logoText.addEventListener('mouseleave', function() {
            this.style.transform = 'scale(1)';
            this.style.textShadow = '0 5px 15px rgba(0, 0, 0, 0.3)';
        });
    }
}

/**
 * Enhance form inputs with interactive effects
 */
function enhanceFormInputs() {
    // Add floating label effect to all inputs
    const inputs = document.querySelectorAll('.form-group input, .form-group textarea, .form-group select, .input-group input');
    
    inputs.forEach(input => {
        // Skip if already enhanced
        if (input.classList.contains('enhanced')) return;
        
        input.classList.add('enhanced');
        
        // Add focus effects
        input.addEventListener('focus', function() {
            this.parentElement.classList.add('input-focused');
            
            // Add subtle scale effect
            this.style.transform = 'scale(1.01)';
        });
        
        input.addEventListener('blur', function() {
            if (!this.value) {
                this.parentElement.classList.remove('input-focused');
            }
            
            // Remove scale effect
            this.style.transform = 'scale(1)';
        });
        
        // If input already has value, add focused class
        if (input.value) {
            input.parentElement.classList.add('input-focused');
        }
        
        // Add typing effect
        input.addEventListener('input', function() {
            // Add subtle pulse animation to the input highlight
            const highlight = this.parentElement.querySelector('.input-highlight');
            if (highlight) {
                highlight.style.animation = 'none';
                setTimeout(() => {
                    highlight.style.animation = 'pulse 0.5s';
                }, 10);
            }
        });
    });
    
    // Add special effects to role selector
    const roleOptions = document.querySelectorAll('.role-option input[type="radio"]');
    roleOptions.forEach(radio => {
        radio.addEventListener('change', function() {
            // Add transition effect to all labels
            document.querySelectorAll('.role-option label').forEach(label => {
                label.style.transition = 'all 0.3s ease';
            });
            
            // Add pulse animation to selected label
            const label = this.nextElementSibling;
            if (label) {
                label.style.animation = 'none';
                setTimeout(() => {
                    label.style.animation = 'pulse 0.5s';
                }, 10);
            }
        });
    });
}

/**
 * Enhance buttons with interactive effects
 */
function enhanceButtons() {
    const buttons = document.querySelectorAll('.btn, button');
    
    buttons.forEach(button => {
        // Skip if already enhanced
        if (button.classList.contains('enhanced')) return;
        
        button.classList.add('enhanced');
        
        // Add ripple effect
        button.addEventListener('click', function(e) {
            const rect = this.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            
            const ripple = document.createElement('span');
            ripple.classList.add('ripple');
            ripple.style.left = `${x}px`;
            ripple.style.top = `${y}px`;
            
            this.appendChild(ripple);
            
            setTimeout(() => {
                ripple.remove();
            }, 600);
        });
        
        // Add hover effect
        button.addEventListener('mouseenter', function() {
            this.style.transform = 'translateY(-2px)';
        });
        
        button.addEventListener('mouseleave', function() {
            this.style.transform = 'translateY(0)';
        });
    });
    
    // Special enhancement for login button
    const loginButton = document.getElementById('loginButton');
    if (loginButton) {
        loginButton.addEventListener('mouseenter', function() {
            const icon = this.querySelector('i');
            if (icon) {
                icon.style.animation = 'none';
                setTimeout(() => {
                    icon.style.animation = 'fadeInRight 0.5s forwards';
                }, 10);
            }
        });
    }
}

/**
 * Enhance modals with interactive effects
 */
function enhanceModals() {
    const modals = document.querySelectorAll('.modal, .remarks-modal');
    
    modals.forEach(modal => {
        // Skip if already enhanced
        if (modal.classList.contains('enhanced')) return;
        
        modal.classList.add('enhanced');
        
        // Add open animation
        const originalDisplay = modal.style.display;
        
        // Override the display property setter
        Object.defineProperty(modal.style, 'display', {
            set: function(value) {
                if (value === 'block') {
                    this.cssText = this.cssText.replace(/display:.*?;/, '') + 'display: block;';
                    modal.classList.add('modal-open');
                    
                    // Add entrance animation to modal content
                    const modalContent = modal.querySelector('.modal-content, .remarks-modal-content');
                    if (modalContent) {
                        modalContent.style.animation = 'none';
                        setTimeout(() => {
                            modalContent.style.animation = 'modalSlideIn 0.4s cubic-bezier(0.19, 1, 0.22, 1)';
                        }, 10);
                    }
                } else {
                    this.cssText = this.cssText.replace(/display:.*?;/, '') + 'display: none;';
                    modal.classList.remove('modal-open');
                }
            },
            get: function() {
                return this.cssText.includes('display: block') ? 'block' : 'none';
            }
        });
        
        // Add close animation
        const closeButtons = modal.querySelectorAll('.close-modal, [data-dismiss="modal"]');
        closeButtons.forEach(button => {
            button.addEventListener('click', function() {
                modal.classList.add('modal-closing');
                
                // Add exit animation to modal content
                const modalContent = modal.querySelector('.modal-content, .remarks-modal-content');
                if (modalContent) {
                    modalContent.style.animation = 'modalSlideOut 0.3s cubic-bezier(0.19, 1, 0.22, 1)';
                }
                
                setTimeout(() => {
                    modal.style.display = 'none';
                    modal.classList.remove('modal-closing');
                }, 300);
            });
        });
    });
}

/**
 * Create particle background for login page
 */
function createParticleBackground() {
    const loginContainer = document.querySelector('.login-container');
    if (!loginContainer) return;
    
    // Create canvas element
    const canvas = document.createElement('canvas');
    canvas.id = 'particles-canvas';
    canvas.style.position = 'absolute';
    canvas.style.top = '0';
    canvas.style.left = '0';
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.zIndex = '-1';
    
    loginContainer.appendChild(canvas);
    
    // Set canvas size
    canvas.width = loginContainer.offsetWidth;
    canvas.height = loginContainer.offsetHeight;
    
    // Initialize particles
    const ctx = canvas.getContext('2d');
    const particles = [];
    
    for (let i = 0; i < 50; i++) {
        particles.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            radius: Math.random() * 3 + 1,
            color: `rgba(52, 152, 219, ${Math.random() * 0.5 + 0.1})`,
            speedX: Math.random() * 0.5 - 0.25,
            speedY: Math.random() * 0.5 - 0.25
        });
    }
    
    // Animation loop
    function animate() {
        requestAnimationFrame(animate);
        
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        particles.forEach(particle => {
            // Move particle
            particle.x += particle.speedX;
            particle.y += particle.speedY;
            
            // Bounce off edges
            if (particle.x < 0 || particle.x > canvas.width) {
                particle.speedX *= -1;
            }
            
            if (particle.y < 0 || particle.y > canvas.height) {
                particle.speedY *= -1;
            }
            
            // Draw particle
            ctx.beginPath();
            ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
            ctx.fillStyle = particle.color;
            ctx.fill();
        });
        
        // Draw connections
        ctx.strokeStyle = 'rgba(52, 152, 219, 0.1)';
        ctx.lineWidth = 0.5;
        
        for (let i = 0; i < particles.length; i++) {
            for (let j = i + 1; j < particles.length; j++) {
                const dx = particles[i].x - particles[j].x;
                const dy = particles[i].y - particles[j].y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                if (distance < 100) {
                    ctx.beginPath();
                    ctx.moveTo(particles[i].x, particles[i].y);
                    ctx.lineTo(particles[j].x, particles[j].y);
                    ctx.stroke();
                }
            }
        }
    }
    
    animate();
    
    // Resize canvas on window resize
    window.addEventListener('resize', function() {
        canvas.width = loginContainer.offsetWidth;
        canvas.height = loginContainer.offsetHeight;
    });
}

// Add CSS for dynamic elements
const style = document.createElement('style');
style.textContent = `
    .ripple {
        position: absolute;
        background: rgba(255, 255, 255, 0.3);
        border-radius: 50%;
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
    
    @keyframes fadeInRight {
        from {
            opacity: 0;
            transform: translateX(-20px);
        }
        to {
            opacity: 1;
            transform: translateX(0);
        }
    }
    
    @keyframes modalSlideOut {
        from {
            opacity: 1;
            transform: translate(-50%, -50%);
        }
        to {
            opacity: 0;
            transform: translate(-50%, -40%);
        }
    }
    
    .modal-open {
        animation: fadeIn 0.3s ease-out;
    }
    
    @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
    }
`;

document.head.appendChild(style);
