-- Table: student
CREATE TABLE IF NOT EXISTS student (
    student_id CHAR(32) PRIMARY KEY,
    student_up_number CHAR(7) UNIQUE NOT NULL,
    student_email CHAR(22) UNIQUE NOT NULL,
    student_password CHAR(60) NOT NULL
);

-- Table: society
CREATE TABLE IF NOT EXISTS society (
    society_id CHAR(36) PRIMARY KEY,
    society_name VARCHAR(255) NOT NULL,
    society_status BOOLEAN NOT NULL,
    society_email VARCHAR(255) NOT NULL,
    society_password CHAR(60) NOT NULL
);

-- Table: event
CREATE TABLE IF NOT EXISTS event (
    event_id CHAR(36) PRIMARY KEY,
    event_name VARCHAR(55) NOT NULL,
    event_description TEXT,
    event_date DATE NOT NULL,
    event_start CHAR(5) NOT NULL,
    event_end CHAR(5) NOT NULL,
    event_status TEXT CHECK(event_status IN ('Scheduled', 'Completed' , 'Canceled')) NOT NULL,
    event_links TEXT,
    society_id CHAR(36), 
    FOREIGN KEY (society_id) REFERENCES society(society_id) ON DELETE CASCADE
);

-- Table: event_location 
CREATE TABLE IF NOT EXISTS event_location (
    event_id CHAR(36) PRIMARY KEY, 
    event_address VARCHAR(255),
    postcode CHAR(7),
    town VARCHAR(50),
    is_online BOOLEAN NOT NULL,
    FOREIGN KEY (event_id) REFERENCES event(event_id) ON DELETE CASCADE
);

-- Table: student_society 
CREATE TABLE IF NOT EXISTS student_society (
    student_id CHAR(7),
    society_id CHAR(36),
    is_enrolled BOOLEAN NOT NULL,
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

INSERT INTO society (society_id, society_name, society_status, society_email, society_password) VALUES
('550e8400-e29b-41d4-a716-446655440000', 'IT Society', true, 'it@upsu.net', '$2a$14$DuVTGXx99BmuD2MEKpZ2suVz0dd9z.Bcr1iJHbk1x6LpQbexDqq2a'),
('c0a80102-65c3-4fd5-9e37-7b74b1c5a9e8', 'Pharmacy Society', false, 'pharmacy@upsu.net', '$2a$14$xJSXPDNqqDXi2zNSrmnnd.HtUfvR2weQRsZmKlywbOtvKAhpmk0qG'),
('3d72b1a6-f2b6-4c0c-a034-3a54a9b6d26e', 'Cinema Society', true, 'cinema@upsu.net', '$2a$14$y0BOROJ1onxrf6vY1eWjxeFELpP0LAivO5a2tp0.b3NwhKZH/4xYO'),
('a4b1c2d3-89e7-45f1-b8c9-112233445566', 'Krishna Consciousness', true, 'krishnaconsciousness@upsu.net', '$2a$14$3XxGWGyDoX55nO.2Yhl9SO9CN/UTvbjqSUdrR/vbzTw7grS71XVTS');

INSERT INTO student (student_id, student_up_number, student_email, student_password) VALUES
('53b1aa3b-1482-45a0-a784-cf2b69e5ebf2', '2157044', 'up2157044@myport.ac.uk', '$2a$14$X6uWIKVuSK88Uc0lFqxDE.4MKcoZo5mClMXqIxKIKvhI2Lc8bBNES'),
('188c139f-f34e-4f94-a5c8-5541325490a1', '2200104', 'up2200104@myport.ac.uk', '$2a$14$BtvsWs2SrKcCvksV1jrBn.gDkCFr764M0Jta6fwN.2ulhc0V38QNe'),
('3f3f243f-8b04-48de-ad03-905993aef80c', '2157400', 'up2157400@myport.ac.uk', '$2a$14$MxJczAsWHg1wg7ZcT.1LAOk071Wd1f4uOXJVnJWznq7TG.21qzaBG'),
('9632f3a5-b226-4a82-b5af-6f28593e63b6', '2015704', 'up2015704@myport.ac.uk', '$2a$14$2RYPdjrZczXVW3/qeV7yueCWyk4TuxvBJ3yHkLBV154GuhQpVhW6y'),
('2a9b9f1d-b490-4d95-b7b2-2de9bc8f900b', '2047743', 'up2047743@myport.ac.uk', '$2a$14$MoGRzsxR99bU5Micum.Mke2EDpPSwj0bHcaucctrqE/DTkXgEOGEi');

INSERT INTO student_society (student_id, society_id, is_enrolled) VALUES
('53b1aa3b-1482-45a0-a784-cf2b69e5ebf2', '550e8400-e29b-41d4-a716-446655440000', true),
('53b1aa3b-1482-45a0-a784-cf2b69e5ebf2', 'c0a80102-65c3-4fd5-9e37-7b74b1c5a9e8', false),
('53b1aa3b-1482-45a0-a784-cf2b69e5ebf2', '3d72b1a6-f2b6-4c0c-a034-3a54a9b6d26e', true),
('53b1aa3b-1482-45a0-a784-cf2b69e5ebf2', 'a4b1c2d3-89e7-45f1-b8c9-112233445566', false);
