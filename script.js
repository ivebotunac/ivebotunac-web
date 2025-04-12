// Wait for the DOM to be fully loaded
document.addEventListener('DOMContentLoaded', function() {
    // Email copy functionality
    const emailButton = document.querySelector('.copy-email');
    if (emailButton) {
        emailButton.addEventListener('click', function(e) {
            e.preventDefault();
            const email = 'removed@example.invalid'; // Replace with your actual email
            navigator.clipboard.writeText(email)
                .then(() => {
                    // Change button text temporarily to show success
                    const originalText = emailButton.innerHTML;
                    emailButton.innerHTML = '<i class="fa-solid fa-check me-2"></i> Copied!';
                    
                    // Add success class
                    emailButton.classList.add('btn-success');
                    emailButton.classList.remove('btn-outline-dark');
                    
                    // Revert back after 2 seconds
                    setTimeout(() => {
                        emailButton.innerHTML = originalText;
                        emailButton.classList.remove('btn-success');
                        emailButton.classList.add('btn-outline-dark');
                    }, 2000);
                })
                .catch(err => {
                    console.error('Could not copy email: ', err);
                    // Show error
                    const originalText = emailButton.innerHTML;
                    emailButton.innerHTML = '<i class="fa-solid fa-xmark me-2"></i> Error!';
                    
                    // Add error class
                    emailButton.classList.add('btn-danger');
                    emailButton.classList.remove('btn-outline-dark');
                    
                    // Revert back after 2 seconds
                    setTimeout(() => {
                        emailButton.innerHTML = originalText;
                        emailButton.classList.remove('btn-danger');
                        emailButton.classList.add('btn-outline-dark');
                    }, 2000);
                });
        });
    }

    // Contact form handling
    const contactForm = document.querySelector('.contact-form');
    if (contactForm) {
        contactForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            // Get form elements
            const nameInput = document.getElementById('nameInput');
            const emailInput = document.getElementById('emailInput');
            const messageInput = document.getElementById('messageInput');
            const submitButton = contactForm.querySelector('button[type="submit"]');
            
            // Validate form
            let valid = true;
            [nameInput, emailInput, messageInput].forEach(input => {
                if (!input.value.trim()) {
                    input.classList.add('is-invalid');
                    valid = false;
                } else {
                    input.classList.remove('is-invalid');
                }
            });
            
            // Email regex validation
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (emailInput.value && !emailRegex.test(emailInput.value)) {
                emailInput.classList.add('is-invalid');
                valid = false;
            }
            
            if (valid) {
                // Here you would normally send the data to a server
                // For demo purposes, we'll just simulate success
                
                // Change button text
                const originalText = submitButton.innerHTML;
                submitButton.innerHTML = '<i class="fas fa-circle-notch fa-spin me-2"></i> Sending...';
                submitButton.disabled = true;
                
                // Simulate sending
                setTimeout(() => {
                    submitButton.innerHTML = '<i class="fas fa-check me-2"></i> Message Sent!';
                    submitButton.classList.remove('btn-primary');
                    submitButton.classList.add('btn-success');
                    
                    // Clear form
                    nameInput.value = '';
                    emailInput.value = '';
                    messageInput.value = '';
                    
                    // Reset button after delay
                    setTimeout(() => {
                        submitButton.innerHTML = originalText;
                        submitButton.disabled = false;
                        submitButton.classList.remove('btn-success');
                        submitButton.classList.add('btn-primary');
                    }, 3000);
                }, 1500);
            }
        });
    }

    // Add animation when elements enter viewport
    const observeElements = document.querySelectorAll('.bento-card, .social-link, .skill-card, .certificate-card, .publication-item');
    
    // Create intersection observer
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            // If element is in viewport
            if (entry.isIntersecting) {
                // Add animate class if it doesn't have one
                if (!entry.target.classList.contains('animate__animated')) {
                    entry.target.classList.add('animate__animated', 'animate__fadeInUp');
                }
                
                // Stop observing after animation
                observer.unobserve(entry.target);
            }
        });
    }, {
        root: null, // relative to viewport
        rootMargin: '0px',
        threshold: 0.1 // trigger when 10% of element is visible
    });
    
    // Observe all elements
    observeElements.forEach(element => {
        observer.observe(element);
    });

    // Dark mode toggle via button (using any button click since navbar is removed)
    const darkModeToggle = document.querySelector('.copy-email');
    if (darkModeToggle) {
        // Check for user preference
        const prefersDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
        const savedTheme = localStorage.getItem('theme');
        
        // Set initial state based on preference or saved theme
        if (savedTheme === 'dark' || (!savedTheme && prefersDarkMode)) {
            document.body.classList.add('dark-theme');
        }
        
        // Toggle dark mode on button double click
        darkModeToggle.addEventListener('dblclick', function() {
            document.body.classList.toggle('dark-theme');
            
            // Save user preference
            if (document.body.classList.contains('dark-theme')) {
                localStorage.setItem('theme', 'dark');
            } else {
                localStorage.setItem('theme', 'light');
            }
        });
    }

    // Smooth scrolling for anchor links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            if (this.getAttribute('href') !== '#') {
                e.preventDefault();
                
                const targetId = this.getAttribute('href');
                const targetElement = document.querySelector(targetId);
                
                if (targetElement) {
                    // Scroll smoothly to the target
                    targetElement.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start'
                    });
                }
            }
        });
    });
    
    // Parallax effect for background
    window.addEventListener('scroll', function() {
        const scrolled = window.scrollY;
        document.body.style.backgroundPosition = `0px ${scrolled * 0.05}px`;
    });
});
