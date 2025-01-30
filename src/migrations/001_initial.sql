CREATE TABLE IF NOT EXISTS events (
    event_id CHAR(36),
    title VARCHAR(50),
    description VARCHAR(255),
    location VARCHAR(50),
    start TIMESTAMP,
    end TIMESTAMP,
    status VARCHAR(50) DEFAULT 'CONFIRMED'
);
