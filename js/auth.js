// Import Firebase functions
import { loginUser, isLoggedIn, getUserRole } from './firebase-service.js';

// Function to show login message
function showLoginMessage(message, type = 'error') {
    const messageElement = document.getElementById('loginMessage');
    messageElement.textContent = message;
    messageElement.className = 'login-message';

    if (type) {
        messageElement.classList.add(type);
    }

    // Add animation
    messageElement.style.animation = 'none';
    setTimeout(() => {
        messageElement.style.animation = 'fadeIn 0.3s';
    }, 10);
}

// Function to validate email format
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

// Handle form submission
document.getElementById('loginForm').addEventListener('submit', async function (e) {
    e.preventDefault();

    const email = document.getElementById('username').value.trim(); // Using username field for email
    const password = document.getElementById('password').value;
    const loginButton = document.getElementById('loginButton');
    const buttonText = loginButton.querySelector('.button-text');
    const originalButtonText = buttonText.textContent;

    // Clear previous messages
    showLoginMessage('', '');

    // Validate inputs
    if (!email) {
        showLoginMessage('Please enter your email address');
        document.getElementById('username').focus();
        return;
    }

    if (!isValidEmail(email)) {
        showLoginMessage('Please enter a valid email address');
        document.getElementById('username').focus();
        return;
    }

    if (!password) {
        showLoginMessage('Please enter your password');
        document.getElementById('password').focus();
        return;
    }

    // Show loading indicator
    buttonText.textContent = 'Logging in...';
    loginButton.disabled = true;
    loginButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';

    try {
        // Attempt to login with Firebase
        const result = await loginUser(email, password);

        if (result.success) {
            console.log("Login successful, user role:", result.user.role);

            // Show success message
            showLoginMessage('Login successful! Redirecting...', 'success');

            // Redirect based on role after a short delay
            setTimeout(() => {
                if (result.user.role === 'faculty') {
                    window.location.href = 'faculty/dashboard.html';
                } else if (result.user.role === 'admin') {
                    window.location.href = 'admin/dashboard.html';
                } else {
                    // Default to faculty dashboard for other roles
                    window.location.href = 'faculty/dashboard.html';
                }
            }, 1000);
        } else {
            // Show error message
            showLoginMessage(result.error || 'Login failed. Please check your credentials.');
            loginButton.disabled = false;
            loginButton.innerHTML = `<span class="button-text">${originalButtonText}</span><i class="fas fa-arrow-right"></i>`;
        }
    } catch (error) {
        console.error('Login error:', error);
        showLoginMessage('An error occurred during login. Please try again.');
        loginButton.disabled = false;
        loginButton.innerHTML = `<span class="button-text">${originalButtonText}</span><i class="fas fa-arrow-right"></i>`;
    }
});

// Check if user is already logged in
window.addEventListener('load', function () {
    // Add animation to the login form
    document.querySelector('.login-wrapper').classList.add('fade-in');

    // Pre-fill inputs if they have values (for browser autofill)
    const inputs = document.querySelectorAll('.input-group input');
    inputs.forEach(input => {
        if (input.value) {
            input.parentElement.classList.add('input-focused');
        }
    });

    // Check if user is already logged in
    if (isLoggedIn()) {
        const role = getUserRole();
        if (role === 'faculty') {
            window.location.href = 'faculty/dashboard.html';
        } else if (role === 'admin') {
            window.location.href = 'admin/dashboard.html';
        }
    }
});