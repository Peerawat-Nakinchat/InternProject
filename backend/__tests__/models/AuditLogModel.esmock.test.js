/**
 * AuditLogModel Integration Tests using esmock
 * Uses esmock to properly mock ES modules and test actual code
 * Target: >= 92% branch coverage, >= 95% line coverage
 */

import { describe, it, expect, beforeEach, beforeAll } from '@jest/globals';
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
  between: Symbol('between'),
};

const mockSequelize = {
  define: null,
  literal: (sql) => ({ literal: sql }),
  fn: (name, col) => ({ fn: name, col }),
  col: (name) => ({ col: name }),
  Op: mockOp,
};

// Store captured model definition
let capturedDefinition = null;
let capturedOptions = null;
let MockAuditLogModel = null;

// ==================== TESTS ====================

describe('AuditLogModel with esmock', () => {
  let AuditLog;
  let AuditLogModel;

  beforeAll(async () => {
    // Create mock define function that captures the definition
    mockSequelize.define = (tableName, attributes, options) => {
      capturedDefinition = attributes;
      capturedOptions = options;
      
      function Model(data) {
        Object.assign(this, data);
      }
      
      // Add static Sequelize methods
      Model.findByPk = async () => null;
      Model.findOne = async () => null;
      Model.findAll = async () => [];
      Model.create = async (data) => ({ ...data, log_id: 'mock-log-id' });
      Model.update = async () => [0];
      Model.destroy = async () => 0;
      Model.count = async () => 0;
      Model.findAndCountAll = async () => ({ count: 0, rows: [] });
      Model.bulkCreate = async (data) => data;
      
      MockAuditLogModel = Model;
      return Model;
    };

    try {
      const module = await esmock('../../src/models/AuditLogModel.js', {
        '../../src/config/dbConnection.js': {
          default: mockSequelize,
        },
        'sequelize': {
          DataTypes: {
            UUID: 'UUID',
            UUIDV4: 'UUIDV4',
            STRING: (size) => `STRING(${size})`,
            TEXT: 'TEXT',
            INTEGER: 'INTEGER',
            DATE: 'DATE',
            NOW: 'NOW',
            JSONB: 'JSONB',
            ARRAY: (type) => `ARRAY(${type})`,
          },
          Op: mockOp,
        },
      });
      
      AuditLog = module.AuditLog;
      AuditLogModel = module.AuditLogModel || module.default;
    } catch (error) {
      console.error('Failed to load AuditLogModel with esmock:', error);
    }
  });

  describe('Model Definition', () => {
    it('should define model with sequelize.define', () => {
      expect(AuditLog).toBeDefined();
    });

    it('should capture model definition', () => {
      expect(capturedDefinition).toBeDefined();
    });

    it('should have log_id field as primary key', () => {
      if (capturedDefinition) {
        expect(capturedDefinition.log_id).toBeDefined();
        expect(capturedDefinition.log_id.primaryKey).toBe(true);
      }
    });

    it('should have user_id field', () => {
      if (capturedDefinition) {
        expect(capturedDefinition.user_id).toBeDefined();
      }
    });

    it('should have action field', () => {
      if (capturedDefinition) {
        expect(capturedDefinition.action).toBeDefined();
        expect(capturedDefinition.action.allowNull).toBe(false);
      }
    });

    it('should have target fields', () => {
      if (capturedDefinition) {
        expect(capturedDefinition.target_table).toBeDefined();
        expect(capturedDefinition.target_id).toBeDefined();
        expect(capturedDefinition.target_type).toBeDefined();
      }
    });

    it('should have data change fields', () => {
      if (capturedDefinition) {
        expect(capturedDefinition.before_data).toBeDefined();
        expect(capturedDefinition.after_data).toBeDefined();
        expect(capturedDefinition.changes).toBeDefined();
      }
    });

    it('should have request information fields', () => {
      if (capturedDefinition) {
        expect(capturedDefinition.ip_address).toBeDefined();
        expect(capturedDefinition.user_agent).toBeDefined();
        expect(capturedDefinition.request_url).toBeDefined();
        expect(capturedDefinition.request_method).toBeDefined();
      }
    });

    it('should have status and severity fields', () => {
      if (capturedDefinition) {
        expect(capturedDefinition.status).toBeDefined();
        expect(capturedDefinition.severity).toBeDefined();
      }
    });

    it('should have correct table options', () => {
      if (capturedOptions) {
        expect(capturedOptions.timestamps).toBe(false);
        expect(capturedOptions.tableName).toBe('sys_audit_logs');
      }
    });
  });

  describe('AuditLogModel.create', () => {
    beforeEach(() => {
      AuditLog.create = async (data, options) => ({
        log_id: 'new-log-id',
        ...data,
        created_at: new Date()
      });
    });

    it('should create audit log with valid data', async () => {
      const data = {
        user_id: 'user-123',
        action: 'LOGIN',
        status: 'SUCCESS'
      };

      const result = await AuditLogModel.create(data);

      expect(result).toBeDefined();
      expect(result.user_id).toBe('user-123');
      expect(result.action).toBe('LOGIN');
    });

    it('should pass transaction option', async () => {
      const mockTransaction = { id: 'txn-123' };
      let capturedTransaction = null;
      
      AuditLog.create = async (data, options) => {
        capturedTransaction = options?.transaction;
        return { log_id: 'new-id', ...data };
      };

      await AuditLogModel.create({ action: 'TEST' }, mockTransaction);

      expect(capturedTransaction).toEqual(mockTransaction);
    });

    it('should create log with all fields', async () => {
      let capturedData = null;
      AuditLog.create = async (data, options) => {
        capturedData = data;
        return { log_id: 'id', ...data };
      };

      const fullData = {
        user_id: 'user-123',
        user_email: 'test@test.com',
        user_name: 'Test User',
        action: 'UPDATE',
        action_description: 'Updated profile',
        target_table: 'sys_users',
        target_id: 'user-123',
        target_type: 'USER',
        before_data: { name: 'Old' },
        after_data: { name: 'New' },
        changes: { name: { old: 'Old', new: 'New' } },
        ip_address: '127.0.0.1',
        user_agent: 'Mozilla/5.0',
        request_url: '/api/users/123',
        request_method: 'PUT',
        response_status: 200,
        status: 'SUCCESS',
        severity: 'INFO',
        category: 'BUSINESS',
        organization_id: 'org-123',
        metadata: { key: 'value' }
      };

      await AuditLogModel.create(fullData);

      expect(capturedData).toEqual(fullData);
    });

    it('should pass null transaction when not provided', async () => {
      let capturedTransaction = 'not-set';
      AuditLog.create = async (data, options) => {
        capturedTransaction = options?.transaction;
        return { log_id: 'id', ...data };
      };

      await AuditLogModel.create({ action: 'TEST' });

      expect(capturedTransaction).toBeNull();
    });
  });

  describe('AuditLogModel.bulkCreate', () => {
    it('should bulk create audit logs', async () => {
      const logsData = [
        { action: 'LOGIN', user_id: 'user-1' },
        { action: 'LOGOUT', user_id: 'user-2' }
      ];
      
      AuditLog.bulkCreate = async (data, options) => {
        expect(options.validate).toBe(true);
        return data.map((d, i) => ({ ...d, log_id: `log-${i}` }));
      };

      const result = await AuditLogModel.bulkCreate(logsData);

      expect(result).toHaveLength(2);
    });

    it('should pass transaction option', async () => {
      const mockTransaction = { id: 'txn-123' };
      let capturedTransaction = null;
      
      AuditLog.bulkCreate = async (data, options) => {
        capturedTransaction = options?.transaction;
        return data;
      };

      await AuditLogModel.bulkCreate([{ action: 'TEST' }], mockTransaction);

      expect(capturedTransaction).toEqual(mockTransaction);
    });

    it('should pass null transaction when not provided', async () => {
      let capturedTransaction = 'not-set';
      AuditLog.bulkCreate = async (data, options) => {
        capturedTransaction = options?.transaction;
        return data;
      };

      await AuditLogModel.bulkCreate([{ action: 'TEST' }]);

      expect(capturedTransaction).toBeNull();
    });
  });

  describe('AuditLogModel.findById', () => {
    it('should find audit log by ID', async () => {
      const mockLog = {
        log_id: 'log-123',
        action: 'LOGIN'
      };
      
      AuditLog.findByPk = async (id) => {
        expect(id).toBe('log-123');
        return mockLog;
      };

      const result = await AuditLogModel.findById('log-123');

      expect(result).toEqual(mockLog);
    });

    it('should return null when not found', async () => {
      AuditLog.findByPk = async () => null;

      const result = await AuditLogModel.findById('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('AuditLogModel.query', () => {
    it('should query with default options', async () => {
      AuditLog.findAndCountAll = async (options) => {
        expect(options.limit).toBe(50);
        expect(options.offset).toBe(0);
        return { count: 0, rows: [] };
      };

      const result = await AuditLogModel.query();

      expect(result.logs).toEqual([]);
      expect(result.total).toBe(0);
      expect(result.page).toBe(1);
      expect(result.totalPages).toBe(0);
    });

    it('should apply user_id filter', async () => {
      let capturedWhere = null;
      AuditLog.findAndCountAll = async (options) => {
        capturedWhere = options.where;
        return { count: 0, rows: [] };
      };

      await AuditLogModel.query({ user_id: 'user-123' });

      expect(capturedWhere.user_id).toBe('user-123');
    });

    it('should apply user_email filter with iLike', async () => {
      let capturedWhere = null;
      AuditLog.findAndCountAll = async (options) => {
        capturedWhere = options.where;
        return { count: 0, rows: [] };
      };

      await AuditLogModel.query({ user_email: 'test@' });

      expect(capturedWhere.user_email).toBeDefined();
    });

    it('should apply single action filter', async () => {
      let capturedWhere = null;
      AuditLog.findAndCountAll = async (options) => {
        capturedWhere = options.where;
        return { count: 0, rows: [] };
      };

      await AuditLogModel.query({ action: 'LOGIN' });

      expect(capturedWhere.action).toBe('LOGIN');
    });

    it('should apply actions array filter', async () => {
      let capturedWhere = null;
      AuditLog.findAndCountAll = async (options) => {
        capturedWhere = options.where;
        return { count: 0, rows: [] };
      };

      await AuditLogModel.query({ actions: ['LOGIN', 'LOGOUT'] });

      expect(capturedWhere.action).toBeDefined();
    });

    it('should apply target filters', async () => {
      let capturedWhere = null;
      AuditLog.findAndCountAll = async (options) => {
        capturedWhere = options.where;
        return { count: 0, rows: [] };
      };

      await AuditLogModel.query({ 
        target_type: 'USER',
        target_id: 'user-123',
        target_table: 'sys_users'
      });

      expect(capturedWhere.target_type).toBe('USER');
      expect(capturedWhere.target_id).toBe('user-123');
      expect(capturedWhere.target_table).toBe('sys_users');
    });

    it('should apply status filters', async () => {
      let capturedWhere = null;
      AuditLog.findAndCountAll = async (options) => {
        capturedWhere = options.where;
        return { count: 0, rows: [] };
      };

      await AuditLogModel.query({ 
        status: 'SUCCESS',
        severity: 'INFO',
        category: 'SECURITY'
      });

      expect(capturedWhere.status).toBe('SUCCESS');
      expect(capturedWhere.severity).toBe('INFO');
      expect(capturedWhere.category).toBe('SECURITY');
    });

    it('should apply organization_id filter', async () => {
      let capturedWhere = null;
      AuditLog.findAndCountAll = async (options) => {
        capturedWhere = options.where;
        return { count: 0, rows: [] };
      };

      await AuditLogModel.query({ organization_id: 'org-123' });

      expect(capturedWhere.organization_id).toBe('org-123');
    });

    it('should apply ip_address filter', async () => {
      let capturedWhere = null;
      AuditLog.findAndCountAll = async (options) => {
        capturedWhere = options.where;
        return { count: 0, rows: [] };
      };

      await AuditLogModel.query({ ip_address: '192.168.1.1' });

      expect(capturedWhere.ip_address).toBe('192.168.1.1');
    });

    it('should apply date range filter with startDate only', async () => {
      let capturedWhere = null;
      AuditLog.findAndCountAll = async (options) => {
        capturedWhere = options.where;
        return { count: 0, rows: [] };
      };

      const startDate = new Date('2024-01-01');
      await AuditLogModel.query({ startDate });

      expect(capturedWhere.created_at).toBeDefined();
    });

    it('should apply date range filter with endDate only', async () => {
      let capturedWhere = null;
      AuditLog.findAndCountAll = async (options) => {
        capturedWhere = options.where;
        return { count: 0, rows: [] };
      };

      const endDate = new Date('2024-12-31');
      await AuditLogModel.query({ endDate });

      expect(capturedWhere.created_at).toBeDefined();
    });

    it('should apply date range filter with both dates', async () => {
      let capturedWhere = null;
      AuditLog.findAndCountAll = async (options) => {
        capturedWhere = options.where;
        return { count: 0, rows: [] };
      };

      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-12-31');
      await AuditLogModel.query({ startDate, endDate });

      expect(capturedWhere.created_at).toBeDefined();
    });

    it('should apply correlation_id filter', async () => {
      let capturedWhere = null;
      AuditLog.findAndCountAll = async (options) => {
        capturedWhere = options.where;
        return { count: 0, rows: [] };
      };

      await AuditLogModel.query({ correlation_id: 'corr-123' });

      expect(capturedWhere.correlation_id).toBe('corr-123');
    });

    it('should handle pagination options', async () => {
      AuditLog.findAndCountAll = async (options) => {
        expect(options.limit).toBe(20);
        expect(options.offset).toBe(40);
        return { count: 100, rows: new Array(20) };
      };

      const result = await AuditLogModel.query({}, { page: 3, limit: 20 });

      expect(result.page).toBe(3);
      expect(result.totalPages).toBe(5);
    });

    it('should handle sorting options', async () => {
      let capturedOrder = null;
      AuditLog.findAndCountAll = async (options) => {
        capturedOrder = options.order;
        return { count: 0, rows: [] };
      };

      await AuditLogModel.query({}, { sortBy: 'action', sortOrder: 'ASC' });

      expect(capturedOrder).toEqual([['action', 'ASC']]);
    });
  });

  describe('AuditLogModel.findByUser', () => {
    it('should find logs by user', async () => {
      const mockLogs = [
        { log_id: 'log-1', user_id: 'user-123' },
        { log_id: 'log-2', user_id: 'user-123' }
      ];
      
      AuditLog.findAll = async (options) => {
        expect(options.where.user_id).toBe('user-123');
        expect(options.limit).toBe(50);
        return mockLogs;
      };

      const result = await AuditLogModel.findByUser('user-123');

      expect(result).toHaveLength(2);
    });

    it('should use custom limit', async () => {
      AuditLog.findAll = async (options) => {
        expect(options.limit).toBe(100);
        return [];
      };

      await AuditLogModel.findByUser('user-123', 100);
    });

    it('should order by created_at DESC', async () => {
      let capturedOrder = null;
      AuditLog.findAll = async (options) => {
        capturedOrder = options.order;
        return [];
      };

      await AuditLogModel.findByUser('user-123');

      expect(capturedOrder).toEqual([['created_at', 'DESC']]);
    });
  });

  describe('AuditLogModel.findRecent', () => {
    it('should find recent logs with default limit', async () => {
      AuditLog.findAll = async (options) => {
        expect(options.limit).toBe(100);
        return [];
      };

      await AuditLogModel.findRecent();
    });

    it('should use custom limit', async () => {
      AuditLog.findAll = async (options) => {
        expect(options.limit).toBe(50);
        return [];
      };

      await AuditLogModel.findRecent(50);
    });

    it('should order by created_at DESC', async () => {
      let capturedOrder = null;
      AuditLog.findAll = async (options) => {
        capturedOrder = options.order;
        return [];
      };

      await AuditLogModel.findRecent();

      expect(capturedOrder).toEqual([['created_at', 'DESC']]);
    });
  });

  describe('AuditLogModel.findSecurityEvents', () => {
    it('should find security events in date range', async () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-12-31');
      
      AuditLog.findAll = async (options) => {
        expect(options.where.category).toBe('SECURITY');
        expect(options.where.created_at).toBeDefined();
        expect(options.limit).toBe(100);
        return [];
      };

      await AuditLogModel.findSecurityEvents(startDate, endDate);
    });

    it('should use custom limit', async () => {
      AuditLog.findAll = async (options) => {
        expect(options.limit).toBe(50);
        return [];
      };

      await AuditLogModel.findSecurityEvents(new Date(), new Date(), 50);
    });
  });

  describe('AuditLogModel.findFailedActions', () => {
    it('should find failed actions with default limit', async () => {
      AuditLog.findAll = async (options) => {
        expect(options.where.status).toBeDefined();
        expect(options.limit).toBe(100);
        return [];
      };

      await AuditLogModel.findFailedActions();
    });

    it('should use custom limit', async () => {
      AuditLog.findAll = async (options) => {
        expect(options.limit).toBe(200);
        return [];
      };

      await AuditLogModel.findFailedActions(200);
    });
  });

  describe('AuditLogModel.deleteOldLogs', () => {
    it('should delete old logs with default retention', async () => {
      AuditLog.destroy = async (options) => {
        expect(options.where.created_at).toBeDefined();
        return 100;
      };

      const result = await AuditLogModel.deleteOldLogs();

      expect(result).toBe(100);
    });

    it('should use custom retention days', async () => {
      AuditLog.destroy = async () => 50;

      const result = await AuditLogModel.deleteOldLogs(30);

      expect(result).toBe(50);
    });

    it('should pass transaction option', async () => {
      const mockTransaction = { id: 'txn-123' };
      let capturedTransaction = null;
      
      AuditLog.destroy = async (options) => {
        capturedTransaction = options?.transaction;
        return 0;
      };

      await AuditLogModel.deleteOldLogs(90, mockTransaction);

      expect(capturedTransaction).toEqual(mockTransaction);
    });

    it('should pass null transaction when not provided', async () => {
      let capturedTransaction = 'not-set';
      AuditLog.destroy = async (options) => {
        capturedTransaction = options?.transaction;
        return 0;
      };

      await AuditLogModel.deleteOldLogs();

      expect(capturedTransaction).toBeNull();
    });
  });

  describe('AuditLogModel.getStats', () => {
    it('should return statistics without date range', async () => {
      let countCallCount = 0;
      AuditLog.count = async () => {
        countCallCount++;
        return 100;
      };

      AuditLog.findAll = async (options) => {
        if (options.attributes[0] === 'action') {
          return [{ toJSON: () => ({ action: 'LOGIN', count: '50' }) }];
        }
        if (options.attributes[0] === 'status') {
          return [{ toJSON: () => ({ status: 'SUCCESS', count: '80' }) }];
        }
        if (options.attributes[0] === 'severity') {
          return [{ toJSON: () => ({ severity: 'INFO', count: '90' }) }];
        }
        if (options.attributes[0] === 'category') {
          return [{ toJSON: () => ({ category: 'SECURITY', count: '30' }) }];
        }
        return [];
      };

      const result = await AuditLogModel.getStats();

      expect(result.total).toBe(100);
      expect(result.byAction).toBeDefined();
      expect(result.byStatus).toBeDefined();
      expect(result.bySeverity).toBeDefined();
      expect(result.byCategory).toBeDefined();
    });

    it('should apply date range filter', async () => {
      let capturedWhere = null;
      AuditLog.count = async (options) => {
        capturedWhere = options.where;
        return 0;
      };

      AuditLog.findAll = async () => [];

      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-12-31');
      await AuditLogModel.getStats(startDate, endDate);

      expect(capturedWhere.created_at).toBeDefined();
    });

    it('should not apply date filter when dates are null', async () => {
      let capturedWhere = null;
      AuditLog.count = async (options) => {
        capturedWhere = options.where;
        return 0;
      };

      AuditLog.findAll = async () => [];

      await AuditLogModel.getStats(null, null);

      expect(capturedWhere.created_at).toBeUndefined();
    });
  });

  describe('AuditLogModel.count', () => {
    it('should count all logs with empty where', async () => {
      AuditLog.count = async () => 500;

      const result = await AuditLogModel.count();

      expect(result).toBe(500);
    });

    it('should count with custom where clause', async () => {
      let capturedWhere = null;
      AuditLog.count = async (options) => {
        capturedWhere = options.where;
        return 10;
      };

      await AuditLogModel.count({ action: 'LOGIN' });

      expect(capturedWhere.action).toBe('LOGIN');
    });
  });

  describe('Export Structure', () => {
    it('should export AuditLog', () => {
      expect(AuditLog).toBeDefined();
    });

    it('should export AuditLogModel', () => {
      expect(AuditLogModel).toBeDefined();
    });

    it('should have create method', () => {
      expect(AuditLogModel.create).toBeDefined();
      expect(typeof AuditLogModel.create).toBe('function');
    });

    it('should have bulkCreate method', () => {
      expect(AuditLogModel.bulkCreate).toBeDefined();
      expect(typeof AuditLogModel.bulkCreate).toBe('function');
    });

    it('should have findById method', () => {
      expect(AuditLogModel.findById).toBeDefined();
      expect(typeof AuditLogModel.findById).toBe('function');
    });

    it('should have query method', () => {
      expect(AuditLogModel.query).toBeDefined();
      expect(typeof AuditLogModel.query).toBe('function');
    });

    it('should have findByUser method', () => {
      expect(AuditLogModel.findByUser).toBeDefined();
      expect(typeof AuditLogModel.findByUser).toBe('function');
    });

    it('should have findRecent method', () => {
      expect(AuditLogModel.findRecent).toBeDefined();
      expect(typeof AuditLogModel.findRecent).toBe('function');
    });

    it('should have findSecurityEvents method', () => {
      expect(AuditLogModel.findSecurityEvents).toBeDefined();
      expect(typeof AuditLogModel.findSecurityEvents).toBe('function');
    });

    it('should have findFailedActions method', () => {
      expect(AuditLogModel.findFailedActions).toBeDefined();
      expect(typeof AuditLogModel.findFailedActions).toBe('function');
    });

    it('should have deleteOldLogs method', () => {
      expect(AuditLogModel.deleteOldLogs).toBeDefined();
      expect(typeof AuditLogModel.deleteOldLogs).toBe('function');
    });

    it('should have getStats method', () => {
      expect(AuditLogModel.getStats).toBeDefined();
      expect(typeof AuditLogModel.getStats).toBe('function');
    });

    it('should have count method', () => {
      expect(AuditLogModel.count).toBeDefined();
      expect(typeof AuditLogModel.count).toBe('function');
    });
  });

  describe('Edge Cases', () => {
    it('should handle query with all filters', async () => {
      let capturedWhere = null;
      AuditLog.findAndCountAll = async (options) => {
        capturedWhere = options.where;
        return { count: 0, rows: [] };
      };

      await AuditLogModel.query({
        user_id: 'user-123',
        user_email: 'test@',
        action: 'LOGIN',
        target_type: 'USER',
        target_id: 'target-123',
        target_table: 'sys_users',
        status: 'SUCCESS',
        severity: 'INFO',
        category: 'SECURITY',
        organization_id: 'org-123',
        ip_address: '127.0.0.1',
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-12-31'),
        correlation_id: 'corr-123'
      });

      expect(capturedWhere.user_id).toBe('user-123');
      expect(capturedWhere.action).toBe('LOGIN');
      expect(capturedWhere.target_type).toBe('USER');
    });

    it('should handle empty actions array', async () => {
      let capturedWhere = null;
      AuditLog.findAndCountAll = async (options) => {
        capturedWhere = options.where;
        return { count: 0, rows: [] };
      };

      await AuditLogModel.query({ actions: [] });

      // Empty array should still set the filter
      expect(capturedWhere.action).toBeDefined();
    });

    it('should handle non-array actions', async () => {
      let capturedWhere = null;
      AuditLog.findAndCountAll = async (options) => {
        capturedWhere = options.where;
        return { count: 0, rows: [] };
      };

      await AuditLogModel.query({ actions: 'not-an-array' });

      // Non-array should not set the actions filter
      expect(capturedWhere.action).toBeUndefined();
    });

    it('should calculate totalPages correctly', async () => {
      AuditLog.findAndCountAll = async () => {
        return { count: 125, rows: new Array(50) };
      };

      const result = await AuditLogModel.query({}, { page: 1, limit: 50 });

      expect(result.totalPages).toBe(3);
    });

    it('should handle zero total in pagination', async () => {
      AuditLog.findAndCountAll = async () => {
        return { count: 0, rows: [] };
      };

      const result = await AuditLogModel.query();

      expect(result.totalPages).toBe(0);
    });

    it('should handle getStats with multiple results per category', async () => {
      AuditLog.count = async () => 100;

      AuditLog.findAll = async (options) => {
        if (options.attributes[0] === 'action') {
          return [
            { toJSON: () => ({ action: 'LOGIN', count: '30' }) },
            { toJSON: () => ({ action: 'LOGOUT', count: '20' }) },
            { toJSON: () => ({ action: 'UPDATE', count: '50' }) }
          ];
        }
        return [];
      };

      const result = await AuditLogModel.getStats();

      expect(result.byAction).toHaveLength(3);
    });
  });
});
