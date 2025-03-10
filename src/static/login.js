let el = {};

document.addEventListener("DOMContentLoaded", () => {
    bindElements();
    attachEventListeners();
});

// Get the email and password input elements
function bindElements() {
    el.emailInput = document.querySelector('#email');
    el.passwordInput = document.querySelector('#password');
    el.submitButton = document.querySelector('input[type="submit"]');
    el.form = document.querySelector('form');
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

// Get User Details
async function getUserDetails(e) {
    e.preventDefault();


    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;

    try {
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
            return;
        
        } else if (response.status === 401) {
            console.error("Invalid password");
            alert("Invalid password. Please try again.");
            return;
        
        } else if (!response.ok) {
            throw new Error(`Server error: ${response.status}`);
        }

        const data = await response.json(); 
        const userData = data.user;

        if (userData.society_id) {
            localStorage.setItem('user_type', 'society')
            window.location.href = `/so/${userData.society_id}`;  
        } else {
            localStorage.setItem('user_type', 'student')
            window.location.href = `/st/${userData.student_id}`;  
        }
    
    } catch (error) {
        console.error("Error fetching user:", error);
    }
}
