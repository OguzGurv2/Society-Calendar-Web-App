import { EventCreationMenu } from './eventCreationClass.js';
import { PopupManager } from './popupManagerClass.js';

var calendar = null;

document.addEventListener('DOMContentLoaded', function () {

    async function getAllEvents() {
        try {
            const response = await fetch("/events");
            if (!response.ok) {
                throw new Error("Failed to fetch events");
            }
            const data = await response.json();
            return data;
        } catch (error) {
            console.error("Error fetching events:", error);
            throw error;
        }
    } 

    PopupManager.loadPopupTemplate().then(getAllEvents().then((events) => {
        events.forEach(event => {
            const sanitizedEvent = {};
            
            Object.keys(event).forEach(key => {
                sanitizedEvent[key] = event[key] === null ? "" : event[key]; // Replace null with empty string
            });
                    
            new PopupManager(sanitizedEvent);
            calendar.addEvent({
                id: sanitizedEvent.event_id,
                title: sanitizedEvent.title,
                start: `${sanitizedEvent.event_date}T${sanitizedEvent.event_start}:00`,
                end: `${sanitizedEvent.event_date}T${sanitizedEvent.event_end}:00`,
                allDay: false
            });
        });
    }));

    const addEvent = document.querySelector('#addEvent');
    const eventMenu = new EventCreationMenu(addEvent);

    var calendarEl = document.getElementById('calendar');
    calendar = new FullCalendar.Calendar(calendarEl, {
        headerToolbar: {
            start: 'title',
            center: 'addEventButton',
            end: 'dayGridMonth,dayGridWeek,timeGridDay prev,next'
        },
        titleFormat: {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        },
        customButtons: {
            addEventButton: {
                text: 'add event',
                click: () => eventMenu.openMenu()
            }
        },
        initialView: 'dayGridWeek',
        eventTimeFormat: {
            hour: 'numeric',
            minute: '2-digit',
            meridiem: 'short'
        },
        eventDidMount: function (info) {
            info.el.addEventListener("click", function () {
                info.el.classList.add("active");
                const popup = PopupManager.list.find(popup => popup.node.getAttribute('data') === `id: '${info.event._def.publicId}'`);
                popup.open(info.el);
            });
        },
    });

    calendar.render();
});

export function addEventToCalendar(event) {
    const sanitizedEvent = {};

    Object.keys(event).forEach(key => {
        sanitizedEvent[key] = event[key] === null ? "" : event[key]; 
    });

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
    const calendarEvent = calendar.getEventById(updatedEvent.event_id)
    calendarEvent.setProp("title", `${updatedEvent.title}`);
    calendarEvent.setStart(`${updatedEvent.event_date}T${updatedEvent.event_start}:00`);
    calendarEvent.setEnd(`${updatedEvent.event_date}T${updatedEvent.event_end}:00`);
}
