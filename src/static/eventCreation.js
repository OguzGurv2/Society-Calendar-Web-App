import { el, addEventToCalendar } from "./index.js";

// Share Menu Class
class ShareMenu {
  constructor(node, eventCreationMenu) {
    this.node = node;
    this.eventCreationMenu = eventCreationMenu;
    this.isOpen = false;

    this.closeBtn = this.node.querySelector(".close-btn");
    this.shareBtn = this.node.querySelector("button");

    this.closeBtn.addEventListener("click", () => {
      this.eventCreationMenu.close();
      this.toggle()
    });
    this.shareBtn.addEventListener("click", () => this.shareEvent());
  }

  toggle() {
    this.node.style.display = this.node.style.display === "flex" ? "none" : "flex";

    this.isOpen = !this.isOpen;
  }
  
  shareEvent() {
    const eventTitle = this.eventCreationMenu.eventForm.querySelector("#event_name").value;
    const eventDate = this.eventCreationMenu.event_dateInput.value; 
    const eventStart = this.eventCreationMenu.event_startInput.value; 
    const eventEnd = this.eventCreationMenu.event_endInput.value;     
    const description = this.eventCreationMenu.eventForm.querySelector("#event_description").value;
  
    const eventMessage = `📅 *${eventTitle}*\n🕒 *Date & Time:* \n ${eventDate} \n ${eventStart} - ${eventEnd} \n${description}`;
    const icsFile = this.createICSFile(eventTitle, description, eventDate, eventStart, eventEnd);
  
    if (navigator.canShare && navigator.canShare({ files: [icsFile] })) {
      navigator.share({
        title: "Event Invitation",
        text: eventMessage,
        files: [icsFile],
      })
      .then(() => console.log("ICS file shared!"))
      .catch(err => console.error("Sharing failed:", err));
    } else {
      console.warn("This device doesn't support sharing .ics files");
    }
    
    this.eventCreationMenu.close();
    this.toggle();
  }
  
  createICSFile(title, description, date, startTime, endTime) {
    const formatToICS = (dateString) => {
      return new Date(dateString).toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    };
  
    const start = new Date(`${date}T${startTime}`);
    const end = new Date(`${date}T${endTime}`);
  
    const dtStart = formatToICS(start);
    const dtEnd = formatToICS(end);
    const dtStamp = formatToICS(new Date());
  
    const icsContent = `
      BEGIN:VCALENDAR
      VERSION:2.0
      PRODID:-//MyApp//EN
      BEGIN:VEVENT
      UID:${Date.now()}@myapp.com
      DTSTAMP:${dtStamp}
      DTSTART:${dtStart}
      DTEND:${dtEnd}
      SUMMARY:${title}
      DESCRIPTION:${description}
      END:VEVENT
      END:VCALENDAR`.trim();
  
    const blob = new Blob([icsContent], { type: "text/calendar" });
    return new File([blob], `${title.replace(/\s+/g, "_")}.ics`, { type: "text/calendar" });
  }
  
}

// Event Creation Menu Class
export class EventCreationMenu {
  constructor(node) {
    this.node = node;
    this.isOpen = false;
    this.isSubmitted = false;
    this.linkCount = 0;
    this.userId = el.userId;
    this.is_online = false;
    this.firstTime = true;
    this.shareMenu = new ShareMenu(document.querySelector("#share-menu"), this);

    this.bindElements();
    this.attachEventListeners();
  }

  bindElements() {
    this.eventForm = this.node.querySelector("form");
    this.isOnlineCheckbox = this.node.querySelector("#is_online");
    this.addLinkBtn = this.node.querySelector(".addLink-btn");
    this.locationForm = this.node.querySelector(".addressContainer");
    this.closeBtn = this.node.querySelector(".close-btn");
    this.eventRepetitionLabel = this.node.querySelector("label[for='repeat_event']");

    const inputs = ["event_date", "event_start", "event_end", "event_address", "repeat_event"];
    inputs.forEach(
      (id) => (this[`${id}Input`] = this.node.querySelector(`[name='${id}']`))
    );

    this.handleRepetitionDay();
  }

  attachEventListeners() {
    this.isOnlineCheckbox.addEventListener("change", () =>
      this.toggleLocationContainer()
    );
    this.closeBtn.addEventListener("click", () => this.close());
    this.eventForm.addEventListener("submit", (e) => this.handleEventForm(e));
    this.addLinkBtn.addEventListener("click", (e) => this.addLinkInput(e));
    this.event_dateInput.addEventListener("change", () => this.handleRepetitionDay());

    [
      this.event_dateInput,
      this.event_startInput,
      this.event_endInput,
      this.event_addressInput,
    ].forEach((input) =>
      input.addEventListener("input", () => this.clearCustomValidity())
    );
  }

  open() {
    if (this.isOpen) return;
    this.isOpen = true;

    this.eventForm.reset();
    this.is_online = false;
    this.locationForm.classList.toggle("online", this.isOnlineCheckbox.checked);

    this.event_dateInput.value = new Date().toISOString().split("T")[0];
    this.event_startInput.value = new Date()
      .toTimeString()
      .split(" ")[0]
      .slice(0, 5);

    this.node.style.display = "flex";
  }

  close() {
    this.node.style.display = "none";
    this.isOpen = false;
    this.node.querySelector("ul").innerHTML = "";
    this.linkCount = 0;
    this.eventForm.querySelector("#add-event-submit").style.display = "flex";
    this.closeBtn.style.display = "flex";
    this.eventForm.reset();
  }

  toggleLocationContainer() {
    this.locationForm.classList.toggle("online", this.isOnlineCheckbox.checked);
    this.is_online = !this.is_online;
    this.linkCount === 0 ? this.addLinkBtn.click() : null;
  }

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
        </div>`;

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

  handleRepetitionDay() {
    const date = new Date(this.event_dateInput.value || Date.now());
    this.dayName = date.toLocaleDateString("en-US", { weekday: "long" });
    this.eventRepetitionLabel.style.setProperty("--dayName", `"${this.dayName}"`);
  }

  clearCustomValidity() {
    [
      this.event_dateInput,
      this.event_startInput,
      this.event_endInput,
      this.event_addressInput,
    ].forEach((input) => input.setCustomValidity(""));
  }

  validateDateAndTime(data) {
    const { event_date, event_start, event_end } = data;
    const now = new Date();
    const todayStr = now.toISOString().split("T")[0];
    const currentTimeStr = now.toTimeString().split(" ")[0].slice(0, 5);

    if (event_date < todayStr) {
      this.event_dateInput.setCustomValidity(
        "Event date cannot be in the past."
      );
      return false;
    }

    if (event_date === todayStr && event_start < currentTimeStr) {
      this.event_startInput.setCustomValidity(
        "Event start time cannot be in the past."
      );
      return false;
    }

    if (event_end && event_start >= event_end) {
      this.event_endInput.setCustomValidity(
        "Event end time must be later than start time."
      );
      return false;
    }

    return true;
  }

  validateLocation(data) {
    if (data.is_online !== "on" && !data.event_address) {
      this.event_addressInput.setCustomValidity(
        "Address is required for offline events."
      );
      return false;
    }
    return true;
  }

  checkURLs(data) {
    if (this.is_online) {
      const links = Object.keys(data).filter(
        (key) => key.startsWith("link_") && key.length === 6
      );

      if (links.length === 0) {
        alert("At least one link is required for online events.");
        return false;
      }
    }
    return true;
  }

  validateURLName(linkName, linkNameKey) {
    if (linkName === null) {
      this.node
        .querySelector(`#${linkNameKey}`)
        .setCustomValidity("Link name is required.");
      return false;
    }
    return true;
  }

  async handleEventForm(e) {
    e.preventDefault();

    const formData = new FormData(this.eventForm);
    let data = Object.fromEntries(formData.entries());

    if (
      !this.eventForm.checkValidity() ||
      !this.validateDateAndTime(data) ||
      !this.validateLocation(data) ||
      !this.checkURLs(data)
    ) {
      this.eventForm.reportValidity();
      return;
    }

    Object.keys(data).forEach((key) => {
      if (data[key].trim() === "") data[key] = null;
    });

    const links = Object.keys(data).filter(
      (key) => key.startsWith("link_") && key.length === 6
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

      const event = await response.json();
      
      if(Array.isArray(event)) {
        event.forEach((recurringEvent) => {
          addEventToCalendar(recurringEvent);
        });
      } else {
        addEventToCalendar(event);
      }
      this.eventForm.querySelector("#add-event-submit").style.display = "none";
      this.closeBtn.style.display = "none";
      this.shareMenu.toggle();
    } catch (error) {
      console.error("Error adding event:", error);
    }
  }
}
