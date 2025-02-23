import { updateEventOnCalendar } from "./index.js";

export class PopupManager {
    static list = [];
    static popupTemplate = null;

    static async loadPopupTemplate() {
        try {
            const response = await fetch("/templates/event-popup.html");
            const text = await response.text();

            const templateDiv = document.createElement("div");
            templateDiv.innerHTML = text.trim();
            PopupManager.popupTemplate = templateDiv.querySelector("template");
        } catch (error) {
            console.error("Failed to load event popup template:", error);
        }
    }

    static setZIndex(selectedEl) {
        PopupManager.list.forEach((el) => {
            el.node.style.zIndex--;
        });
        selectedEl.style.zIndex = 999;
    }

    constructor(event) {
        this.data = event;
        this.template = PopupManager.popupTemplate;
        this.isDragging = false;

        const popupClone = this.template.content.cloneNode(true);
        this.node = popupClone.querySelector(".event-popup");

        this.node.setAttribute('data', `id: '${this.data.event_id}'`);
        
        this.header = this.node.querySelector("header");
        this.closeBtn = this.node.querySelector(".close");
        this.editBtn = this.node.querySelector(".edit-btn");
        this.saveBtn = this.node.querySelector(".save-btn");
        this.cancelBtn = this.node.querySelector(".cancel-btn");
        this.deleteBtn = this.node.querySelector(".delete-btn");
        this.titleEl1 = this.node.querySelector('.title');
        this.titleEl2 = this.node.querySelector('#title');
        this.descriptionEl = this.node.querySelector('#event_description');
        this.dateEl = this.node.querySelector('#event_date');
        this.startEl = this.node.querySelector('#event_start');
        this.endEl = this.node.querySelector('#event_end');
        this.locationForm = this.node.querySelector('.addressContainer');
        this.isOnlineCheckbox = this.node.querySelector("#is_online");
        this.handleData();
        
        document.body.appendChild(this.node);
        
        this.node.style.zIndex = 999;
        this.element = null;
        PopupManager.list.push(this);

        this.presaveData();
        this.close();
        this.handleDrag();
        this.handleLocationForm();
        this.handleEditBtn();
        this.handleSaveBtn();
        this.handleCancelBtn();
        this.handleDeleteBtn();
    }

    handleData() {
        debugger;
        this.titleEl1.innerText = this.data.title;
        this.titleEl2.value = this.data.title;
        this.descriptionEl.value = this.data.event_description;
        this.dateEl.value = this.data.event_date;
        this.startEl.value = this.data.event_start;
        this.endEl.value = this.data.event_end;

        this.dataLocation = {
            address_1: this.data.address_1,
            address_2: this.data.address_2,
            town: this.data.town,
            postcode: this.data.postcode
        };

        this.handleAddressInputs();
    }

    open(element) {
        this.element = element;
        if (!document.body.contains(this.node)) {
            document.body.appendChild(this.node); // after closing node is no longer in DOM
        }
        PopupManager.setZIndex(this.node);
        this.node.style.display = "flex";
    }

    close() {
        this.closeBtn.addEventListener("click", () => {
            this.element.classList.remove("active");
            this.node.style.display = "none"; // after closing popup it deletes the instance
        });
    }

    handleDrag() {
        this.header.addEventListener("mousedown", (e) => {
            if (!e.target.classList.contains("close")) {
                this.isDragging = true;
                this.startX = e.pageX;
                this.startY = e.pageY;
                this.startLeft = this.node.offsetLeft;
                this.startTop = this.node.offsetTop;
                PopupManager.setZIndex(this.node);
                document.addEventListener("mousemove", this.onMouseMove);
                document.addEventListener("mouseup", this.onMouseUp);
            }
        });
    }

    onMouseMove = (e) => {
        if (this.isDragging) {
            this.header.classList.add("active");

            let viewportWidth = window.innerWidth;
            let viewportHeight = window.innerHeight;

            let deltaX = e.clientX - this.startX;
            let deltaY = e.clientY - this.startY;

            let newLeft = this.startLeft + deltaX;
            let newTop = this.startTop + deltaY;

            // Prevent left overflow
            if (newLeft <= 0) {
                newLeft = 0;
            }
            // Prevent right overflow
            if (newLeft + this.node.offsetWidth > viewportWidth) {
                newLeft = viewportWidth - this.node.offsetWidth;
            }
            // Prevent top overflow
            if (newTop <= 0) {
                newTop = 0;
            }
            // Prevent bottom overflow
            if (newTop + this.node.offsetHeight > viewportHeight) {
                newTop = viewportHeight - this.node.offsetHeight;
            }

            this.node.style.left = `${newLeft}px`;
            this.node.style.top = `${newTop}px`;
        }
    };

    onMouseUp = () => {
        this.header.classList.remove("active");
        this.isDragging = false;

        document.removeEventListener("mousemove", this.onMouseMove);
        document.removeEventListener("mouseup", this.onMouseUp);
    };

    handleAddressInputs() {
        if (this.data.is_online === 1 || this.isOnlineCheckbox.checked) {
            this.isOnlineCheckbox.checked = true;
            this.locationForm.classList.add("online");
        } else {
            this.isOnlineCheckbox.classList.add('blank');
            Object.entries(this.dataLocation).forEach(([key, value]) => {
                if (value.length > 0) {
                    this.node.querySelector(`#${key}`).value = value;
                } else {
                    this.node.querySelector(`#${key}`).classList.add("blank");
                }
            });
        }
    }

    handleBtns(formStatus) {
        if (formStatus) {
            this.editBtn.classList.add("active");
            this.saveBtn.classList.remove("active");
            this.cancelBtn.classList.remove("active");
        } else {
            this.editBtn.classList.remove("active");
            this.saveBtn.classList.add("active");
            this.cancelBtn.classList.add("active");
        }
    }

    presaveData() {
        this.presavedInputData = [
            this.titleEl1.innerText,
            this.descriptionEl.value,
            this.dateEl.value,
            this.startEl.value,
            this.endEl.value,
            this.isOnlineCheckbox.checked,
            this.node.querySelector('#address_1').value,
            this.node.querySelector('#address_2').value,
            this.node.querySelector('#town').value,
            this.node.querySelector('#postcode').value
        ];
    }

    handleLocationForm() {
        this.isOnlineCheckbox.addEventListener("change", (e) => {
            if (e.target.checked) {
                this.locationForm.classList.add("online");
            } else {
                this.locationForm.classList.remove("online");
            }
        });
    }

    handleEditBtn() {
        this.editBtn.addEventListener("click", (e) => {
            e.preventDefault();
            this.handleBtns(true);
            this.node.querySelectorAll("input, textarea").forEach((input) => {
                input.disabled = false;
                input.classList.remove("blank");
            });
            this.presaveData();
        });
    }

    handleSaveBtn() {
        this.saveBtn.addEventListener("click", async (e) => {
            e.preventDefault();
            this.clearValidation();
    
            const formData = new FormData(this.node.querySelector('.event-details'));
            let data = Object.fromEntries(formData.entries());

            if (!this.node.querySelector('.event-details').checkValidity() ||
                !this.validateDateAndTime(data) ||
                !this.validateLocation(data)) {
                this.node.querySelector('.event-details').reportValidity(); // Trigger tooltip display
                return;
            }
    
            this.node.querySelectorAll("input, textarea").forEach((input) => {
                input.disabled = true;
            });
            this.handleBtns(false);
    
            data.event_status = "Scheduled";
            this.data = await this.updateEvent(data);

            updateEventOnCalendar(this.data);
            this.handleData();
            
        });
    }
    
    handleCancelBtn() {
        this.cancelBtn.addEventListener("click", (e) => {
            e.preventDefault();
            this.handleBtns(false);

            let i = 0;
            this.node.querySelectorAll("input, textarea").forEach((input) => {
                input.disabled = true;
                input.value = this.presavedInputData[i];
                i++;
            });
            this.handleAddressInputs();
        });
    }

    handleDeleteBtn() {
        this.deleteBtn.addEventListener("click", async (e) => {
            e.preventDefault();
            const updatedEvent = {
                event_id: this.node.getAttribute("data").match(/id: '([^']+)'/)[1],
                title: this.presavedInputData[0],
                description: this.presavedInputData[1],
                date: this.presavedInputData[2],
                start: this.presavedInputData[3],
                end: this.presavedInputData[4],
                is_online: this.presavedInputData[5],
                address_1: this.presavedInputData[6],
                address_2: this.presavedInputData[7],
                town: this.presavedInputData[8],
                postcode: this.presavedInputData[9],
                event_status: "Canceled"
            };

            await updateEventOnCalendar(updatedEvent);
            await this.updateEvent(updatedEvent);
        });
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

    async updateEvent(data) {
        
        console.log("sent data", data)
        data.event_id = this.node.getAttribute('data').split("'")[1];

        try {
            const response = await fetch("/updateEvent", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(data)
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const event = await response.json();
            console.log(event)
            return event;
        } catch (error) {
            console.error("Error updating event:", error);
        }
    }
}
