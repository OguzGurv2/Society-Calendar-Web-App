import { updateEventOnCalendar } from "./index.js";

export class PopupManager {
    static list = [];
    static popupTemplate = null;

    static async loadPopupTemplate() {
        try {
            const response = await fetch("/templates/event-popup.html");
            if (!response.ok) throw new Error("Failed to load event popup template");
            
            const templateDiv = document.createElement("div");
            templateDiv.innerHTML = (await response.text()).trim();
            PopupManager.popupTemplate = templateDiv.querySelector("template");
        } catch (error) {
            console.error(error);
        }
    }

    static setZIndex(selectedEl) {
        PopupManager.list.forEach(el => el.node.style.zIndex = 1);
        selectedEl.style.zIndex = 999;
    }

    constructor(event) {
        this.data = { ...event };
        this.template = PopupManager.popupTemplate;
        this.isDragging = false;

        const popupClone = this.template.content.cloneNode(true);
        this.node = popupClone.querySelector(".event-popup");
        this.node.dataset.id = this.data.event_id;

        this.bindElements();
        this.populateData();
        this.attachEventListeners();

        document.body.appendChild(this.node);
        PopupManager.list.push(this);
    }

    bindElements() {
        const buttons = ["close", "edit", "save", "cancel", "delete"];
        buttons.forEach(id => this[`${id}Btn`] = this.node.querySelector(`.${id}-btn`));

        ["header", "headerTitle", "title", "event_description", "event_date", "event_start", "event_end", "is_online"].forEach(id => {
            this[`${id}El`] = this.node.querySelector(`#${id}`);
        });

        this.locationForm = this.node.querySelector(".addressContainer");
    }

    populateData() {
        const fields = ["title", "event_description", "event_date", "event_start", "event_end"];
        fields.forEach(field => this[`${field}El`].value = this.data[field] || "");
        this.headerTitleEl.textContent = this.titleEl.value;

        this.is_onlineEl.checked = this.data.is_online === 1;
        this.toggleLocationForm();
    }

    toggleLocationForm() {
        if (this.is_onlineEl.checked) {
            this.locationForm.classList.add("online");
        } else {
            ["address_1", "address_2", "town", "postcode"].forEach(field => {
                const input = this.node.querySelector(`#${field}`);
                if (input) input.value = this.data[field] || "";
            });
        }
    }

    attachEventListeners() {
        this.closeBtn.addEventListener("click", () => this.close());
        this.editBtn.addEventListener("click", (e) => this.toggleEditMode(e, true));
        this.saveBtn.addEventListener("click", (e) => this.saveChanges(e));
        this.cancelBtn.addEventListener("click", (e) => this.toggleEditMode(e, false));
        this.deleteBtn.addEventListener("click", async () => await this.deleteEvent());
        this.headerEl.addEventListener("mousedown", (e) => this.startDrag(e));
    }

    open(element) {
        this.element = element;
        document.body.appendChild(this.node);
        PopupManager.setZIndex(this.node);
        this.node.style.display = "flex";
    }

    close() {
        this.node.style.display = "none";
        this.element?.classList.remove("active");
    }

    toggleEditMode(event, editable) {
        event.preventDefault();
        this.node.querySelectorAll("input, textarea").forEach(input => input.disabled = !editable);
        ["edit", "save", "cancel"].forEach(btn => this[`${btn}Btn`].classList.toggle("active", btn !== "edit" ? editable : !editable));
    }

    async saveChanges(event) {
        event.preventDefault();
        this.clearValidation();

        const formData = new FormData(this.node.querySelector(".event-details"));
        const data = Object.fromEntries(formData.entries());
        const updatedEvent = { ...data, event_status: "Scheduled", event_id: this.node.dataset.id };

        if (!this.validateDateAndTime(updatedEvent) || !this.validateLocation(updatedEvent)) {
            return;
        }

        this.data = await this.updateEvent(updatedEvent);
        updateEventOnCalendar(this.data);
        this.toggleEditMode(event, false);
    }

    async deleteEvent() {
        this.clearValidation();
        const updatedEvent = { ...this.data, event_status: "Canceled" };
        updateEventOnCalendar(updatedEvent);
        await this.updateEvent(updatedEvent);
    }

    async updateEvent(data) {
        try {
            const response = await fetch("/updateEvent", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data)
            });

            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            return await response.json();
        } catch (error) {
            console.error("Error updating event:", error);
        }
    }

    validateDateAndTime(data) {
        const { event_date: eventDate, event_start: eventStart, event_end: eventEnd } = data;
        const now = new Date();
        const todayStr = now.toISOString().split("T")[0];
        const currentTimeStr = now.toTimeString().split(" ")[0].slice(0, 5);

        if (eventDate < todayStr) {
            this.event_dateEl.setCustomValidity("Event date cannot be in the past.");
            this.event_dateEl.reportValidity();
            return false;
        }

        if (eventDate === todayStr && eventStart < currentTimeStr) {
            this.event_startEl.setCustomValidity("Event start time cannot be in the past.");
            this.event_startEl.reportValidity();
            return false;
        }

        if (eventEnd && eventStart >= eventEnd) {
            this.event_endEl.setCustomValidity("Event end time must be later than start time.");
            this.event_endEl.reportValidity();
            return false;
        }

        return true;
    }

    validateLocation(data) {
        const isOnline = data.is_online === "on";
        
        if (!isOnline) {
            const addressInput = this.node.querySelector("[name='address_1']");
            if (!data.address_1) {
                addressInput.setCustomValidity("Address is required for offline events.");
                addressInput.reportValidity();
                return false;
            } else {
                addressInput.setCustomValidity("");
            }
        }
        return true;
    }

    clearValidation() {
        this.node.querySelectorAll("input, textarea").forEach((input) => {
            input.setCustomValidity("");
        });
    }

    startDrag(event) {
        if (event.target.classList.contains("close")) return;
        this.isDragging = true;
        this.startX = event.pageX;
        this.startY = event.pageY;
        this.startLeft = this.node.offsetLeft;
        this.startTop = this.node.offsetTop;
        PopupManager.setZIndex(this.node);

        document.addEventListener("mousemove", this.onMouseMove);
        document.addEventListener("mouseup", this.onMouseUp);
    }

    onMouseMove = (event) => {
        if (!this.isDragging) return;
        this.node.style.left = `${this.startLeft + event.clientX - this.startX}px`;
        this.node.style.top = `${this.startTop + event.clientY - this.startY}px`;
    };

    onMouseUp = () => {
        this.isDragging = false;
        document.removeEventListener("mousemove", this.onMouseMove);
        document.removeEventListener("mouseup", this.onMouseUp);
    };
}
