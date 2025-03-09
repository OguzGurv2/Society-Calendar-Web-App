import { EventCreationMenu } from "./eventCreation.js";
import { PopupEvent } from "./popupEvent.js";

let el = {};

// Initialize calendar, fetch events and load popup template
document.addEventListener("DOMContentLoaded", async function () {
  try {
    el.userType = localStorage.getItem('user_type');
    el.isMobile = window.innerWidth;
    el.eventCreationMenu = new EventCreationMenu(
      document.querySelector("#addEvent")
    );
    await PopupEvent.loadPopupTemplate();

    const events = await getAllEvents();
    initializeCalendar(events);

  } catch (error) {
    console.error("Error initializing calendar:", error);
  }
});

// Fetch all events from the server
async function getAllEvents() {
  try {
    const response = await fetch("/events");
    if (!response.ok) throw new Error("Failed to fetch events");
    return await response.json();
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
    initialView: "dayGridWeek",
    eventTimeFormat: { hour: "numeric", minute: "2-digit", meridiem: "short" },
    eventClick: handleEventClick,
    handleWindowResize: true,
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

  const sanitizedEvent = sanitizeEvent(event);
  new PopupEvent(sanitizedEvent);
  el.calendar.addEvent({
    id: sanitizedEvent.event_id,
    title: sanitizedEvent.event_name,
    start: `${sanitizedEvent.event_date}T${sanitizedEvent.event_start}:00`,
    end: `${sanitizedEvent.event_date}T${sanitizedEvent.event_end}:00`,
    allDay: false,
  });
}

// Update event on calendar
export function updateEventOnCalendar(updatedEvent) {
  if (!el.calendar) return;

  const calendarEvent = calendar.getEventById(updatedEvent.event_id);
  if (!calendarEvent) {
    console.warn("Event not found in calendar:", updatedEvent);
    return;
  }

  calendarEvent.setProp("title", updatedEvent.event_name);
  calendarEvent.setStart(
    `${updatedEvent.event_date}T${updatedEvent.event_start}:00`
  );
  calendarEvent.setEnd(
    `${updatedEvent.event_date}T${updatedEvent.event_end}:00`
  );
}

// Remove event from calendar
function sanitizeEvent(event) {
  const sanitizedEvent = {};
  Object.keys(event).forEach((key) => {
    sanitizedEvent[key] = event[key] ?? ""; // Replace null/undefined with empty string
  });
  return sanitizedEvent;
}
