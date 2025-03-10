import { el, addEventToCalendar } from "./index.js";

// Event Creation Menu Class
export class EventCreationMenu {
  constructor(node) {
    this.node = node;
    this.isOpen = false;
    this.linkCount = 0;
    this.userId = el.userId;

    this.bindElements();
    this.attachEventListeners();
  }

  // Bind DOM elements to properties
  bindElements() {
    this.eventForm = this.node.querySelector("form");
    this.isOnlineCheckbox = this.node.querySelector("#is_online");
    this.addLinkBtn = this.node.querySelector(".addLink-btn");
    this.locationForm = this.node.querySelector(".addressContainer");

    this.closeBtn = this.node.querySelector(".close-btn");

    const inputs = ["event_date", "event_start", "event_end", "event_address"];
    inputs.forEach(
      (id) => (this[`${id}Input`] = this.node.querySelector(`[name='${id}']`))
    );
  }

  // Attach Event Listeners to the DOM elements
  attachEventListeners() {
    this.isOnlineCheckbox.addEventListener("change", () =>
      this.toggleLocationContainer()
    );
    this.closeBtn.addEventListener("click", () => this.close());
    this.eventForm.addEventListener("submit", (e) => this.handleEventForm(e));
    this.addLinkBtn.addEventListener("click", (e) => this.addLinkInput(e));

    [
      this.event_dateInput,
      this.event_startInput,
      this.event_endInput,
      this.event_addressInput,
    ].forEach((input) =>
      input.addEventListener("input", () => this.clearCustomValidity())
    );
  }

  // Open & Close Menu
  open() {
    if (this.isOpen) return;

    this.eventForm.reset();
    this.event_dateInput.value = new Date().toISOString().split("T")[0]; // Set today's date
    this.node.style.display = "flex";
    this.toggleLocationContainer();
    this.isOpen = true;
  }

  close() {
    this.node.style.display = "none";
    this.isOpen = false;
  }

  // Toggle Location Form
  toggleLocationContainer() {
    this.locationForm.classList.toggle("online", this.isOnlineCheckbox.checked);
  }

  // Add Link Inputs to the form
  addLinkInput(e) {
    e.preventDefault();
    this.linkCount++;
    const linkContainer = document.createElement("li");
    linkContainer.className = "link-input";
    linkContainer.innerHTML = `
        <label for="link_name_${this.linkCount}">Link ${this.linkCount}</label>
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

  // Clear Validation Errors
  clearCustomValidity() {
    [
      this.event_dateInput,
      this.event_startInput,
      this.event_endInput,
      this.event_addressInput,
    ].forEach((input) => input.setCustomValidity(""));
  }

  // Validate Date & Time Inputs
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
      this.event_dateInput.setCustomValidity(
        "Event date cannot be in the past."
      );
      return false;
    }

    if (eventDate === todayStr && eventStart < currentTimeStr) {
      this.event_startInput.setCustomValidity(
        "Event start time cannot be in the past."
      );
      return false;
    }

    if (eventEnd && eventStart >= eventEnd) {
      this.event_endInput.setCustomValidity(
        "Event end time must be later than start time."
      );
      return false;
    }

    return true;
  }

  // Validate Location Input
  validateLocation(data) {
    if (data.is_online !== "on" && !data.address_1) {
      this.address_1Input.setCustomValidity(
        "Address is required for offline events."
      );
      return false;
    }
    return true;
  }

  // Validate URL Names
  validateURLName(linkName, linkNameKey) {
    if (linkName === null) {
      console.log(linkNameKey);
      this.node
        .querySelector(`#${linkNameKey}`)
        .setCustomValidity("Link name is required.");
      return false;
    }
    return true;
  }

  // Handle Event Form Submission
  async handleEventForm(e) {
    e.preventDefault();

    const formData = new FormData(this.eventForm);
    let data = Object.fromEntries(formData.entries());

    // Validate Form
    if (
      !this.eventForm.checkValidity() ||
      !this.validateDateAndTime(data) ||
      !this.validateLocation(data)
    ) {
      this.eventForm.reportValidity();
      return;
    }

    // Replace empty values with null
    Object.keys(data).forEach((key) => {
      if (data[key].trim() === "") data[key] = null;
    });

    const links = Object.keys(data).filter(
      (key) => key.startsWith("link_") && key.length == 6
    );
    data.links = {};

    for (const link of links) {
      const index = link.split("_")[1];
      const linkNameKey = `link_name_${index}`;

      if (!this.validateURLName(data[linkNameKey], linkNameKey)) {
        this.eventForm.reportValidity();
        return;
      }
      data.links[data[linkNameKey]] = data[link];

      delete data[link];
      delete data[linkNameKey];
    }

    data.society_id = this.userId;

    try {
      const response = await fetch("/addEvent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok)
        throw new Error(`HTTP error! status: ${response.status}`);

      this.close();
      const event = await response.json();
      addEventToCalendar(event);
      this.eventForm.reset();
      this.isOpen = false;
    } catch (error) {
      console.error("Error adding event:", error);
    }
  }
}
