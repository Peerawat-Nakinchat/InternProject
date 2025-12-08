// src/models/InvitationModel.js
import { DataTypes, Op } from 'sequelize';
import sequelize from "../config/dbConnection.js";
import { ROLE_ID } from "../constants/roles.js"; 
import { INVITATION_STATUS } from "../constants/invitations.js"; 

export const Invitation = sequelize.define('sys_invitations', {
  invitation_id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  email: {
    type: DataTypes.STRING(255),
    allowNull: false,
    validate: {
      isEmail: true,
      notEmpty: true
    }
  },
  org_id: {
    type: DataTypes.UUID,
    allowNull: false
  },
  role_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: {
      isIn: {
        args: [Object.values(ROLE_ID)],
        msg: "Invalid Role ID"
      }
    }
  },
  token: {
    type: DataTypes.STRING(500),
    allowNull: false,
    unique: true
  },
  invited_by: {
    type: DataTypes.UUID,
    allowNull: false,
    comment: 'User ID ของคนที่ส่งคำเชิญ'
  },
  status: {
    // ใช้ Values จาก Constant มาสร้าง Enum ของ Database
    type: DataTypes.ENUM(...Object.values(INVITATION_STATUS)),
    defaultValue: INVITATION_STATUS.PENDING
  },
  expires_at: {
    type: DataTypes.DATE,
    allowNull: false
  },
  accepted_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  created_date: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  updated_date: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  timestamps: true,
  tableName: 'sys_invitations',
  createdAt: 'created_date',
  updatedAt: 'updated_date',
  indexes: [
    { fields: ['email'] },
    { fields: ['org_id'] },
    { fields: ['status'] },
    { fields: ['token'], unique: true }
  ]
});

// ==================== REPOSITORY METHODS ====================

const create = async (data, transaction = null) => {
  return await Invitation.create({
    ...data,
    email: data.email.toLowerCase().trim(),
    role_id: data.role_id || ROLE_ID.VIEWER,
    status: INVITATION_STATUS.PENDING
  }, { transaction });
};

const findByToken = async (token) => {
  return await Invitation.findOne({ where: { token } });
};

const findByEmail = async (email, orgId = null) => {
  const where = { 
    email: email.toLowerCase().trim(), 
    status: INVITATION_STATUS.PENDING 
  };
  
  if (orgId) where.org_id = orgId;
  
  return await Invitation.findAll({ where });
};

const updateStatus = async (invitationId, status, transaction = null) => {
  return await Invitation.update(
    { 
      status,
      // ถ้าสถานะเป็น Accepted ให้ลงเวลาด้วย
      ...(status === INVITATION_STATUS.ACCEPTED && { accepted_at: new Date() })
    },
    { 
      where: { invitation_id: invitationId },
      transaction 
    }
  );
};

const findPendingByOrg = async (orgId) => {
  return await Invitation.findAll({
    where: { 
      org_id: orgId,
      status: INVITATION_STATUS.PENDING,
      expires_at: { [Op.gt]: new Date() }
    }
  });
};

const expireOldInvitations = async () => {
  return await Invitation.update(
    { status: INVITATION_STATUS.EXPIRED },
    {
      where: {
        status: INVITATION_STATUS.PENDING,
        expires_at: { [Op.lt]: new Date() }
      }
    }
  );
};

const deleteById = async (invitationId, transaction = null) => {
  return await Invitation.destroy({
    where: { invitation_id: invitationId },
    transaction
  });
};

const existsPending = async (email, orgId) => {
  const count = await Invitation.count({
    where: {
      email: email.toLowerCase().trim(),
      org_id: orgId,
      status: INVITATION_STATUS.PENDING,
      expires_at: { [Op.gt]: new Date() }
    }
  });
  return count > 0;
};

export const InvitationModel = {
  create,
  findByToken,
  findByEmail,
  updateStatus,
  findPendingByOrg,
  expireOldInvitations,
  deleteById,
  existsPending
};

export default InvitationModel;