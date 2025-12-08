// src/constants/roles.js
export const ROLE_ID = {
  OWNER: 1,
  ADMIN: 2,
  MEMBER: 3,
  VIEWER: 4,
  AUDITOR: 5
};

export const ROLE_NAME = {
  1: 'OWNER',
  2: 'ADMIN',
  3: 'MEMBER',
  4: 'VIEWER',
  5: 'AUDITOR'
};

export const ROLE_HIERARCHY = {
  [ROLE_ID.OWNER]: 100,
  [ROLE_ID.ADMIN]: 80,
  [ROLE_ID.AUDITOR]: 60,
  [ROLE_ID.MEMBER]: 40,
  [ROLE_ID.VIEWER]: 20
};

export const ROLE_PERMISSIONS = {
  [ROLE_ID.OWNER]: ['all'],
  [ROLE_ID.ADMIN]: ['manage_users', 'view_logs', 'manage_content'],
  [ROLE_ID.MEMBER]: ['create_content', 'edit_own_content'],
  [ROLE_ID.AUDITOR]: ['view_logs', 'read_only'],
  [ROLE_ID.VIEWER]: ['read_only']
};