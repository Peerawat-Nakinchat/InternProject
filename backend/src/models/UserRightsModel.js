import { DataTypes } from 'sequelize';
import sequelize from '../config/dbConnection.js';

export const UserRights = sequelize.define('sys_menu_rights', {
  right_id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  org_id: { type: DataTypes.UUID, allowNull: false },
  user_id: { type: DataTypes.UUID, allowNull: false },
  module_code: { type: DataTypes.STRING(50), allowNull: false },
  menu_id: { type: DataTypes.STRING(10), allowNull: false }, 
  
  menu_rights_is_visible: { type: DataTypes.BOOLEAN, defaultValue: true },
}, {
  tableName: 'sys_menu_rights', 
  timestamps: true,
  createdAt: 'create_date',
  updatedAt: 'update_date',
  indexes: [{ unique: true, fields: ['org_id', 'user_id', 'menu_id'] }]
});

// --- Repository Functions ---

const findOverride = async (userId, orgId, menuId) => {
  return await UserRights.findOne({
    where: { user_id: userId, org_id: orgId, menu_id: menuId },
  });
};

// บันทึก/แก้ไข Override
const upsertOverride = async (userId, orgId, moduleCode, menuId, isVisible) => {
  return await UserRights.upsert({
    user_id: userId,
    org_id: orgId,
    module_code: moduleCode,
    menu_id: menuId,
    menu_rights_is_visible: isVisible,
  });
};

const removeOverride = async (userId, orgId, menuId) => {
  return await UserRights.destroy({
    where: { user_id: userId, org_id: orgId, menu_id: menuId }
  });
};

const findAllByOrg = async (orgId) => {
  return await UserRights.findAll({
    where: { org_id: orgId },
    attributes: ['user_id', 'menu_id', 'menu_rights_is_visible']
  });
};

export default { UserRights, findOverride, upsertOverride, removeOverride, findAllByOrg };