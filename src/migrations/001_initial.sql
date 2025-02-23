-- Table: student
CREATE TABLE IF NOT EXISTS student (
    student_id CHAR(7) PRIMARY KEY,
    email CHAR(22) UNIQUE NOT NULL
);

-- Table: society
CREATE TABLE IF NOT EXISTS society (
    society_id CHAR(36) PRIMARY KEY,
    society_name VARCHAR(255) NOT NULL,
    society_status BOOLEAN
);

-- Table: event
CREATE TABLE IF NOT EXISTS event (
    event_id CHAR(36) PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    event_description TEXT,
    event_date DATE NOT NULL,
    event_start CHAR(5) NOT NULL,
    event_end CHAR(5) NOT NULL,
    event_status TEXT CHECK(event_status IN ('Scheduled', 'Completed' , 'Canceled')) NOT NULL
);

-- Table: event_location 
CREATE TABLE IF NOT EXISTS event_location (
    event_id CHAR(36) PRIMARY KEY,  
    is_online BOOLEAN,
    address_1 VARCHAR(255),
    address_2 VARCHAR(255),
    town VARCHAR(255),
    postcode CHAR(7),
    FOREIGN KEY (event_id) REFERENCES event(event_id) ON DELETE CASCADE
);

-- Table: student_society 
CREATE TABLE IF NOT EXISTS student_society (
    student_id CHAR(7),
    society_id CHAR(36),
    student_role TEXT CHECK(student_role IN ('Member', 'Committee', 'President')) NOT NULL,
    can_create BOOLEAN DEFAULT FALSE,
    can_edit BOOLEAN DEFAULT FALSE,
    can_delete BOOLEAN DEFAULT FALSE,
    PRIMARY KEY (student_id, society_id),
    FOREIGN KEY (student_id) REFERENCES student(student_id),
    FOREIGN KEY (society_id) REFERENCES society(society_id)
);

-- Table: student_event 
CREATE TABLE IF NOT EXISTS student_event (
    event_id CHAR(36),
    student_id CHAR(7),
    attendance TEXT CHECK(attendance IN ('Attended', 'Absent', 'Pending')) NOT NULL,
    PRIMARY KEY (event_id, student_id),
    FOREIGN KEY (event_id) REFERENCES event(event_id),
    FOREIGN KEY (student_id) REFERENCES student(student_id)
);
