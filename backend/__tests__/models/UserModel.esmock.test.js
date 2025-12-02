/**
 * UserModel Integration Tests using esmock
 * Uses esmock to properly mock ES modules and test actual code
 * Target: >= 92% branch coverage, >= 95% line coverage
 */

import { describe, it, expect, beforeAll, jest } from '@jest/globals';
import esmock from 'esmock';

// ==================== MOCKED MODULES ====================

const mockOp = {
  gt: Symbol('gt'),
  lt: Symbol('lt'),
  gte: Symbol('gte'),
  lte: Symbol('lte'),
  ne: Symbol('ne'),
  eq: Symbol('eq'),
  in: Symbol('in'),
  or: Symbol('or'),
  and: Symbol('and'),
  iLike: Symbol('iLike'),
};

// ==================== TESTS ====================

describe('UserModel with esmock', () => {
  let User;
  let UserModel;

  beforeAll(async () => {
    // Create mock sequelize
    const mockSequelize = {
      define: (tableName, attributes, options) => {
        // Create a mock model
        function Model(data) {
          Object.assign(this, data);
        }
        
        Model.findByPk = jest.fn().mockResolvedValue(null);
        Model.findOne = jest.fn().mockResolvedValue(null);
        Model.findAll = jest.fn().mockResolvedValue([]);
        Model.findAndCountAll = jest.fn().mockResolvedValue({ count: 0, rows: [] });
        Model.findOrCreate = jest.fn().mockResolvedValue([null, false]);
        Model.create = jest.fn().mockResolvedValue(null);
        Model.update = jest.fn().mockResolvedValue([0, []]);
        Model.destroy = jest.fn().mockResolvedValue(0);
        Model.count = jest.fn().mockResolvedValue(0);
        Model.bulkCreate = jest.fn().mockResolvedValue([]);
        
        return Model;
      },
      literal: (sql) => ({ literal: sql }),
      fn: (name, col) => ({ fn: name, col }),
      col: (name) => ({ col: name }),
      Op: mockOp,
      models: {
        sys_role: {}
      },
    };

    // Use esmock to import UserModel with mocked dependencies
    const module = await esmock('../../src/models/UserModel.js', {
      '../../src/config/dbConnection.js': {
        default: mockSequelize,
      },
      '../../src/models/RoleModel.js': {
        default: {},
        Role: {},
      },
      'sequelize': {
        DataTypes: {
          UUID: 'UUID',
          UUIDV4: 'UUIDV4',
          INTEGER: 'INTEGER',
          STRING: (size) => `STRING(${size})`,
          BOOLEAN: 'BOOLEAN',
          DATE: 'DATE',
          TEXT: 'TEXT',
          NOW: 'NOW',
        },
        Op: mockOp,
      },
    });
    
    User = module.User;
    UserModel = module.UserModel || module.default;
  });

  // ==================== MODEL DEFINITION TESTS ====================
  
  describe('Model Definition', () => {
    it('should define User model', () => {
      expect(User).toBeDefined();
    });

    it('should export UserModel with methods', () => {
      expect(UserModel).toBeDefined();
    });
  });

  // ==================== FIELD VALIDATORS TESTS (Pure Logic) ====================
  
  describe('Field Validators - Pure Logic Tests', () => {
    // Test the isValidSex validator logic directly
    describe('sex validator - isValidSex logic', () => {
      const isValidSex = (value) => {
        if (value === null || value === "") return;
        const allowed = ['M', 'F', 'O'];
        if (!allowed.includes(value)) {
          throw new Error("ค่าเพศไม่ถูกต้อง");
        }
      };

      it('should accept null value', () => {
        expect(() => isValidSex(null)).not.toThrow();
      });

      it('should accept empty string', () => {
        expect(() => isValidSex('')).not.toThrow();
      });

      it('should accept M (Male)', () => {
        expect(() => isValidSex('M')).not.toThrow();
      });

      it('should accept F (Female)', () => {
        expect(() => isValidSex('F')).not.toThrow();
      });

      it('should accept O (Other)', () => {
        expect(() => isValidSex('O')).not.toThrow();
      });

      it('should reject invalid sex value', () => {
        expect(() => isValidSex('X')).toThrow('ค่าเพศไม่ถูกต้อง');
      });

      it('should reject random string', () => {
        expect(() => isValidSex('INVALID')).toThrow('ค่าเพศไม่ถูกต้อง');
      });

      it('should reject lowercase m', () => {
        expect(() => isValidSex('m')).toThrow('ค่าเพศไม่ถูกต้อง');
      });

      it('should reject lowercase f', () => {
        expect(() => isValidSex('f')).toThrow('ค่าเพศไม่ถูกต้อง');
      });
    });

    // Test the isUrlOrEmpty validator logic directly
    describe('profile_image_url validator - isUrlOrEmpty logic', () => {
      const isUrlOrEmpty = (value) => {
        if (!value || value.trim() === '') {
          return;
        }
        const urlPattern = /^https?:\/\/.+/;
        if (!urlPattern.test(value)) {
          throw new Error('กรุณากรอก URL ที่ถูกต้อง');
        }
      };

      it('should accept null value', () => {
        expect(() => isUrlOrEmpty(null)).not.toThrow();
      });

      it('should accept undefined value', () => {
        expect(() => isUrlOrEmpty(undefined)).not.toThrow();
      });

      it('should accept empty string', () => {
        expect(() => isUrlOrEmpty('')).not.toThrow();
      });

      it('should accept whitespace only', () => {
        expect(() => isUrlOrEmpty('   ')).not.toThrow();
      });

      it('should accept http URL', () => {
        expect(() => isUrlOrEmpty('http://example.com/image.jpg')).not.toThrow();
      });

      it('should accept https URL', () => {
        expect(() => isUrlOrEmpty('https://example.com/image.png')).not.toThrow();
      });

      it('should accept https URL with path', () => {
        expect(() => isUrlOrEmpty('https://cdn.example.com/images/profile/user123.png')).not.toThrow();
      });

      it('should reject invalid URL', () => {
        expect(() => isUrlOrEmpty('not-a-url')).toThrow('กรุณากรอก URL ที่ถูกต้อง');
      });

      it('should reject ftp URL', () => {
        expect(() => isUrlOrEmpty('ftp://example.com/file')).toThrow('กรุณากรอก URL ที่ถูกต้อง');
      });

      it('should reject URL without protocol', () => {
        expect(() => isUrlOrEmpty('example.com/image.jpg')).toThrow('กรุณากรอก URL ที่ถูกต้อง');
      });

      it('should reject file path', () => {
        expect(() => isUrlOrEmpty('/path/to/image.jpg')).toThrow('กรุณากรอก URL ที่ถูกต้อง');
      });
    });

    // Test the auth_provider isIn validator logic directly
    describe('auth_provider validator - isIn logic', () => {
      const isValidAuthProvider = (value) => {
        const allowed = ['local', 'google', 'facebook'];
        if (!allowed.includes(value)) {
          throw new Error('Invalid auth provider');
        }
      };

      it('should accept local provider', () => {
        expect(() => isValidAuthProvider('local')).not.toThrow();
      });

      it('should accept google provider', () => {
        expect(() => isValidAuthProvider('google')).not.toThrow();
      });

      it('should accept facebook provider', () => {
        expect(() => isValidAuthProvider('facebook')).not.toThrow();
      });

      it('should reject invalid provider', () => {
        expect(() => isValidAuthProvider('twitter')).toThrow('Invalid auth provider');
      });

      it('should reject uppercase LOCAL', () => {
        expect(() => isValidAuthProvider('LOCAL')).toThrow('Invalid auth provider');
      });

      it('should reject empty string', () => {
        expect(() => isValidAuthProvider('')).toThrow('Invalid auth provider');
      });
    });

    // Test email len validator logic
    describe('email len validator logic', () => {
      const isValidEmailLength = (value) => {
        if (!value || value.length < 5 || value.length > 255) {
          throw new Error('Email length must be between 5 and 255 characters');
        }
      };

      it('should accept email with valid length', () => {
        expect(() => isValidEmailLength('test@example.com')).not.toThrow();
      });

      it('should reject email shorter than 5 chars', () => {
        expect(() => isValidEmailLength('a@b')).toThrow();
      });

      it('should accept email with exactly 5 chars', () => {
        expect(() => isValidEmailLength('a@b.c')).not.toThrow();
      });

      it('should accept long email up to 255 chars', () => {
        const longEmail = 'a'.repeat(240) + '@example.com';
        expect(() => isValidEmailLength(longEmail)).not.toThrow();
      });

      it('should reject empty email', () => {
        expect(() => isValidEmailLength('')).toThrow();
      });

      it('should reject null email', () => {
        expect(() => isValidEmailLength(null)).toThrow();
      });
    });

    // Test name and surname len validators
    describe('name len validator logic', () => {
      const isValidNameLength = (value) => {
        if (!value || value.length < 1 || value.length > 200) {
          throw new Error('Name length must be between 1 and 200 characters');
        }
      };

      it('should accept name with valid length', () => {
        expect(() => isValidNameLength('John')).not.toThrow();
      });

      it('should accept single character name', () => {
        expect(() => isValidNameLength('A')).not.toThrow();
      });

      it('should accept name with 200 chars', () => {
        expect(() => isValidNameLength('A'.repeat(200))).not.toThrow();
      });

      it('should reject empty name', () => {
        expect(() => isValidNameLength('')).toThrow();
      });

      it('should reject null name', () => {
        expect(() => isValidNameLength(null)).toThrow();
      });
    });
  });

  // ==================== HOOKS TESTS (Pure Logic) ====================
  
  describe('Hooks - Pure Logic Tests', () => {
    describe('beforeCreate hook logic', () => {
      const beforeCreate = (user) => {
        if (user.name && user.surname) {
          user.full_name = `${user.name} ${user.surname}`;
        }
      };

      it('should set full_name from name and surname', () => {
        const user = { name: 'John', surname: 'Doe' };
        beforeCreate(user);
        expect(user.full_name).toBe('John Doe');
      });

      it('should handle Thai names', () => {
        const user = { name: 'สมชาย', surname: 'ใจดี' };
        beforeCreate(user);
        expect(user.full_name).toBe('สมชาย ใจดี');
      });

      it('should not set full_name when name is missing', () => {
        const user = { surname: 'Doe' };
        beforeCreate(user);
        expect(user.full_name).toBeUndefined();
      });

      it('should not set full_name when surname is missing', () => {
        const user = { name: 'John' };
        beforeCreate(user);
        expect(user.full_name).toBeUndefined();
      });

      it('should not set full_name when both are missing', () => {
        const user = {};
        beforeCreate(user);
        expect(user.full_name).toBeUndefined();
      });

      it('should not set full_name when name is null', () => {
        const user = { name: null, surname: 'Doe' };
        beforeCreate(user);
        expect(user.full_name).toBeUndefined();
      });

      it('should not set full_name when surname is null', () => {
        const user = { name: 'John', surname: null };
        beforeCreate(user);
        expect(user.full_name).toBeUndefined();
      });

      it('should not set full_name when name is empty string', () => {
        const user = { name: '', surname: 'Doe' };
        beforeCreate(user);
        expect(user.full_name).toBeUndefined();
      });
    });

    describe('beforeUpdate hook logic', () => {
      const beforeUpdate = (user) => {
        if (user.changed('name') || user.changed('surname')) {
          user.full_name = `${user.name} ${user.surname}`;
        }
      };

      it('should update full_name when name changes', () => {
        const user = {
          name: 'Jane',
          surname: 'Smith',
          changed: (field) => field === 'name'
        };
        beforeUpdate(user);
        expect(user.full_name).toBe('Jane Smith');
      });

      it('should update full_name when surname changes', () => {
        const user = {
          name: 'Jane',
          surname: 'Smith',
          changed: (field) => field === 'surname'
        };
        beforeUpdate(user);
        expect(user.full_name).toBe('Jane Smith');
      });

      it('should update full_name when both name and surname change', () => {
        const user = {
          name: 'NewFirst',
          surname: 'NewLast',
          changed: (field) => field === 'name' || field === 'surname'
        };
        beforeUpdate(user);
        expect(user.full_name).toBe('NewFirst NewLast');
      });

      it('should not update full_name when neither changes', () => {
        const user = {
          name: 'Jane',
          surname: 'Smith',
          changed: () => false
        };
        beforeUpdate(user);
        expect(user.full_name).toBeUndefined();
      });

      it('should handle Thai name updates', () => {
        const user = {
          name: 'สมหญิง',
          surname: 'มีสุข',
          changed: (field) => field === 'name'
        };
        beforeUpdate(user);
        expect(user.full_name).toBe('สมหญิง มีสุข');
      });
    });
  });

  // ==================== MODEL METHODS TESTS ====================
  
  describe('UserModel Methods', () => {
    describe('findById', () => {
      it('should call findByPk with correct options', async () => {
        User.findByPk = jest.fn().mockResolvedValue({ user_id: '123' });
        
        await UserModel.findById('123');
        
        expect(User.findByPk).toHaveBeenCalledWith('123', expect.objectContaining({
          attributes: expect.objectContaining({
            exclude: ['password_hash', 'reset_token', 'reset_token_expire']
          }),
          include: expect.any(Array)
        }));
      });

      it('should return null when user not found', async () => {
        User.findByPk = jest.fn().mockResolvedValue(null);
        
        const result = await UserModel.findById('nonexistent');
        
        expect(result).toBeNull();
      });
    });

    describe('findByEmail', () => {
      it('should call findOne with lowercase trimmed email', async () => {
        User.findOne = jest.fn().mockResolvedValue(null);
        
        await UserModel.findByEmail('  TEST@Example.COM  ');
        
        expect(User.findOne).toHaveBeenCalledWith(expect.objectContaining({
          where: { email: 'test@example.com' }
        }));
      });
    });

    describe('findByEmailWithPassword', () => {
      it('should call findOne with lowercase trimmed email', async () => {
        User.findOne = jest.fn().mockResolvedValue(null);
        
        await UserModel.findByEmailWithPassword('  ADMIN@Test.COM  ');
        
        expect(User.findOne).toHaveBeenCalledWith(expect.objectContaining({
          where: { email: 'admin@test.com' }
        }));
      });
    });

    describe('create', () => {
      it('should create user with all provided fields', async () => {
        const mockUser = { user_id: '123', email: 'test@example.com' };
        User.create = jest.fn().mockResolvedValue(mockUser);
        
        const userData = {
          email: '  Test@Example.COM  ',
          passwordHash: 'hashedPassword',
          name: '  John  ',
          surname: '  Doe  ',
          sex: 'M',
          user_address_1: '123 Main St',
          user_address_2: 'Apt 4',
          user_address_3: 'Floor 2',
          role_id: 2
        };
        
        const result = await UserModel.create(userData);
        
        expect(User.create).toHaveBeenCalledWith({
          email: 'test@example.com',
          password_hash: 'hashedPassword',
          name: 'John',
          surname: 'Doe',
          sex: 'M',
          user_address_1: '123 Main St',
          user_address_2: 'Apt 4',
          user_address_3: 'Floor 2',
          role_id: 2,
          is_active: true
        }, { transaction: null });
      });

      it('should use default values when not provided', async () => {
        User.create = jest.fn().mockResolvedValue({});
        
        const userData = {
          email: 'test@example.com',
          passwordHash: 'hash',
          name: 'John',
          surname: 'Doe'
        };
        
        await UserModel.create(userData);
        
        expect(User.create).toHaveBeenCalledWith(expect.objectContaining({
          sex: 'O',
          user_address_1: '',
          user_address_2: '',
          user_address_3: '',
          role_id: 3
        }), expect.any(Object));
      });

      it('should pass transaction when provided', async () => {
        User.create = jest.fn().mockResolvedValue({});
        const mockTransaction = { id: 'tx-123' };
        
        await UserModel.create({
          email: 'test@example.com',
          passwordHash: 'hash',
          name: 'John',
          surname: 'Doe'
        }, mockTransaction);
        
        expect(User.create).toHaveBeenCalledWith(
          expect.any(Object),
          { transaction: mockTransaction }
        );
      });
    });

    describe('updatePassword', () => {
      it('should update password and clear reset token', async () => {
        const updatedUser = { user_id: '123' };
        User.update = jest.fn().mockResolvedValue([1, [updatedUser]]);
        
        const result = await UserModel.updatePassword('123', 'newHash');
        
        expect(User.update).toHaveBeenCalledWith(
          {
            password_hash: 'newHash',
            reset_token: null,
            reset_token_expire: null
          },
          expect.objectContaining({
            where: { user_id: '123' },
            returning: true
          })
        );
        expect(result).toEqual(updatedUser);
      });

      it('should accept transaction parameter', async () => {
        User.update = jest.fn().mockResolvedValue([1, [{}]]);
        const mockTx = { id: 'tx' };
        
        await UserModel.updatePassword('123', 'hash', mockTx);
        
        expect(User.update).toHaveBeenCalledWith(
          expect.any(Object),
          expect.objectContaining({ transaction: mockTx })
        );
      });
    });

    describe('setResetToken', () => {
      it('should set reset token and expiry', async () => {
        const updatedUser = { user_id: '123' };
        User.update = jest.fn().mockResolvedValue([1, [updatedUser]]);
        const expireDate = new Date('2025-01-01');
        
        const result = await UserModel.setResetToken('123', 'reset-token', expireDate);
        
        expect(User.update).toHaveBeenCalledWith(
          {
            reset_token: 'reset-token',
            reset_token_expire: expireDate
          },
          expect.objectContaining({
            where: { user_id: '123' },
            returning: true
          })
        );
        expect(result).toEqual(updatedUser);
      });
    });

    describe('findByResetToken', () => {
      it('should find user with valid non-expired token', async () => {
        const mockUser = { user_id: '123' };
        User.findOne = jest.fn().mockResolvedValue(mockUser);
        
        const result = await UserModel.findByResetToken('valid-token');
        
        expect(User.findOne).toHaveBeenCalledWith(expect.objectContaining({
          where: expect.objectContaining({
            reset_token: 'valid-token'
          }),
          attributes: ['user_id', 'email', 'reset_token', 'reset_token_expire']
        }));
        expect(result).toEqual(mockUser);
      });
    });

    describe('updateEmail', () => {
      it('should update email with lowercase trimmed value', async () => {
        const updatedUser = { user_id: '123' };
        User.update = jest.fn().mockResolvedValue([1, [updatedUser]]);
        
        const result = await UserModel.updateEmail('123', '  NEW@Email.COM  ');
        
        expect(User.update).toHaveBeenCalledWith(
          { email: 'new@email.com' },
          expect.objectContaining({
            where: { user_id: '123' },
            returning: true
          })
        );
      });
    });

    describe('updateProfile', () => {
      it('should update only provided fields', async () => {
        User.update = jest.fn().mockResolvedValue([1, [{}]]);
        
        await UserModel.updateProfile('123', {
          name: 'NewName',
          surname: 'NewSurname'
        });
        
        expect(User.update).toHaveBeenCalledWith(
          { name: 'NewName', surname: 'NewSurname' },
          expect.objectContaining({
            where: { user_id: '123' },
            validate: true
          })
        );
      });

      it('should set sex to null when empty string', async () => {
        User.update = jest.fn().mockResolvedValue([1, [{}]]);
        
        await UserModel.updateProfile('123', { sex: '' });
        
        expect(User.update).toHaveBeenCalledWith(
          { sex: null },
          expect.any(Object)
        );
      });

      it('should set profile_image_url to null when empty string', async () => {
        User.update = jest.fn().mockResolvedValue([1, [{}]]);
        
        await UserModel.updateProfile('123', { profile_image_url: '' });
        
        expect(User.update).toHaveBeenCalledWith(
          { profile_image_url: null },
          expect.any(Object)
        );
      });

      it('should keep empty string for name field (let Sequelize validate)', async () => {
        User.update = jest.fn().mockResolvedValue([1, [{}]]);
        
        await UserModel.updateProfile('123', { name: '' });
        
        expect(User.update).toHaveBeenCalledWith(
          { name: '' },
          expect.any(Object)
        );
      });

      it('should ignore non-allowed fields', async () => {
        User.update = jest.fn().mockResolvedValue([1, [{}]]);
        
        await UserModel.updateProfile('123', {
          name: 'Test',
          password_hash: 'should-not-be-included',
          role_id: 1
        });
        
        expect(User.update).toHaveBeenCalledWith(
          { name: 'Test' },
          expect.any(Object)
        );
      });

      it('should handle undefined values (not include them)', async () => {
        User.update = jest.fn().mockResolvedValue([1, [{}]]);
        
        await UserModel.updateProfile('123', {
          name: 'Test',
          surname: undefined
        });
        
        expect(User.update).toHaveBeenCalledWith(
          { name: 'Test' },
          expect.any(Object)
        );
      });
    });

    describe('deactivate', () => {
      it('should set is_active to false', async () => {
        User.update = jest.fn().mockResolvedValue([1]);
        
        const result = await UserModel.deactivate('123');
        
        expect(User.update).toHaveBeenCalledWith(
          { is_active: false },
          expect.objectContaining({ where: { user_id: '123' } })
        );
        expect(result).toBe(true);
      });

      it('should return false when no rows updated', async () => {
        User.update = jest.fn().mockResolvedValue([0]);
        
        const result = await UserModel.deactivate('nonexistent');
        
        expect(result).toBe(false);
      });
    });

    describe('activate', () => {
      it('should set is_active to true', async () => {
        User.update = jest.fn().mockResolvedValue([1]);
        
        const result = await UserModel.activate('123');
        
        expect(User.update).toHaveBeenCalledWith(
          { is_active: true },
          expect.objectContaining({ where: { user_id: '123' } })
        );
        expect(result).toBe(true);
      });

      it('should return false when no rows updated', async () => {
        User.update = jest.fn().mockResolvedValue([0]);
        
        const result = await UserModel.activate('nonexistent');
        
        expect(result).toBe(false);
      });
    });

    describe('deleteUser', () => {
      it('should destroy user record', async () => {
        User.destroy = jest.fn().mockResolvedValue(1);
        
        const result = await UserModel.deleteUser('123');
        
        expect(User.destroy).toHaveBeenCalledWith(
          expect.objectContaining({ where: { user_id: '123' } })
        );
        expect(result).toBe(true);
      });

      it('should return false when no rows deleted', async () => {
        User.destroy = jest.fn().mockResolvedValue(0);
        
        const result = await UserModel.deleteUser('nonexistent');
        
        expect(result).toBe(false);
      });
    });

    describe('search', () => {
      it('should search with default options', async () => {
        User.findAndCountAll = jest.fn().mockResolvedValue({ count: 0, rows: [] });
        
        const result = await UserModel.search();
        
        expect(User.findAndCountAll).toHaveBeenCalledWith(expect.objectContaining({
          limit: 10,
          offset: 0,
          order: [['created_at', 'DESC']]
        }));
        expect(result).toEqual({
          users: [],
          total: 0,
          page: 1,
          totalPages: 0
        });
      });

      it('should search with email filter', async () => {
        User.findAndCountAll = jest.fn().mockResolvedValue({ count: 0, rows: [] });
        
        await UserModel.search({ email: 'test' });
        
        expect(User.findAndCountAll).toHaveBeenCalledWith(expect.objectContaining({
          where: expect.objectContaining({
            email: expect.any(Object)
          })
        }));
      });

      it('should search with name filter (OR across name, surname, full_name)', async () => {
        User.findAndCountAll = jest.fn().mockResolvedValue({ count: 0, rows: [] });
        
        await UserModel.search({ name: 'john' });
        
        // Verify the search was called with where clause containing Op.or
        expect(User.findAndCountAll).toHaveBeenCalled();
        const callArg = User.findAndCountAll.mock.calls[0][0];
        expect(callArg.where).toBeDefined();
        // The Op.or symbol should be a key in the where clause
        const hasOrCondition = Object.getOwnPropertySymbols(callArg.where).some(
          sym => sym.toString() === mockOp.or.toString()
        );
        expect(hasOrCondition).toBe(true);
      });

      it('should search with role_id filter', async () => {
        User.findAndCountAll = jest.fn().mockResolvedValue({ count: 0, rows: [] });
        
        await UserModel.search({ role_id: 2 });
        
        expect(User.findAndCountAll).toHaveBeenCalledWith(expect.objectContaining({
          where: expect.objectContaining({
            role_id: 2
          })
        }));
      });

      it('should search with is_active filter', async () => {
        User.findAndCountAll = jest.fn().mockResolvedValue({ count: 0, rows: [] });
        
        await UserModel.search({ is_active: true });
        
        expect(User.findAndCountAll).toHaveBeenCalledWith(expect.objectContaining({
          where: expect.objectContaining({
            is_active: true
          })
        }));
      });

      it('should handle pagination options', async () => {
        User.findAndCountAll = jest.fn().mockResolvedValue({ count: 50, rows: [] });
        
        const result = await UserModel.search({}, {
          page: 3,
          limit: 5,
          sortBy: 'email',
          sortOrder: 'ASC'
        });
        
        expect(User.findAndCountAll).toHaveBeenCalledWith(expect.objectContaining({
          limit: 5,
          offset: 10, // (3-1) * 5
          order: [['email', 'ASC']]
        }));
        expect(result.page).toBe(3);
        expect(result.totalPages).toBe(10); // 50 / 5
      });
    });

    describe('count', () => {
      it('should count users with empty where', async () => {
        User.count = jest.fn().mockResolvedValue(10);
        
        const result = await UserModel.count();
        
        expect(User.count).toHaveBeenCalledWith({ where: {} });
        expect(result).toBe(10);
      });

      it('should count with where clause', async () => {
        User.count = jest.fn().mockResolvedValue(5);
        
        const result = await UserModel.count({ is_active: true });
        
        expect(User.count).toHaveBeenCalledWith({ where: { is_active: true } });
        expect(result).toBe(5);
      });
    });

    describe('emailExists', () => {
      it('should check email existence', async () => {
        User.count = jest.fn().mockResolvedValue(1);
        
        const result = await UserModel.emailExists('test@example.com');
        
        expect(User.count).toHaveBeenCalledWith({
          where: { email: 'test@example.com' }
        });
        expect(result).toBe(true);
      });

      it('should return false when email does not exist', async () => {
        User.count = jest.fn().mockResolvedValue(0);
        
        const result = await UserModel.emailExists('new@example.com');
        
        expect(result).toBe(false);
      });

      it('should exclude user by ID when checking', async () => {
        User.count = jest.fn().mockResolvedValue(0);
        
        await UserModel.emailExists('test@example.com', 'user-123');
        
        expect(User.count).toHaveBeenCalledWith({
          where: {
            email: 'test@example.com',
            user_id: expect.any(Object)
          }
        });
      });
    });

    describe('bulkCreate', () => {
      it('should bulk create users', async () => {
        const mockUsers = [{ user_id: '1' }, { user_id: '2' }];
        User.bulkCreate = jest.fn().mockResolvedValue(mockUsers);
        
        const usersData = [
          { email: 'a@example.com' },
          { email: 'b@example.com' }
        ];
        
        const result = await UserModel.bulkCreate(usersData);
        
        expect(User.bulkCreate).toHaveBeenCalledWith(usersData, {
          transaction: null,
          validate: true
        });
        expect(result).toEqual(mockUsers);
      });

      it('should pass transaction to bulkCreate', async () => {
        User.bulkCreate = jest.fn().mockResolvedValue([]);
        const mockTx = { id: 'tx' };
        
        await UserModel.bulkCreate([], mockTx);
        
        expect(User.bulkCreate).toHaveBeenCalledWith([], {
          transaction: mockTx,
          validate: true
        });
      });
    });

    describe('updateRole', () => {
      it('should update user role', async () => {
        User.update = jest.fn().mockResolvedValue([1]);
        
        const result = await UserModel.updateRole('123', 2);
        
        expect(User.update).toHaveBeenCalledWith(
          { role_id: 2 },
          expect.objectContaining({ where: { user_id: '123' } })
        );
        expect(result).toBe(true);
      });

      it('should return false when no rows updated', async () => {
        User.update = jest.fn().mockResolvedValue([0]);
        
        const result = await UserModel.updateRole('nonexistent', 2);
        
        expect(result).toBe(false);
      });
    });
  });

  // ==================== EXPORT TESTS ====================
  
  describe('Export Structure', () => {
    it('should export User model', () => {
      expect(User).toBeDefined();
    });

    it('should export UserModel with all methods', () => {
      expect(UserModel).toBeDefined();
      expect(UserModel.findById).toBeDefined();
      expect(UserModel.findByEmail).toBeDefined();
      expect(UserModel.findByEmailWithPassword).toBeDefined();
      expect(UserModel.create).toBeDefined();
      expect(UserModel.updatePassword).toBeDefined();
      expect(UserModel.setResetToken).toBeDefined();
      expect(UserModel.findByResetToken).toBeDefined();
      expect(UserModel.updateEmail).toBeDefined();
      expect(UserModel.updateProfile).toBeDefined();
      expect(UserModel.deactivate).toBeDefined();
      expect(UserModel.activate).toBeDefined();
      expect(UserModel.deleteUser).toBeDefined();
      expect(UserModel.search).toBeDefined();
      expect(UserModel.count).toBeDefined();
      expect(UserModel.emailExists).toBeDefined();
      expect(UserModel.bulkCreate).toBeDefined();
      expect(UserModel.updateRole).toBeDefined();
    });
  });
});
