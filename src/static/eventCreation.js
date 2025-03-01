import { addEventToCalendar } from "./index.js";

// Event Creation Menu Class
export class EventCreationMenu {
    constructor(node) {
        this.node = node;

        this.bindElements();
        this.addEventListeners();
    }
    
    // Bind DOM elements to properties
    bindElements() {
        this.eventForm = this.node.querySelector("form");
        this.isOnlineCheckbox = this.node.querySelector("#is_online");
        this.locationForm = this.node.querySelector(".addressContainer");

        this.closeBtn = this.node.querySelector(".close-btn");
        
        const inputs = ["event_date", "event_start", "event_end", "address_1"];
        inputs.forEach(id => this[`${id}Input`] = this.node.querySelector(`[name='${id}']`));
    }

    // Add Event Listeners to the DOM elements
    addEventListeners() {
        this.isOnlineCheckbox.addEventListener("change", () => this.toggleLocationContainer());
        this.closeBtn.addEventListener("click", () => this.close());
        this.eventForm.addEventListener("submit", (e) => this.handleEventForm(e));

        [this.event_dateInput, this.event_startInput, this.event_endInput, this.address_1Input].forEach(input =>
            input.addEventListener("input", () => this.clearCustomValidity())
        );
    }

    // Open & Close Menu
    open() {
        this.eventForm.reset();
        this.event_dateInput.value = new Date().toISOString().split("T")[0]; // Set today's date
        this.node.style.display = "flex";
    }

    close() {
        this.node.style.display = "none";
    }

    // Toggle Location Form
    toggleLocationContainer() {
        this.locationForm.classList.toggle("online", this.isOnlineCheckbox.checked);
    }

    // Clear Validation Errors
    clearCustomValidity() {
        [this.event_dateInput, this.event_startInput, this.event_endInput, this.address_1Input].forEach(input =>
            input.setCustomValidity("")
        );
    }

    // Validate Date & Time Inputs
    validateDateAndTime(data) {
        const { event_date: eventDate, event_start: eventStart, event_end: eventEnd } = data;
        const now = new Date();
        const todayStr = now.toISOString().split("T")[0];
        const currentTimeStr = now.toTimeString().split(" ")[0].slice(0, 5);

        if (eventDate < todayStr) {
            this.event_dateInput.setCustomValidity("Event date cannot be in the past.");
            return false;
        }

        if (eventDate === todayStr && eventStart < currentTimeStr) {
            this.event_startInput.setCustomValidity("Event start time cannot be in the past.");
            return false;
        }

        if (eventEnd && eventStart >= eventEnd) {
            this.event_endInput.setCustomValidity("Event end time must be later than start time.");
            return false;
        }

        return true;
    }

    // Validate Location Input
    validateLocation(data) {
        if (data.is_online !== "on" && !data.address_1) {
            this.address_1Input.setCustomValidity("Address is required for offline events.");
            return false;
        }
        return true;
    }

    //#region Handle Event Form Submission
    async handleEventForm(e) {
        e.preventDefault();

        const formData = new FormData(this.eventForm);
        let data = Object.fromEntries(formData.entries());

        // Validate Form
        if (!this.eventForm.checkValidity() || !this.validateDateAndTime(data) || !this.validateLocation(data)) {
            this.eventForm.reportValidity();
            return;
        }

        // Replace empty values with null
        Object.keys(data).forEach((key) => {
            if (data[key].trim() === "") data[key] = null;
        });

        try {
            const response = await fetch("/addEvent", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            });

            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

            this.close();
            const event = await response.json();
            addEventToCalendar(event);
            this.eventForm.reset();
        } catch (error) {
            console.error("Error adding event:", error);
        }
    }
    //#endregion
}
