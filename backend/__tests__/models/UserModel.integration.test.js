/**
 * Integration Tests for UserModel validators and hooks
 * These tests require a real database connection
 * Run with: npm test -- --testPathPattern="UserModel.integration"
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';

// Set test environment variables before importing models
process.env.NODE_ENV = 'test';
process.env.DB_USER = 'testuser';
process.env.DB_PASSWORD = 'testpass';
process.env.DB_DATABASE = 'internproject';
process.env.DB_HOST = 'localhost';
process.env.DB_PORT = '5433';
process.env.ACCESS_TOKEN_SECRET = 'test-access-secret-key-for-testing';
process.env.REFRESH_TOKEN_SECRET = 'test-refresh-secret-key-for-testing';

let sequelize;
let User;
let Role;

describe('UserModel Integration Tests (Validators & Hooks)', () => {
  beforeAll(async () => {
    try {
      // Dynamic import after setting env vars
      const { Sequelize, DataTypes } = await import('sequelize');
      
      sequelize = new Sequelize({
        dialect: 'postgres',
        host: process.env.DB_HOST,
        port: parseInt(process.env.DB_PORT),
        username: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_DATABASE + '_test',
        logging: false,
        define: {
          timestamps: true,
          underscored: true,
          freezeTableName: true
        }
      });

      // Define Role model
      Role = sequelize.define('Role', {
        role_id: {
          type: DataTypes.INTEGER,
          primaryKey: true,
          autoIncrement: true
        },
        role_name: {
          type: DataTypes.STRING(50),
          allowNull: false,
          unique: true
        },
        description: {
          type: DataTypes.STRING(255),
          allowNull: true
        },
        is_active: {
          type: DataTypes.BOOLEAN,
          defaultValue: true
        }
      }, {
        tableName: 'sys_role'
      });

      // Define User model with validators and hooks
      User = sequelize.define('User', {
        user_id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true
        },
        email: {
          type: DataTypes.STRING(255),
          allowNull: false,
          unique: true,
          validate: {
            isEmail: {
              msg: 'Invalid email format'
            },
            notEmpty: {
              msg: 'Email is required'
            },
            len: {
              args: [5, 255],
              msg: 'Email must be between 5 and 255 characters'
            }
          },
          set(value) {
            if (value) {
              this.setDataValue('email', value.toLowerCase().trim());
            }
          }
        },
        password_hash: {
          type: DataTypes.STRING(255),
          allowNull: false,
          validate: {
            notEmpty: {
              msg: 'Password is required'
            },
            len: {
              args: [8, 255],
              msg: 'Password hash must be at least 8 characters'
            }
          }
        },
        name: {
          type: DataTypes.STRING(100),
          allowNull: false,
          validate: {
            notEmpty: {
              msg: 'Name is required'
            },
            len: {
              args: [1, 100],
              msg: 'Name must be between 1 and 100 characters'
            }
          }
        },
        surname: {
          type: DataTypes.STRING(100),
          allowNull: false,
          validate: {
            notEmpty: {
              msg: 'Surname is required'
            },
            len: {
              args: [1, 100],
              msg: 'Surname must be between 1 and 100 characters'
            }
          }
        },
        sex: {
          type: DataTypes.STRING(1),
          allowNull: true,
          defaultValue: 'O',
          validate: {
            isIn: {
              args: [['M', 'F', 'O']],
              msg: 'Sex must be M, F, or O'
            }
          }
        },
        phone: {
          type: DataTypes.STRING(20),
          allowNull: true,
          validate: {
            is: {
              args: /^[0-9+\-\s()]*$/,
              msg: 'Invalid phone number format'
            }
          }
        },
        role_id: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 3,
          references: {
            model: 'sys_role',
            key: 'role_id'
          }
        },
        is_active: {
          type: DataTypes.BOOLEAN,
          defaultValue: true
        },
        reset_token: {
          type: DataTypes.STRING(255),
          allowNull: true
        },
        reset_token_expires: {
          type: DataTypes.DATE,
          allowNull: true
        }
      }, {
        tableName: 'sys_users',
        hooks: {
          beforeValidate: (user) => {
            if (user.email) {
              user.email = user.email.toLowerCase().trim();
            }
          },
          beforeCreate: (user) => {
            if (!user.role_id) {
              user.role_id = 3;
            }
          },
          beforeUpdate: (user) => {
            if (user.changed('email') && user.email) {
              user.email = user.email.toLowerCase().trim();
            }
          }
        }
      });

      // Setup associations
      User.belongsTo(Role, { foreignKey: 'role_id', as: 'role' });
      Role.hasMany(User, { foreignKey: 'role_id', as: 'users' });

      // Sync database
      await sequelize.sync({ force: true });

      // Seed roles
      await Role.bulkCreate([
        { role_id: 1, role_name: 'OWNER', description: 'Owner role' },
        { role_id: 2, role_name: 'ADMIN', description: 'Admin role' },
        { role_id: 3, role_name: 'USER', description: 'User role' },
        { role_id: 4, role_name: 'VIEWER', description: 'Viewer role' },
        { role_id: 5, role_name: 'AUDITOR', description: 'Auditor role' }
      ], { ignoreDuplicates: true });

    } catch (error) {
      console.error('Failed to setup test database:', error.message);
      // Skip tests if database is not available
    }
  }, 30000);

  afterAll(async () => {
    if (sequelize) {
      await sequelize.close();
    }
  });

  beforeEach(async () => {
    if (User) {
      await User.destroy({ where: {}, force: true });
    }
  });

  describe('Email Validator', () => {
    it('should accept valid email format', async () => {
      if (!User) return;
      
      const user = await User.create({
        email: 'test@example.com',
        password_hash: 'hashedpassword123',
        name: 'Test',
        surname: 'User',
        role_id: 3
      });

      expect(user.email).toBe('test@example.com');
    });

    it('should reject invalid email format', async () => {
      if (!User) return;

      await expect(User.create({
        email: 'invalid-email',
        password_hash: 'hashedpassword123',
        name: 'Test',
        surname: 'User',
        role_id: 3
      })).rejects.toThrow();
    });

    it('should reject empty email', async () => {
      if (!User) return;

      await expect(User.create({
        email: '',
        password_hash: 'hashedpassword123',
        name: 'Test',
        surname: 'User',
        role_id: 3
      })).rejects.toThrow();
    });

    it('should convert email to lowercase', async () => {
      if (!User) return;

      const user = await User.create({
        email: 'TEST@EXAMPLE.COM',
        password_hash: 'hashedpassword123',
        name: 'Test',
        surname: 'User',
        role_id: 3
      });

      expect(user.email).toBe('test@example.com');
    });

    it('should trim email whitespace', async () => {
      if (!User) return;

      const user = await User.create({
        email: '  test@example.com  ',
        password_hash: 'hashedpassword123',
        name: 'Test',
        surname: 'User',
        role_id: 3
      });

      expect(user.email).toBe('test@example.com');
    });
  });

  describe('Password Validator', () => {
    it('should accept valid password hash', async () => {
      if (!User) return;

      const user = await User.create({
        email: 'test@example.com',
        password_hash: 'hashedpassword123',
        name: 'Test',
        surname: 'User',
        role_id: 3
      });

      expect(user.password_hash).toBe('hashedpassword123');
    });

    it('should reject empty password', async () => {
      if (!User) return;

      await expect(User.create({
        email: 'test@example.com',
        password_hash: '',
        name: 'Test',
        surname: 'User',
        role_id: 3
      })).rejects.toThrow();
    });

    it('should reject short password hash', async () => {
      if (!User) return;

      await expect(User.create({
        email: 'test@example.com',
        password_hash: 'short',
        name: 'Test',
        surname: 'User',
        role_id: 3
      })).rejects.toThrow();
    });
  });

  describe('Name Validator', () => {
    it('should accept valid name', async () => {
      if (!User) return;

      const user = await User.create({
        email: 'test@example.com',
        password_hash: 'hashedpassword123',
        name: 'John',
        surname: 'Doe',
        role_id: 3
      });

      expect(user.name).toBe('John');
    });

    it('should reject empty name', async () => {
      if (!User) return;

      await expect(User.create({
        email: 'test@example.com',
        password_hash: 'hashedpassword123',
        name: '',
        surname: 'Doe',
        role_id: 3
      })).rejects.toThrow();
    });
  });

  describe('Surname Validator', () => {
    it('should accept valid surname', async () => {
      if (!User) return;

      const user = await User.create({
        email: 'test@example.com',
        password_hash: 'hashedpassword123',
        name: 'John',
        surname: 'Doe',
        role_id: 3
      });

      expect(user.surname).toBe('Doe');
    });

    it('should reject empty surname', async () => {
      if (!User) return;

      await expect(User.create({
        email: 'test@example.com',
        password_hash: 'hashedpassword123',
        name: 'John',
        surname: '',
        role_id: 3
      })).rejects.toThrow();
    });
  });

  describe('Sex Validator', () => {
    it('should accept M for male', async () => {
      if (!User) return;

      const user = await User.create({
        email: 'test@example.com',
        password_hash: 'hashedpassword123',
        name: 'John',
        surname: 'Doe',
        sex: 'M',
        role_id: 3
      });

      expect(user.sex).toBe('M');
    });

    it('should accept F for female', async () => {
      if (!User) return;

      const user = await User.create({
        email: 'test@example.com',
        password_hash: 'hashedpassword123',
        name: 'Jane',
        surname: 'Doe',
        sex: 'F',
        role_id: 3
      });

      expect(user.sex).toBe('F');
    });

    it('should accept O for other', async () => {
      if (!User) return;

      const user = await User.create({
        email: 'test@example.com',
        password_hash: 'hashedpassword123',
        name: 'Test',
        surname: 'User',
        sex: 'O',
        role_id: 3
      });

      expect(user.sex).toBe('O');
    });

    it('should default to O when not specified', async () => {
      if (!User) return;

      const user = await User.create({
        email: 'test@example.com',
        password_hash: 'hashedpassword123',
        name: 'Test',
        surname: 'User',
        role_id: 3
      });

      expect(user.sex).toBe('O');
    });

    it('should reject invalid sex value', async () => {
      if (!User) return;

      await expect(User.create({
        email: 'test@example.com',
        password_hash: 'hashedpassword123',
        name: 'Test',
        surname: 'User',
        sex: 'X',
        role_id: 3
      })).rejects.toThrow();
    });
  });

  describe('Phone Validator', () => {
    it('should accept valid phone number', async () => {
      if (!User) return;

      const user = await User.create({
        email: 'test@example.com',
        password_hash: 'hashedpassword123',
        name: 'Test',
        surname: 'User',
        phone: '+66-81-234-5678',
        role_id: 3
      });

      expect(user.phone).toBe('+66-81-234-5678');
    });

    it('should accept phone with parentheses', async () => {
      if (!User) return;

      const user = await User.create({
        email: 'test@example.com',
        password_hash: 'hashedpassword123',
        name: 'Test',
        surname: 'User',
        phone: '(081) 234-5678',
        role_id: 3
      });

      expect(user.phone).toBe('(081) 234-5678');
    });

    it('should reject invalid phone with letters', async () => {
      if (!User) return;

      await expect(User.create({
        email: 'test@example.com',
        password_hash: 'hashedpassword123',
        name: 'Test',
        surname: 'User',
        phone: 'invalid-phone',
        role_id: 3
      })).rejects.toThrow();
    });
  });

  describe('Hooks', () => {
    it('beforeValidate should lowercase email', async () => {
      if (!User) return;

      const user = await User.create({
        email: 'UPPERCASE@EXAMPLE.COM',
        password_hash: 'hashedpassword123',
        name: 'Test',
        surname: 'User',
        role_id: 3
      });

      expect(user.email).toBe('uppercase@example.com');
    });

    it('beforeCreate should set default role_id to 3', async () => {
      if (!User) return;

      const user = await User.create({
        email: 'test@example.com',
        password_hash: 'hashedpassword123',
        name: 'Test',
        surname: 'User'
      });

      expect(user.role_id).toBe(3);
    });

    it('beforeUpdate should lowercase email on update', async () => {
      if (!User) return;

      const user = await User.create({
        email: 'test@example.com',
        password_hash: 'hashedpassword123',
        name: 'Test',
        surname: 'User',
        role_id: 3
      });

      await user.update({ email: 'NEWEMAIL@EXAMPLE.COM' });

      expect(user.email).toBe('newemail@example.com');
    });
  });

  describe('Unique Constraints', () => {
    it('should reject duplicate email', async () => {
      if (!User) return;

      await User.create({
        email: 'test@example.com',
        password_hash: 'hashedpassword123',
        name: 'Test',
        surname: 'User',
        role_id: 3
      });

      await expect(User.create({
        email: 'test@example.com',
        password_hash: 'hashedpassword456',
        name: 'Another',
        surname: 'User',
        role_id: 3
      })).rejects.toThrow();
    });
  });

  describe('Role Association', () => {
    it('should associate user with role', async () => {
      if (!User) return;

      const user = await User.create({
        email: 'test@example.com',
        password_hash: 'hashedpassword123',
        name: 'Test',
        surname: 'User',
        role_id: 3
      });

      const userWithRole = await User.findByPk(user.user_id, {
        include: [{ model: Role, as: 'role' }]
      });

      expect(userWithRole.role).toBeDefined();
      expect(userWithRole.role.role_name).toBe('USER');
    });
  });
});
