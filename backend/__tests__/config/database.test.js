/**
 * Database Configuration Unit Tests
 * ISO 27001 Annex A.8 - Database Security Testing
 * 
 * Tests all branches in database.js for 95%+ branch coverage
 */

import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';

describe('Database Configuration - Branch Coverage', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  describe('Development Configuration Branches', () => {
    it('should use DB_PORT from env when set', async () => {
      process.env.DB_USER = 'test_user';
      process.env.DB_PASSWORD = 'test_pass';
      process.env.DB_DATABASE = 'test_db';
      process.env.DB_HOST = 'localhost';
      process.env.DB_PORT = '5433';
      process.env.DB_SSL = 'false';
      
      const config = (await import('../../src/config/database.js?dev-port-set')).default;
      
      expect(config.development.port).toBe('5433');
    });

    it('should default DB_PORT to 5432 when not set (development)', async () => {
      process.env.DB_USER = 'test_user';
      process.env.DB_PASSWORD = 'test_pass';
      process.env.DB_DATABASE = 'test_db';
      process.env.DB_HOST = 'localhost';
      delete process.env.DB_PORT;
      process.env.DB_SSL = 'false';
      
      const config = (await import('../../src/config/database.js?dev-port-default')).default;
      
      expect(config.development.port).toBe(5432);
    });

    it('should enable SSL when DB_SSL is true (development)', async () => {
      process.env.DB_USER = 'test_user';
      process.env.DB_PASSWORD = 'test_pass';
      process.env.DB_DATABASE = 'test_db';
      process.env.DB_HOST = 'localhost';
      process.env.DB_PORT = '5432';
      process.env.DB_SSL = 'true';
      
      const config = (await import('../../src/config/database.js?dev-ssl-true')).default;
      
      expect(config.development.dialectOptions.ssl).toEqual({
        require: true,
        rejectUnauthorized: false
      });
    });

    it('should disable SSL when DB_SSL is false (development)', async () => {
      process.env.DB_USER = 'test_user';
      process.env.DB_PASSWORD = 'test_pass';
      process.env.DB_DATABASE = 'test_db';
      process.env.DB_HOST = 'localhost';
      process.env.DB_PORT = '5432';
      process.env.DB_SSL = 'false';
      
      const config = (await import('../../src/config/database.js?dev-ssl-false')).default;
      
      expect(config.development.dialectOptions.ssl).toBe(false);
    });

    it('should disable SSL when DB_SSL is not set (development)', async () => {
      process.env.DB_USER = 'test_user';
      process.env.DB_PASSWORD = 'test_pass';
      process.env.DB_DATABASE = 'test_db';
      process.env.DB_HOST = 'localhost';
      process.env.DB_PORT = '5432';
      delete process.env.DB_SSL;
      
      const config = (await import('../../src/config/database.js?dev-ssl-unset')).default;
      
      expect(config.development.dialectOptions.ssl).toBe(false);
    });
  });

  describe('Production Configuration Branches', () => {
    it('should use DB_PORT from env when set (production)', async () => {
      process.env.DB_USER = 'test_user';
      process.env.DB_PASSWORD = 'test_pass';
      process.env.DB_DATABASE = 'test_db';
      process.env.DB_HOST = 'localhost';
      process.env.DB_PORT = '5434';
      
      const config = (await import('../../src/config/database.js?prod-port-set')).default;
      
      expect(config.production.port).toBe('5434');
    });

    it('should default DB_PORT to 5432 when not set (production)', async () => {
      process.env.DB_USER = 'test_user';
      process.env.DB_PASSWORD = 'test_pass';
      process.env.DB_DATABASE = 'test_db';
      process.env.DB_HOST = 'localhost';
      delete process.env.DB_PORT;
      
      const config = (await import('../../src/config/database.js?prod-port-default')).default;
      
      expect(config.production.port).toBe(5432);
    });

    it('should always have SSL enabled in production', async () => {
      process.env.DB_USER = 'test_user';
      process.env.DB_PASSWORD = 'test_pass';
      process.env.DB_DATABASE = 'test_db';
      process.env.DB_HOST = 'localhost';
      
      const config = (await import('../../src/config/database.js?prod-ssl')).default;
      
      expect(config.production.dialectOptions.ssl).toEqual({
        require: true,
        rejectUnauthorized: false
      });
    });
  });

  describe('Test Configuration Branches', () => {
    it('should use DB_PORT from env when set (test)', async () => {
      process.env.DB_USER = 'test_user';
      process.env.DB_PASSWORD = 'test_pass';
      process.env.DB_DATABASE = 'test_db';
      process.env.DB_HOST = 'localhost';
      process.env.DB_PORT = '5435';
      
      const config = (await import('../../src/config/database.js?test-port-set')).default;
      
      expect(config.test.port).toBe('5435');
    });

    it('should default DB_PORT to 5432 when not set (test)', async () => {
      process.env.DB_USER = 'test_user';
      process.env.DB_PASSWORD = 'test_pass';
      process.env.DB_DATABASE = 'test_db';
      process.env.DB_HOST = 'localhost';
      delete process.env.DB_PORT;
      
      const config = (await import('../../src/config/database.js?test-port-default')).default;
      
      expect(config.test.port).toBe(5432);
    });

    it('should append _test to database name', async () => {
      process.env.DB_USER = 'test_user';
      process.env.DB_PASSWORD = 'test_pass';
      process.env.DB_DATABASE = 'mydb';
      process.env.DB_HOST = 'localhost';
      
      const config = (await import('../../src/config/database.js?test-dbname')).default;
      
      expect(config.test.database).toBe('mydb_test');
    });
  });

  describe('All Configuration Values', () => {
    beforeEach(() => {
      process.env.DB_USER = 'db_user';
      process.env.DB_PASSWORD = 'db_pass';
      process.env.DB_DATABASE = 'db_name';
      process.env.DB_HOST = 'db_host';
      process.env.DB_PORT = '5432';
      process.env.DB_SSL = 'true';
    });

    it('should have all development settings', async () => {
      const config = (await import('../../src/config/database.js?all-dev')).default;
      
      expect(config.development.username).toBe('db_user');
      expect(config.development.password).toBe('db_pass');
      expect(config.development.database).toBe('db_name');
      expect(config.development.host).toBe('db_host');
      expect(config.development.dialect).toBe('postgres');
      expect(config.development.logging).toBe(console.log);
      expect(config.development.pool).toEqual({
        max: 5,
        min: 0,
        acquire: 30000,
        idle: 10000
      });
    });

    it('should have all production settings', async () => {
      const config = (await import('../../src/config/database.js?all-prod')).default;
      
      expect(config.production.username).toBe('db_user');
      expect(config.production.password).toBe('db_pass');
      expect(config.production.database).toBe('db_name');
      expect(config.production.host).toBe('db_host');
      expect(config.production.dialect).toBe('postgres');
      expect(config.production.logging).toBe(false);
      expect(config.production.pool).toEqual({
        max: 10,
        min: 2,
        acquire: 30000,
        idle: 10000
      });
    });

    it('should have all test settings', async () => {
      const config = (await import('../../src/config/database.js?all-test')).default;
      
      expect(config.test.username).toBe('db_user');
      expect(config.test.password).toBe('db_pass');
      expect(config.test.database).toBe('db_name_test');
      expect(config.test.host).toBe('db_host');
      expect(config.test.dialect).toBe('postgres');
      expect(config.test.logging).toBe(false);
    });
  });
});

describe('Database Security Compliance (ISO 27001)', () => {
  beforeEach(() => {
    process.env.DB_USER = 'secure_user';
    process.env.DB_PASSWORD = 'secure_pass';
    process.env.DB_DATABASE = 'secure_db';
    process.env.DB_HOST = 'secure_host';
    process.env.DB_SSL = 'true';
  });

  it('should require SSL in production (A.8.21)', async () => {
    const config = (await import('../../src/config/database.js?security-ssl')).default;
    expect(config.production.dialectOptions.ssl.require).toBe(true);
  });

  it('should have connection pooling configured (A.8.6)', async () => {
    const config = (await import('../../src/config/database.js?security-pool')).default;
    expect(config.development.pool).toBeDefined();
    expect(config.production.pool).toBeDefined();
  });

  it('should disable verbose logging in production (A.8.15)', async () => {
    const config = (await import('../../src/config/database.js?security-logging')).default;
    expect(config.production.logging).toBe(false);
    expect(config.test.logging).toBe(false);
  });

  it('should have separate test database (A.8.31)', async () => {
    const config = (await import('../../src/config/database.js?security-testdb')).default;
    expect(config.test.database).not.toBe(config.development.database);
  });
});
