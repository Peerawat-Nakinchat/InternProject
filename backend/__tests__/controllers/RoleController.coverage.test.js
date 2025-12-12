/**
 * RoleController Coverage Tests
 * Targets 100% Code Coverage
 */

import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { fileURLToPath } from 'url';
import path from 'path';

// ✅ 1. Setup Absolute Paths
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const roleControllerPath = path.resolve(__dirname, '../../src/controllers/RoleController.js');
const roleServicePath = path.resolve(__dirname, '../../src/services/RoleService.js');

// ✅ 2. Mock RoleService
// RoleController ใช้ default import ดังนั้นเราต้อง mock default export
const mockRoleService = {
  getAllRoles: jest.fn(),
  getRoleById: jest.fn(),
  getPermissions: jest.fn()
};

await jest.unstable_mockModule(roleServicePath, () => ({
  default: mockRoleService
}));

// ✅ 3. Import Controller
const RoleControllerModule = await import(roleControllerPath);
// ดึง named exports และ default export มาทดสอบ
const { getAllRoles, getRoleById, getRolePermissions, default: DefaultExport } = RoleControllerModule;

describe('RoleController', () => {
  let req;
  let res;
  let next;

  beforeEach(() => {
    jest.clearAllMocks();

    req = {
      params: {},
      body: {},
      query: {}
    };

    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };

    next = jest.fn();
  });

  describe('Exports', () => {
    it('should export functions correctly via default export', () => {
      expect(DefaultExport.getAllRoles).toBeDefined();
      expect(DefaultExport.getRoleById).toBeDefined();
      expect(DefaultExport.getRolePermissions).toBeDefined();
    });
  });

  describe('getAllRoles', () => {
    it('should return all roles with status 200', async () => {
      // Arrange
      const mockRoles = [{ id: 1, name: 'Admin' }, { id: 2, name: 'User' }];
      mockRoleService.getAllRoles.mockResolvedValue(mockRoles);

      // Act
      await getAllRoles(req, res, next);

      // Assert
      expect(mockRoleService.getAllRoles).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockRoles
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should handle errors and call next()', async () => {
      // Arrange
      const error = new Error('Database error');
      mockRoleService.getAllRoles.mockRejectedValue(error);

      // Act
      await getAllRoles(req, res, next);

      // Assert
      expect(next).toHaveBeenCalledWith(error);
      expect(res.json).not.toHaveBeenCalled();
    });
  });

  describe('getRoleById', () => {
    it('should return role data when id is provided', async () => {
      // Arrange
      req.params.id = '123';
      const mockRole = { id: '123', name: 'Manager' };
      mockRoleService.getRoleById.mockResolvedValue(mockRole);

      // Act
      await getRoleById(req, res, next);

      // Assert
      expect(mockRoleService.getRoleById).toHaveBeenCalledWith('123');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockRole
      });
    });

    it('should handle errors when service fails', async () => {
      // Arrange
      req.params.id = '999';
      const error = new Error('Role not found');
      mockRoleService.getRoleById.mockRejectedValue(error);

      // Act
      await getRoleById(req, res, next);

      // Assert
      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe('getRolePermissions', () => {
    it('should return permissions for a role', async () => {
      // Arrange
      req.params.id = 'role-1';
      const mockPermissions = ['read:users', 'write:users'];
      
      // Note: ใน Code Controller ที่ให้มา `getPermissions` ถูกเรียกแบบ Synchronous (ไม่มี await)
      // ดังนั้นเรา Mock แบบ return value ธรรมดา
      mockRoleService.getPermissions.mockReturnValue(mockPermissions);

      // Act
      await getRolePermissions(req, res, next);

      // Assert
      expect(mockRoleService.getPermissions).toHaveBeenCalledWith('role-1');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockPermissions
      });
    });

    it('should handle errors (synchronous error)', async () => {
      // Arrange
      req.params.id = 'invalid';
      const error = new Error('Invalid Role ID');
      
      // Mock ให้ throw error ออกมา
      mockRoleService.getPermissions.mockImplementation(() => {
        throw error;
      });

      // Act
      await getRolePermissions(req, res, next);

      // Assert
      expect(next).toHaveBeenCalledWith(error);
    });
  });
});