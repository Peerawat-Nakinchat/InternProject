// src/services/RoleService.js
import { RoleModel } from "../models/RoleModel.js";
import { ROLE_ID, ROLE_HIERARCHY, ROLE_PERMISSIONS } from "../constants/roles.js";
import { createError } from "../middleware/errorHandler.js"; 

const getAllRoles = async () => {
  const roles = await RoleModel.findAllActive();
  const rolesJson = roles.map(r => r.toJSON());

  rolesJson.sort((a, b) => {
    const levelA = ROLE_HIERARCHY[a.role_id] || 0;
    const levelB = ROLE_HIERARCHY[b.role_id] || 0;
    return levelB - levelA;
  });

  return rolesJson;
};

const getRoleById = async (roleId) => {
  const role = await RoleModel.findById(roleId);
  if (!role) {
      throw createError.notFound(`ไม่พบ Role ID ${roleId}`);
  }
  return role;
};

const isHigherRole = (userRoleId, targetRoleId) => {
  const userLevel = ROLE_HIERARCHY[userRoleId] || 0;
  const targetLevel = ROLE_HIERARCHY[targetRoleId] || 0;
  return userLevel > targetLevel;
};

const getPermissions = (roleId) => {
  return ROLE_PERMISSIONS[roleId] || [];
};

const isValidRoleId = (roleId) => {
  return Object.values(ROLE_ID).includes(parseInt(roleId));
};

export const RoleService = {
  getAllRoles,
  getRoleById,
  isHigherRole,
  getPermissions,
  isValidRoleId
};

export default RoleService;