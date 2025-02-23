import { EventCreationMenu } from './eventCreationClass.js';
import { PopupManager } from './popupManagerClass.js';

let calendar = null;

document.addEventListener('DOMContentLoaded', async function () {
    try {
        await PopupManager.loadPopupTemplate();
        const events = await getAllEvents();
        initializeCalendar(events);
    } catch (error) {
        console.error("Error initializing calendar:", error);
    }
});

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

const eventCreationMenu = new EventCreationMenu(document.querySelector("#addEvent"));

function initializeCalendar(events) {
    const calendarEl = document.getElementById('calendar');
    calendar = new FullCalendar.Calendar(calendarEl, {
        headerToolbar: {
            start: 'title',
            center: 'addEventButton',
            end: 'dayGridMonth,dayGridWeek,timeGridDay prev,next'
        },
        titleFormat: { year: 'numeric', month: 'short', day: 'numeric' },
        customButtons: {
            addEventButton: {
                text: 'Add Event',
                click: () => eventCreationMenu.openMenu()
            }
        },
        initialView: 'dayGridWeek',
        eventTimeFormat: { hour: 'numeric', minute: '2-digit', meridiem: 'short' },
        eventClick: handleEventClick,
    });

    events.forEach(event => addEventToCalendar(event));
    calendar.render();
}

function handleEventClick(info) {
    const popup = PopupManager.list.find(popup => popup.node.dataset.id === info.event.id);
    if (popup) popup.open(info.el);
}

export function addEventToCalendar(event) {
    if (!calendar) return;
    
    const sanitizedEvent = sanitizeEvent(event);
    new PopupManager(sanitizedEvent);
    calendar.addEvent({
        id: sanitizedEvent.event_id,
        title: sanitizedEvent.title,
        start: `${sanitizedEvent.event_date}T${sanitizedEvent.event_start}:00`,
        end: `${sanitizedEvent.event_date}T${sanitizedEvent.event_end}:00`,
        allDay: false
    });    
}

export function updateEventOnCalendar(updatedEvent) {
    if (!calendar) return;
    
    const calendarEvent = calendar.getEventById(updatedEvent.event_id);
    if (!calendarEvent) {
        console.warn("Event not found in calendar:", updatedEvent);
        return;
    }
    
    calendarEvent.setProp("title", updatedEvent.title);
    calendarEvent.setStart(`${updatedEvent.event_date}T${updatedEvent.event_start}:00`);
    calendarEvent.setEnd(`${updatedEvent.event_date}T${updatedEvent.event_end}:00`);
}

function sanitizeEvent(event) {
    const sanitizedEvent = {};
    Object.keys(event).forEach(key => {
        sanitizedEvent[key] = event[key] ?? ""; // Replace null/undefined with empty string
    });
    return sanitizedEvent;
}
