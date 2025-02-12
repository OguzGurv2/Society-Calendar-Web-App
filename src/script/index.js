document.addEventListener('DOMContentLoaded', function() {

    const darkenBackground = document.querySelector(".darken-background");

    // Event Creation Menu Class
    class EventCreationMenu {
        constructor(node) {
            this.node = node;
            this.closeBtn = this.node.querySelector(".close");
            this.eventForm = this.node.querySelector("form");
            this.handleCloseBtn();
            this.handleEventForm();
        }

        openMenu() {
            darkenBackground.style.display = "flex";
            this.node.style.display = "flex";
        }

        closeMenu() {
            darkenBackground.style.display = "none";
            this.node.style.display = "none";
        }

        handleCloseBtn() {
            this.closeBtn.addEventListener("click", () => {
                this.closeMenu();
            });
        }

        handleEventForm() {
            this.eventForm.addEventListener("submit", async (e) => {
                e.preventDefault();
        
                const formData = new FormData(e.target);
                const data = Object.fromEntries(formData.entries());
        
                // Post Event with /addEvent endpoint
                try {
                    const response = await fetch('/addEvent', {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify(data)
                    })

                    eventMenu.closeMenu();
                    const event = await response.json();
                    calendar.addEvent({
                        title: event.title,
                        start: `${event.date} T${event.start}:00`, // formatting start & end time into DATETIME
                        end: `${event.date} T${event.end}:00`,
                        allDay: false,
                        extendedProps: {    // calendar doesn't have description or location as a default prop
                            description: event.description,
                            location: event.location
                        }
                    });
        
                } catch (error) {
                    console.error("Error: ", error)
                }
            });
        }
        
    }

    // gets all the events from backend
    async function getAllEvents() { // this function is for testing for now
        try {
          const response = await fetch("/events");
          if (!response.ok) {
            throw new Error("Failed to fetch events");
          }
          const data = await response.json();
          return data;
          
        } catch (error) {
          console.error("Error fetching exercises:", error);
          throw error;
        }
    }

    getAllEvents().then((events) => {
        events.forEach( event => {
            calendar.addEvent({
                title: event.title,
                start: event.start,
                end: event.end,
                allDay: false,
                extendedProps: {
                    description: event.description,
                    location: event.location
                }
            });
        });
    });

    // executes event creation menu
    const eventPopup = document.querySelector('#addEvent');
    const eventMenu = new EventCreationMenu(eventPopup);

    // executes calendar element
    var calendarEl = document.getElementById('calendar');
    var calendar = new FullCalendar.Calendar(calendarEl, {
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
                click: () => eventMenu.openMenu() // OpenMenu was being called immediately without arrow function
            }
        }, 
        initialView: 'dayGridWeek',
        eventTimeFormat: { 
            hour: 'numeric',
            minute: '2-digit',
            meridiem: 'short'
        },
        // this is a custom tooltip that shows location and description of an event
        // I'm planning to change this with a pop-up which works for mobile as well
        eventDidMount: function(info) {     
            let tooltip = document.createElement("div");
            tooltip.className = "custom-tooltip";

            let description = document.createElement("p");
            description.innerText = info.event.extendedProps.description;

            let location = document.createElement("p");
            location.innerText = `Location: ${info.event.extendedProps.location}`;

            tooltip.appendChild(description);
            tooltip.appendChild(location);
            document.body.appendChild(tooltip);
    
            info.el.addEventListener("mouseenter", function(e) {
                tooltip.style.display = "block";  
                tooltip.style.left = e.pageX + 10 + "px";  
                tooltip.style.top = e.pageY + 20 + "px";   
            });
    
            info.el.addEventListener("mousemove", function(e) {
                tooltip.style.left = e.pageX + 10 + "px";  
                tooltip.style.top = e.pageY + 20 + "px";
            });
    
            info.el.addEventListener("mouseleave", function() {
                tooltip.style.display = "none";  
            });
        },
    });

    calendar.render();
});
