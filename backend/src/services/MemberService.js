// src/services/MemberService.js
import { sequelize } from '../models/dbModels.js';
import { MemberModel } from '../models/MemberModel.js'; 

const inviteMember = async (orgId, invitedUserId, roleId) => {
  return MemberModel.addMemberToOrganization(orgId, invitedUserId, roleId);
};

const getMembersForOrg = async (orgId) => {
  return MemberModel.getMembers(orgId);
};

const changeMemberRole = async (orgId, memberUserId, newRoleId) => {
  return MemberModel.updateMemberRole(orgId, memberUserId, newRoleId);
};

const removeMemberFromOrg = async (orgId, memberUserId) => {
  return MemberModel.removeMember(orgId, memberUserId);
};

const transferOwner = async (orgId, currentOwnerUserId, newOwnerUserId) => {
  const t = await sequelize.transaction();

  try {
    await MemberModel.addMemberToOrganization(orgId, newOwnerUserId, 1, t);
    await MemberModel.updateMemberRole(orgId, currentOwnerUserId, 2, t);
    await MemberModel.updateOrganizationOwner(orgId, newOwnerUserId, t);

    await t.commit();
    return { success: true };

  } catch (err) {
    await t.rollback();
    throw err;
  }
};

export const MemberService = {
  inviteMember,
  getMembersForOrg,
  changeMemberRole,
  removeMemberFromOrg,
  transferOwner
};