// src/config/dbConnection.js
import { Sequelize } from 'sequelize';
import config from './database.js';
import  logger  from '../utils/logger.js'; 

const env = process.env.NODE_ENV || 'development';
const dbConfig = config[env];

//Instance
const sequelize = new Sequelize(
  dbConfig.database,
  dbConfig.username,
  dbConfig.password,
  {
    ...dbConfig,
    define: {
      timestamps: true,
      underscored: true,
      freezeTableName: true
    },
    // Custom logging 
    logging: (msg) => env === 'development' ? console.log(msg) : false,
  }
);

//Retry Connection
const connectWithRetry = async (retries = 5, interval = 5000) => {
  for (let i = 0; i < retries; i++) {
    try {
      await sequelize.authenticate();
      logger.info('✅ Database connection established successfully.');
      return; 
    } catch (error) {
      logger.error(`❌ Database connection failed (Attempt ${i + 1}/${retries}):`, error.message);
      if (i === retries - 1) {
        logger.error('💥 Max retries reached. Exiting...');
        process.exit(1);
      }
      await new Promise(resolve => setTimeout(resolve, interval));
    }
  }
};

if (env !== 'test') {
  connectWithRetry();
}


export default sequelize;