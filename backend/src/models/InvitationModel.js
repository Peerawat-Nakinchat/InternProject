// src/models/InvitationModel.js
import { DataTypes } from 'sequelize';
import sequelize from "../config/dbConnection.js";

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
      isEmail: true
    }
  },
  org_id: {
    type: DataTypes.UUID,
    allowNull: false
  },
  role_id: {
    type: DataTypes.INTEGER,
    allowNull: false
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
    type: DataTypes.ENUM('pending', 'accepted', 'rejected', 'expired', 'cancelled'),
    defaultValue: 'pending'
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

// Model methods
const create = async (data, transaction = null) => {
  return await Invitation.create(data, { transaction });
};

const findByToken = async (token) => {
  return await Invitation.findOne({ where: { token } });
};

const findByEmail = async (email, orgId = null) => {
  const where = { email, status: 'pending' };
  if (orgId) where.org_id = orgId;
  
  return await Invitation.findAll({ where });
};

const updateStatus = async (invitationId, status, transaction = null) => {
  return await Invitation.update(
    { 
      status,
      ...(status === 'accepted' && { accepted_at: new Date() })
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
      status: 'pending',
      expires_at: { [sequelize.Sequelize.Op.gt]: new Date() }
    }
  });
};

const expireOldInvitations = async () => {
  return await Invitation.update(
    { status: 'expired' },
    {
      where: {
        status: 'pending',
        expires_at: { [sequelize.Sequelize.Op.lt]: new Date() }
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

export const InvitationModel = {
  create,
  findByToken,
  findByEmail,
  updateStatus,
  findPendingByOrg,
  expireOldInvitations,
  deleteById
};

export default InvitationModel;