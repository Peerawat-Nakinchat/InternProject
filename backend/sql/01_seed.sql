-- 01_seed.sql
-- NOTE: Replace password hashes with real bcrypt hashes before using in production.

INSERT INTO users (email, password, name) VALUES
('owner@acme.com', '$2b$10$EXAMPLEHASH_OWNER', 'Owner Acme'),
('alice@acme.com', '$2b$10$EXAMPLEHASH_ALICE', 'Alice'),
('bob@acme.com', '$2b$10$EXAMPLEHASH_BOB', 'Bob'),
('viewer@other.com', '$2b$10$EXAMPLEHASH_VIEW', 'Viewer');

INSERT INTO companies (name, owner_id) VALUES
('Acme Ltd', 1),
('Other Co', 4);

INSERT INTO company_members (company_id, user_id, role, invited_by) VALUES
(1,1,'owner',1),
(1,2,'admin',1),
(1,3,'user',1),
(2,4,'owner',4);
