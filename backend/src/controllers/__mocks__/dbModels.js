/**
 * Mock dbModels for Testing
 */

export const User = {
  findByPk: jest.fn(),
  findOne: jest.fn(),
  findAll: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  destroy: jest.fn()
};

export const Company = {
  findByPk: jest.fn(),
  findOne: jest.fn(),
  findAll: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  destroy: jest.fn()
};

export const Member = {
  findByPk: jest.fn(),
  findOne: jest.fn(),
  findAll: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  destroy: jest.fn()
};

export const RefreshToken = {
  findOne: jest.fn(),
  create: jest.fn(),
  destroy: jest.fn()
};

export default {
  User,
  Company,
  Member,
  RefreshToken
};
