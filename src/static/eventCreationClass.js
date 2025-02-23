import { addEventToCalendar } from "./index.js";

// Event Creation Menu Class
export class EventCreationMenu {
    constructor(node) {
        this.node = node;
        this.isOnlineCheckbox = this.node.querySelector("#is_online");
        this.locationForm = this.node.querySelector(".addressContainer");
        this.closeBtn = this.node.querySelector(".close");
        this.eventForm = this.node.querySelector("form");
        this.eventDateInput = this.node.querySelector("[name='event_date']");
        this.eventStartInput = this.node.querySelector("[name='event_start']");
        this.eventEndInput = this.node.querySelector("[name='event_end']");
        
        this.isOnlineCheckbox.addEventListener("change", () => this.toggleLocationContainer());
        this.closeBtn.addEventListener("click", () => this.closeMenu());
        this.eventForm.addEventListener("submit", (e) => this.handleEventForm(e));

        this.eventDateInput.addEventListener("input", () => this.clearCustomValidity());
        this.eventStartInput.addEventListener("input", () => this.clearCustomValidity());
        this.eventEndInput.addEventListener("input", () => this.clearCustomValidity());
        this.node.querySelector("[name='address_1']").addEventListener("input", () => this.clearCustomValidity());
    }

    openMenu() {
        this.eventForm.reset(); 
        
        const now = new Date();
        this.eventDateInput.value = now.toISOString().split("T")[0];
        
        this.node.style.display = "flex";
    }
    
    closeMenu() {
        this.node.style.display = "none";
    }
    
    toggleLocationContainer() {
        this.locationForm.classList.toggle("online", this.isOnlineCheckbox.checked);
    }

    clearCustomValidity() {
        this.eventDateInput.setCustomValidity("");
        this.eventStartInput.setCustomValidity("");
        this.eventEndInput.setCustomValidity("");
        this.node.querySelector("[name='address_1']").setCustomValidity("");
    }

    validateDateAndTime(data) {
        const { event_date: eventDate, event_start: eventStart, event_end: eventEnd } = data;
        const now = new Date();
        const todayStr = now.toISOString().split("T")[0];
        const currentTimeStr = now.toTimeString().split(" ")[0].slice(0, 5);

        if (eventDate < todayStr) {
            this.eventDateInput.setCustomValidity("Event date cannot be in the past.");
            return false;
        }

        if (eventDate === todayStr && eventStart < currentTimeStr) {
            this.eventStartInput.setCustomValidity("Event start time cannot be in the past.");
            return false;
        }

        if (eventEnd && (eventStart >= eventEnd)) {
            this.eventEndInput.setCustomValidity("Event end time must be later than start time.");
            return false;
        }
        return true;
    }

    validateLocation(data) {
        const addressInput = this.node.querySelector("[name='address_1']");
        const isOnline = data.is_online === "on";
        
        if (!isOnline && !data.address_1) {
            addressInput.setCustomValidity("Address is required for offline events.");
            return false;
        }
        return true;
    }

    async handleEventForm(e) {
        e.preventDefault();
        const formData = new FormData(this.eventForm);
        let data = Object.fromEntries(formData.entries());

        if (!this.eventForm.checkValidity() || !this.validateDateAndTime(data) || !this.validateLocation(data)) {
            this.eventForm.reportValidity();
            return; 
        }

        Object.keys(data).forEach((key) => {
            if (data[key].trim() === "") data[key] = null;
        });

        try {
            const response = await fetch("/addEvent", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            });

            this.closeMenu();
            const event = await response.json();
            addEventToCalendar(event);
            this.eventForm.reset();
        } catch (error) {
            console.error("Error: ", error);
        }
    }
}
