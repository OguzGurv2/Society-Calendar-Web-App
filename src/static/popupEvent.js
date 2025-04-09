import { el, updateEventOnCalendar } from "./index.js";

export class PopupEvent {
  static list = [];
  static popupTemplate = null;

  // Load popup template from file
  static async loadPopupTemplate() {
    try {
      const response = await fetch("/templates/event-popup.html");
      if (!response.ok) throw new Error("Failed to load event popup template");

      const templateDiv = document.createElement("div");
      templateDiv.innerHTML = (await response.text()).trim();
      PopupEvent.popupTemplate = templateDiv.querySelector("template");
    } catch (error) {
      console.error(error);
    }
  }

  // Set z-index for selected popup and others
  static setZIndex(selectedEl) {
    PopupEvent.list.forEach((el) => (el.node.style.zIndex = 1));
    selectedEl.style.zIndex = 999;
  }

  // Create new popup for event
  constructor(event) {
    this.data = { ...event };
    this.template = PopupEvent.popupTemplate;
    this.isDragging = false;
    this.linkCount = 0;
    this.userType = el.userType;
    this.runOnce = false;

    const popupClone = this.template.content.cloneNode(true);
    this.node = popupClone.querySelector(".event-popup");
    this.node.dataset.id = this.data.event_id;

    this.bindElements();
    this.populateData();
    this.handleButtons();
    this.attachEventListeners();

    document.body.appendChild(this.node);
    PopupEvent.list.push(this);
  }

  // Bind popup elements
  bindElements() {
    ["close", 
      "edit", 
      "save", 
      "cancel", 
      "delete", 
      "addLink",
    ].forEach(
      (id) => (this[`${id}Btn`] = this.node.querySelector(`.${id}-btn`))
    );

    [
      "header",
      "headerTitle",
      "event_name",
      "event_description",
      "event_date",
      "event_start",
      "event_end",
      "is_online",
    ].forEach((id) => {
      this[`${id}El`] = this.node.querySelector(`#${id}`);
    });

    this.locationForm = this.node.querySelector(".addressContainer");
    this.linkList = this.node.querySelector(".link-list");
    this.popupForm = this.node.querySelector("form");
  }

  // Populate event data in popup
  populateData() {
    if (!this.runOnce) {
      this.is_onlineEl.id = `is_online_${this.data.event_id}`;
      this.node.querySelector("label[for='is_online']").setAttribute("for", this.is_onlineEl.id);
    }

    this.runOnce = true;
    this.linkCount = 0;

    const fields = [
      "event_name",
      "event_description",
      "event_date",
      "event_start",
      "event_end",
    ];
    fields.forEach(
      (field) => (this[`${field}El`].value = this.data[field] || "")
    );
    this.headerTitleEl.textContent = this.data.society_name;


    this.is_onlineEl.checked = this.data.is_online === 1;
    this.toggleLocationForm();
    this.is_online = this.data.is_online === 1;
    
    this.populateLinks();
  }

  // Populate event links
  populateLinks() {
    if (!this.data.event_links) return;
    this.node.querySelector("ul").innerHTML = "";
    const links = JSON.parse(this.data.event_links);
    Object.entries(links).forEach(([name, url]) => {
      this.linkCount++;
      const linkInput = document.createElement("li");
      linkInput.innerHTML = `
                <label for="link_name_${this.linkCount}">Link ${this.linkCount}:</label>
                <a id="link_name_display_${this.linkCount}" href='${url}'>${name}</a>
                <div>
                    <input type="text" name="link_name_${this.linkCount}" id="link_name_${this.linkCount}" class='hidden' placeholder="Link Name" disabled>
                    <input type="url" name='link_${this.linkCount}' class='hidden' placeholder="Link URL" disabled>
                    <button type="button" class="remove-link hidden"><i class="fa-regular fa-trash-can"></i></button>
                </div>
            `;

      linkInput.querySelector("input[type=url]").value = url;
      linkInput.querySelector("input[type=text]").value = name;
      this.linkList.appendChild(linkInput);

      linkInput.querySelector(".remove-link").addEventListener("click", () => {
        linkInput.remove();
        this.linkCount--;
        if (this.linkCount < 3) this.addLinkBtn.classList.add("active");
      });

      this.node.querySelector("ul").append(linkInput);
    });
  }

  // Handles editing and deleting buttons depending on user type
  handleButtons() {
    if (this.userType === 'student') {
      this.editBtn.classList.remove('active');
      this.deleteBtn.classList.remove('active');
    }
  }

  // Attach event listeners to popup buttons
  attachEventListeners() {
    this.closeBtn.addEventListener("click", () => this.close());
    this.editBtn.addEventListener("click", (e) => this.toggleEditMode(e, true));
    this.saveBtn.addEventListener("click", (e) => this.saveChanges(e));
    this.cancelBtn.addEventListener("click", (e) => {
      this.toggleEditMode(e, false)
      this.populateData();
    });
    this.deleteBtn.addEventListener(
      "click",
      async () => await this.deleteEvent()
    );
    this.headerEl.addEventListener("mousedown", (e) => this.startDrag(e));
    this.is_onlineEl.addEventListener("change", () =>
      this.toggleLocationForm()
    );
    this.addLinkBtn.addEventListener("click", (e) => this.addLinkInput(e));
  }

  // Toggle location form based on online status
  toggleLocationForm() {
    if (this.is_onlineEl.checked) {
      this.locationForm.classList.add("online");
    } else {
      this.locationForm.classList.remove("online");
      ["event_address", "town", "postcode"].forEach((field) => {
        const input = this.node.querySelector(`#${field}`);
        if (input) input.value = this.data[field] || "";
      });
    }
    this.is_online = !this.is_online;
  }

  // Open popup
  open(element) {
    this.element = element;
    document.body.appendChild(this.node);
    PopupEvent.setZIndex(this.node);
    this.node.style.display = "flex";
  }

  // Close popup
  close() {
    this.node.style.display = "none";
    this.element?.classList.remove("active");
  }

  // Toggle edit mode for event details
  toggleEditMode(e, editable) {
    e.preventDefault();
    this.node
      .querySelectorAll("input, textarea")
      .forEach((input) => (input.disabled = !editable));
    ["edit", "save", "cancel"].forEach((btn) =>
      this[`${btn}Btn`].classList.toggle(
        "active",
        btn !== "edit" ? editable : !editable
      )
    );
    if (this.linkCount < 3) this.addLinkBtn.classList.toggle("active");

    this.linkList
      .querySelectorAll("a, input, button")
      .forEach((text) => text.classList.toggle("hidden"));
  }

  // Adds Link Inputs to the element
  addLinkInput(e) {
    e.preventDefault();
    this.linkCount++;
    const linkContainer = document.createElement("li");
    linkContainer.className = "link-input";
    linkContainer.innerHTML = `
        <label for="link_name_${this.linkCount}">Link ${this.linkCount}</label>
        <a id="link_name_display_${this.linkCount}" href=""></a>
        <div>
            <input type="text" name="link_name_${this.linkCount}" id="link_name_${this.linkCount}" placeholder="Link Name">
            <input type="url" name='link_${this.linkCount}' placeholder="Link URL">
            <button type="button" class="remove-link"><i class="fa-regular fa-trash-can"></i></button>
        </div>        
        `;

    linkContainer
      .querySelector(".remove-link")
      .addEventListener("click", () => {
        linkContainer.remove();
        this.linkCount--;
        if (this.linkCount < 3) this.addLinkBtn.classList.add("active");
      });
    this.node.querySelector("ul").append(linkContainer);

    if (this.linkCount == 3) return this.addLinkBtn.classList.remove("active");
  }

  // Updating Links
  updateLinks() {
    this.linkList.querySelectorAll('li').forEach((linkNode) => {
        linkNode.querySelector('a').textContent = linkNode.querySelector("input[type=text]").value;
    });
  }

  // Save changes to event
  async saveChanges(event) {
    event.preventDefault();
    this.clearValidation();

    const formData = new FormData(this.node.querySelector(".event-details"));
    const data = Object.fromEntries(formData.entries());
    let updatedEvent = {
      ...data,
      event_status: "Scheduled",
      event_id: this.node.dataset.id,
    };

    if (
      !this.popupForm.checkValidity() ||
      !this.validateDateAndTime(updatedEvent) ||
      !this.validateLocation(updatedEvent) ||
      !this.checkURLs(data)
    ) {
      this.popupForm.reportValidity();
      return;
    }

    // Replace empty values with null
    Object.keys(data).forEach((key) => {
      if (data[key].trim() === "") data[key] = null;
    });

    const links = Object.keys(data).filter(
      (key) => key.startsWith("link_") && key.length == 6
    );
    updatedEvent.links = {};

    for (const link of links) {
      const index = link.split("_")[1];
      const linkNameKey = `link_name_${index}`;

      if (!this.validateURLName(data[linkNameKey], linkNameKey)) {
        this.popupForm.reportValidity();
        return;
      }
      updatedEvent.links[data[linkNameKey]] = data[link];

      delete data[link];
      delete data[linkNameKey];
    }

    this.data = await this.updateEvent(updatedEvent);
    this.updateLinks();
    updateEventOnCalendar(this.data);
    this.toggleEditMode(event, false);
  }

  // Delete event from calendar, database and from DOM
  async deleteEvent() {
    this.clearValidation();

    const updatedEvent = { ...this.data, event_status: "Canceled" };
    await this.updateEvent(updatedEvent);

    PopupEvent.list = PopupEvent.list.filter(
      (instance) => instance !== this
    );
    updateEventOnCalendar(updatedEvent);
    this.node.remove();
  }

  // Update event in database
  async updateEvent(data) {
    try {
      const response = await fetch("/updateEvent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok)
        throw new Error(`HTTP error! status: ${response.status}`);
      return await response.json();
    } catch (error) {
      console.error("Error updating event:", error);
    }
  }

  // Validate Date and Time Inputs
  validateDateAndTime(data) {
    const {
      event_date: eventDate,
      event_start: eventStart,
      event_end: eventEnd,
    } = data;
    const now = new Date();
    const todayStr = now.toISOString().split("T")[0];
    const currentTimeStr = now.toTimeString().split(" ")[0].slice(0, 5);

    if (eventDate < todayStr) {
      this.event_dateEl.setCustomValidity("Event date cannot be in the past.");
      return false;
    }

    if (eventDate === todayStr && eventStart < currentTimeStr) {
      this.event_startEl.setCustomValidity(
        "Event start time cannot be in the past."
      );
      return false;
    }

    if (eventEnd && eventStart >= eventEnd) {
      this.event_endEl.setCustomValidity(
        "Event end time must be later than start time."
      );
      return false;
    }

    return true;
  }

  // Validate Location Input
  validateLocation(data) {
    const isOnline = data.is_online === "on";

    if (!isOnline) {
      const addressInput = this.node.querySelector("[name='event_address']");
      if (!data.event_address) {
        addressInput.setCustomValidity(
          "Address is required for offline events."
        );
        return false;
      } else {
        addressInput.setCustomValidity("");
      }
    }
    return true;
  }

  // Check URL Inputs if exists
  checkURLs(data) {
    if (this.is_online) {
      const links = Object.keys(data).filter(
        (key) => key.startsWith("link_") && key.length == 6
      );
  
      if (links.length === 0) {
        alert("At least one link is required for online events.");
        return false;
      }
    }

    return true;
  }

  // Validate URL Names
  validateURLName(linkName, linkNameKey) {
    if (linkName === null) {
      this.node
        .querySelector(`#${linkNameKey}`)
        .setCustomValidity("Link name is required.");
      return false;
    }
    return true;
  }

  // Clear validation messages
  clearValidation() {
    this.node.querySelectorAll("input, textarea").forEach((input) => {
      input.setCustomValidity("");
    });
  }

  // Start dragging popup
  startDrag(event) {
    if (event.target.classList.contains("close")) return;
    this.isDragging = true;
    this.startX = event.pageX;
    this.startY = event.pageY;
    this.startLeft = this.node.offsetLeft;
    this.startTop = this.node.offsetTop;
    PopupEvent.setZIndex(this.node);

    document.addEventListener("mousemove", this.onMouseMove);
    document.addEventListener("mouseup", this.onMouseUp);
  }

  // Move popup with mouse
  onMouseMove = (event) => {
    if (!this.isDragging) return;
    this.node.style.left = `${this.startLeft + event.clientX - this.startX}px`;
    this.node.style.top = `${this.startTop + event.clientY - this.startY}px`;
    this.headerEl.classList.add("dragging");
  };

  // Stop dragging when mouse is released
  onMouseUp = () => {
    this.isDragging = false;
    this.headerEl.classList.remove("dragging");
    document.removeEventListener("mousemove", this.onMouseMove);
    document.removeEventListener("mouseup", this.onMouseUp);
  };
}
