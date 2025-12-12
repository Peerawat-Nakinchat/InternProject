import { DataTypes } from 'sequelize';
import sequelize from '../config/dbConnection.js';

export const RolePermission = sequelize.define('sys_role_permission', {
  role_permission_id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  role_id: { type: DataTypes.INTEGER, allowNull: false },
  menu_ref_id: { type: DataTypes.UUID, allowNull: false },
  action_type: { type: DataTypes.STRING(20), defaultValue: 'VIEW', allowNull: false },
}, {
  tableName: 'sys_role_permission',
  timestamps: true,
  createdAt: 'created_date',
  updatedAt: false,
  indexes: [{ unique: true, fields: ['role_id', 'menu_ref_id', 'action_type'] }]
});

// Repository Functions
const checkPermission = async (roleId, menuRefId) => {
  const perm = await RolePermission.findOne({
    where: { role_id: roleId, menu_ref_id: menuRefId }
  });
  return !!perm; // คืนค่า true/false
};

export default { 
  RolePermission, 
  checkPermission 
};