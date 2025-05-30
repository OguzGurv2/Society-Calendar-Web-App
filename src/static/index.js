import { EventCreationMenu } from "./eventCreation.js";
import { PopupEvent } from "./popupEvent.js";

export let el = {};

// Initialize calendar, fetch events and load popup template
document.addEventListener("DOMContentLoaded", async function () {
  try {
    el.userType = localStorage.getItem('user_type');
    if (el.userType === null) {
      window.location.href = "/";
    }
    el.userId = el.userType === 'society' ? window.location.pathname.split('/so/')[1] : window.location.pathname.split('/st/')[1];
    el.isMobile = window.innerWidth;
    el.exportCalBtn = document.querySelector("#export-calendar");
    el.eventCreationMenu = new EventCreationMenu(
      document.querySelector("#addEvent")
    );
    await PopupEvent.loadPopupTemplate();

    const events = await getEvents();
    initializeCalendar(events);
    
    el.exportCalBtn.addEventListener("click", exportCalendar);

  } catch (error) {
    console.error("Error initializing calendar:", error);
  }
});

// Fetch all events from the server
async function getEvents() {
  try {
    const response = await fetch("/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userType: el.userType, userId: el.userId }),
    });

    const data = await response.json();
    return data;

  } catch (error) {
    console.error("Error fetching events:", error);
    return [];
  }
}

// Initialize calendar with events
function initializeCalendar(events) {
  const calendarEl = document.getElementById("calendar");
  el.calendar = new FullCalendar.Calendar(calendarEl, {
    headerToolbar: {
      start: "title",
      center: (el.userType === 'student') ? "" : "addEventButton",
      end: (el.isMobile <= 768) ? "dayGridMonth,timeGridDay prev,next" : "dayGridMonth,dayGridWeek,timeGridDay prev,next",
    },
    titleFormat: { year: "numeric", month: "short", day: "numeric" },
    customButtons: {
      addEventButton: {
        text: "Add Event",
        click: () => el.eventCreationMenu.open(),
      },
    },
    initialView: (el.isMobile <= 768) ? "dayGridMonth" : "dayGridWeek",
    eventTimeFormat: { hour: "numeric", minute: "2-digit", meridiem: "short" },
    eventClick: handleEventClick,
    handleWindowResize: true,
    dateClick: function(info) {
      const currentView = el.calendar.view.type;
      if (currentView !== "timeGridDay") {
        el.calendar.changeView("timeGridDay", info.dateStr);
      }
    }
  });

  events.forEach((event) => addEventToCalendar(event));
  el.calendar.render();
}

// Handle event click on calendar
function handleEventClick(info) {
  const popup = PopupEvent.list.find(
    (popup) => popup.node.dataset.id === info.event.id
  );
  if (popup) popup.open(info.el);
}

// Add event to calendar and create a popup for it
export function addEventToCalendar(event) {
  if (!el.calendar) return;

  let sanitizedEvent = sanitizeEvent(event);
  sanitizedEvent = {...sanitizedEvent, society_name: localStorage.getItem('user_name'), society_email: localStorage.getItem('user_email')};
  new PopupEvent(sanitizedEvent);

  el.calendar.addEvent({
    id: sanitizedEvent.event_id,
    title: sanitizedEvent.event_name,
    start: `${sanitizedEvent.event_date}T${sanitizedEvent.event_start}:00`,
    end: `${sanitizedEvent.event_date}T${sanitizedEvent.event_end}:00`,
    allDay: false,
    extendedProps: {
      description: sanitizedEvent.event_description,
      links: sanitizedEvent.event_links,
      organizer: {
        name: sanitizedEvent.society_name,
        email: sanitizedEvent.society_email
      },
      location: sanitizedEvent.location
    }
  });  
}

// Update event on calendar
export function updateEventOnCalendar(updatedEvent) {
  if (!el.calendar) return;

  const calendarEvent = el.calendar.getEventById(updatedEvent.event_id);
  if (!calendarEvent) {
    console.warn("Event not found in calendar:", updatedEvent);
    return;
  }

  calendarEvent.setProp("title", updatedEvent.event_name);
  calendarEvent.setExtendedProp("description", updatedEvent.event_description);
  calendarEvent.setExtendedProp("links", updatedEvent.event_links);
  calendarEvent.setExtendedProp("location", updatedEvent.location);
  calendarEvent.setStart(
    `${updatedEvent.event_date}T${updatedEvent.event_start}:00`
  );
  calendarEvent.setEnd(
    `${updatedEvent.event_date}T${updatedEvent.event_end}:00`
  );
}

// Format and Sanitize Event 
function sanitizeEvent(event) {
  const sanitizedEvent = {};
  Object.keys(event).forEach((key) => {
    sanitizedEvent[key] = event[key] ?? ""; 
  });

  if (sanitizedEvent.is_online === 0) {
    sanitizedEvent.location = 
    `${sanitizedEvent.event_address}, ${sanitizedEvent.town}, ${sanitizedEvent.postcode}`;
  } else {
    sanitizedEvent.location = "Online";
  }

  return sanitizedEvent;
}

// export Calendar with ics.js
async function exportCalendar() {
  try {
    el.events = [];
    const currentDate = new Date();
    currentDate.setHours(0, 0, 0, 0); // Ignore the time for current date comparison

    el.calendar.getEvents().forEach((event) => {
      const eventStart = new Date(event.start);

      // Only include events that are in the future
      if (eventStart > currentDate) {
        const organizer = event.extendedProps.organizer || { name: '', email: '' };

        // Ensure description is not empty
        const description = event.extendedProps.description.trim() === "" ? "No description" : event.extendedProps.description;

        // Use formatDateForICS to convert dates into arrays
        const startDate = formatDateForICS(event.start);
        const endDate = formatDateForICS(event.end);

        el.events.push({
          title: event.title,
          description: description,
          location: event.extendedProps.location || '',
          start: startDate,
          end: endDate,
          status: "CONFIRMED",
          organizer: {
            name: organizer.name || '',
            email: organizer.email || ''
          }
        });
      }
    });

    const response = await fetch("/downloadEvents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ events: el.events }),
    });

    if (response.ok) {
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);

      const a = document.createElement('a');
      a.href = url;
      a.download = 'events.ics';
      a.click();
      window.URL.revokeObjectURL(url);
    } else {
      console.error("Failed to download ICS file");
    }

  } catch (error) {
    console.error("Error downloading events:", error);
  }
}

function formatDateForICS(date) {
  return [
    date.getFullYear(),        // Year
    date.getMonth() + 1,       // Month (1-based)
    date.getDate(),            // Day
    date.getHours(),           // Hours
    date.getMinutes()          // Minutes
  ];
}
