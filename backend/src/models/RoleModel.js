// src/models/RoleModel.js
import { DataTypes, Op } from 'sequelize';
import sequelize from "../config/dbConnection.js";

// ==================== SCHEMA DEFINITION ====================
export const Role = sequelize.define('sys_role', {
  role_id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true, 
    allowNull: false
  },
  role_name: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: {
      name: 'unique_role_name',
      msg: 'ชื่อ Role นี้มีอยู่ในระบบแล้ว'
    },
    validate: {
      notEmpty: { msg: 'กรุณาระบุชื่อ Role' }
    }
  },
  description: {
    type: DataTypes.STRING(255),
    allowNull: true,
    defaultValue: null
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    allowNull: false
  },
  create_date: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    field: 'create_date'
  },
  update_date: {
    type: DataTypes.DATE,
    field: 'update_date'
  }
}, {
  timestamps: true,       
  createdAt: 'create_date',
  updatedAt: 'update_date',
  tableName: 'sys_role'
});

// ==================== DATA ACCESS METHODS (Repository) ====================

/**
 * ค้นหา Role ด้วย ID
 */
const findById = async (roleId) => {
  return await Role.findByPk(roleId);
};

/**
 * ค้นหา Role ด้วยชื่อ (เช่น 'ADMIN', 'USER')
 */
const findByName = async (roleName) => {
  return await Role.findOne({
    where: { role_name: roleName }
  });
};

/**
 * ดึง Role ทั้งหมดที่ Active
 * (ส่งคืนตามลำดับ ID ปกติ ส่วนการเรียงตามยศ ให้ Service จัดการเอง)
 */
const findAllActive = async () => {
  return await Role.findAll({
    where: { is_active: true },
    order: [['role_id', 'ASC']]
  });
};

/**
 * สร้าง Role ใหม่
 * รองรับ Transaction สำหรับความปลอดภัย
 */
const create = async (roleData, transaction = null) => {
  return await Role.create({
    role_name: roleData.role_name,
    description: roleData.description,
    is_active: true
  }, { transaction });
};

/**
 * ตรวจสอบว่ามีชื่อ Role นี้อยู่แล้วหรือไม่ (ใช้สำหรับการ Validate)
 */
const existsByName = async (roleName) => {
  const count = await Role.count({
    where: { role_name: roleName }
  });
  return count > 0;
};

// ==================== EXPORTS ====================
export const RoleModel = {
  Role,
  findById,
  findByName,
  findAllActive,
  create,
  existsByName
};

export default RoleModel;