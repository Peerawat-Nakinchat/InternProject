// src/config/database.js
import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

//Schema เพื่อ Validate Environment Variables
const dbEnvSchema = z.object({
  DB_HOST: z.string().min(1, "DB_HOST is required"),
  DB_PORT: z.coerce.number().default(5432),
  DB_USER: z.string().min(1, "DB_USER is required"),
  DB_PASSWORD: z.string().min(1, "DB_PASSWORD is required"),
  DB_DATABASE: z.string().min(1, "DB_DATABASE is required"),
  DB_SSL: z.string().transform((val) => val === 'true').optional(),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development')
});

//Parse และ Validate 
const env = dbEnvSchema.parse(process.env);

const config = {
  development: {
    username: env.DB_USER,
    password: env.DB_PASSWORD,
    database: env.DB_DATABASE,
    host: env.DB_HOST,
    port: env.DB_PORT,
    dialect: 'postgres',
    logging: (msg) => console.log(`[Sequelize] ${msg}`), 
    pool: {
      max: 10, 
      min: 0,
      acquire: 30000,
      idle: 10000
    }
  },
  production: {
    username: env.DB_USER,
    password: env.DB_PASSWORD,
    database: env.DB_DATABASE,
    host: env.DB_HOST,
    port: env.DB_PORT,
    dialect: 'postgres',
    logging: false, 
    pool: {
      max: 20, 
      min: 5,  
      acquire: 60000,
      idle: 10000
    },
    dialectOptions: env.DB_SSL ? {
      ssl: {
        require: true,
        rejectUnauthorized: false 
      }
    } : {}
  },
  test: {
    username: env.DB_USER,
    password: env.DB_PASSWORD,
    database: env.DB_DATABASE + '_test',
    host: env.DB_HOST,
    port: env.DB_PORT,
    dialect: 'postgres',
    logging: false
  }
};

export default config;