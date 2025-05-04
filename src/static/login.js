let el = {};

document.addEventListener("DOMContentLoaded", () => {
    window.addEventListener("pageshow", function (event) {
        if (event.persisted) {
            location.reload(); // Force a reload if the page was restored from the cache
        }
    });
    
    bindElements();
    attachEventListeners();
});

// Get the email and password input elements
function bindElements() {
    el.emailInput = document.querySelector('#email');
    el.passwordInput = document.querySelector('#password');
    el.submitButton = document.querySelector('input[type="submit"]');
    el.form = document.querySelector('form');
    el.body = document.querySelector("body");
    el.isEmailValid = false;
    el.isPasswordValid = false;
}

// Add event listeners to the email and password inputs
function attachEventListeners() {
    el.emailInput.addEventListener('input', () => validateInputs(el.emailInput));
    el.passwordInput.addEventListener('input', () => validateInputs(el.passwordInput));
    el.form.addEventListener('submit', (e) => getUserDetails(e))
}

// Validate input fields
function validateInputs(inputEl) {
    if (inputEl.id === 'email') {
        el.isEmailValid = inputEl.value.trim().length > 0;
    } else if (inputEl.id === 'password') {
        el.isPasswordValid = inputEl.value.trim().length > 0;
    }
    updateSubmitButtonState();
}

// Enable or disable the submit button based on validation
function updateSubmitButtonState() {
    el.submitButton.disabled = !(el.isEmailValid && el.isPasswordValid);
}

function handleLoading() {
    // Check current cursor state
    const isWait = el.body.style.cursor === "wait"; 
    
    // Toggle the body cursor
    el.body.style.cursor = isWait ? "initial" : "wait";
    
    // Toggle disabled state for form elements
    el.submitButton.disabled = !el.submitButton.disabled;
    el.emailInput.disabled = !el.emailInput.disabled;
    el.passwordInput.disabled = !el.passwordInput.disabled;

    // Loop through all elements to toggle the cursor style
    document.querySelectorAll("*").forEach(element => {
        if (element.disabled) {
            element.style.cursor = isWait ? "not-allowed" : "wait"; // Disabled elements
        } else if (element.id === "email" || element.id === "password") {
            element.style.cursor = isWait ? "text" : "wait"; // Specific input fields
        } else {
            element.style.cursor = isWait ? "initial" : "wait"; // Other elements
        }
    });

    // Toggle the submit button text
    el.submitButton.value = isWait ? "Login" : "Authenticating...";
}

// Get User Details
async function getUserDetails(e) {
    e.preventDefault();
    handleLoading();

    
    try {
        const email = document.getElementById("email").value;
        const password = document.getElementById("password").value;

        const response = await fetch("/getUser", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ email, password })
        });

        if (response.status === 404) {
            console.error("User not found");
            alert("User not found. Please check your email.");
            return handleLoading();
        
        } else if (response.status === 401) {
            console.error("Invalid password");
            alert("Invalid password. Please try again.");
            return handleLoading();
        
        } else if (!response.ok) {
            throw new Error(`Server error: ${response.status}`);
        }

        const data = await response.json(); 
        const userData = data.user;

        if (userData.society_id) {
            localStorage.setItem('user_type', 'society')
            localStorage.setItem('user_name', userData.society_name);
            localStorage.setItem('user_email', email);
            window.location.href = `/so/${userData.society_id}`;  
        } else {
            localStorage.setItem('user_type', 'student')
            localStorage.setItem('user_email', email);
            window.location.href = `/st/${userData.student_id}`;  
        }
    
    } catch (error) {
        console.error("Error fetching user:", error);
    }
}
