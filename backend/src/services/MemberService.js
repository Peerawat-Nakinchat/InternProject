// src/services/MemberService.js
import { pool } from '../config/db.js';
import { MemberModel } from '../models/MemberModel.js';

/**
 * Invite / add member to organization.
 * Uses upsert behaviour in controller/model to avoid duplicates.
 */
const inviteMember = async (orgId, invitedUserId, roleId) => {
  // simple wrapper that uses model.addMemberToOrganization
  // rely on DB constraint to reject duplicates
  return MemberModel.addMemberToOrganization(null, orgId, invitedUserId, roleId);
};

/**
 * Get members of an organization
 */
const getMembersForOrg = async (orgId) => {
  return MemberModel.getMembers(orgId);
};

/**
 * Change member role (only allowed by OWNER or ADMIN from controller)
 */
const changeMemberRole = async (orgId, memberUserId, newRoleId) => {
  return MemberModel.updateMemberRole(null, orgId, memberUserId, newRoleId);
};

/**
 * Remove member.
 * If caller needs to ensure atomicity with other ops, pass client.
 */
const removeMemberFromOrg = async (orgId, memberUserId) => {
  return MemberModel.removeMember(null, orgId, memberUserId);
};

/**
 * Transfer ownership:
 * - Must be called by OWNER (controller ensures that)
 * - This will:
 *    1) update sys_organizations.owner_user_id -> new owner
 *    2) set new owner's org role to OWNER (1) (insert or update)
 *    3) set previous owner's org role to ADMIN (2) (so previous owner remains admin)
 *
 * All in one transaction.
 */
const transferOwner = async (orgId, currentOwnerUserId, newOwnerUserId) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Verify new owner is a member (if not, add them as OWNER)
    const existingRole = await MemberModel.findMemberRole(orgId, newOwnerUserId);
    if (!existingRole) {
      await MemberModel.addMemberToOrganization(client, orgId, newOwnerUserId, 1);
    } else {
      // set to OWNER
      await MemberModel.updateMemberRole(client, orgId, newOwnerUserId, 1);
    }

    // 2. Downgrade current owner to ADMIN (role_id = 2)
    await MemberModel.updateMemberRole(client, orgId, currentOwnerUserId, 2);

    // 3. Update organization owner_user_id
    const updatedOrg = await MemberModel.updateOrganizationOwner(client, orgId, newOwnerUserId);

    await client.query('COMMIT');
    return updatedOrg;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

export const MemberService = {
  inviteMember,
  getMembersForOrg,
  changeMemberRole,
  removeMemberFromOrg,
  transferOwner
};
