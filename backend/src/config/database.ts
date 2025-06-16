import mongoose from 'mongoose';
import { createClient } from 'redis';
import { config } from './config.js';

export class DatabaseConfig {
  private static mongoConnection: typeof mongoose | null = null;
  private static redisClient: ReturnType<typeof createClient> | null = null;

  static async connectMongoDB(): Promise<typeof mongoose> {
    if (this.mongoConnection) {
      return this.mongoConnection;
    }

    try {
      const mongoUri = config.databaseUrl || 'mongodb://localhost:27017/chat-app';
      this.mongoConnection = await mongoose.connect(mongoUri);
      console.log('✅ Connected to MongoDB');
      return this.mongoConnection;
    } catch (error) {
      console.error('❌ MongoDB connection error:', error);
      throw error;
    }
  }

  static async connectRedis(): Promise<ReturnType<typeof createClient>> {
    if (this.redisClient) {
      return this.redisClient;
    }

    try {
      const redisConfig = {
        host: config.redis.host || 'localhost',
        port: parseInt(config.redis.port || '6379'),
        password: config.redis.password,
        db: parseInt(config.redis.db || '0')
      };

      const redisUrl = `redis://${redisConfig.password ? `:${redisConfig.password}@` : ''}${redisConfig.host}:${redisConfig.port}/${redisConfig.db}`;
      
      this.redisClient = createClient({ url: redisUrl });
      
      this.redisClient.on('error', (err) => {
        console.error('❌ Redis Client Error:', err);
      });

      this.redisClient.on('connect', () => {
        console.log('📡 Connecting to Redis...');
      });

      this.redisClient.on('ready', () => {
        console.log('✅ Connected to Redis');
      });

      await this.redisClient.connect();
      return this.redisClient;
    } catch (error) {
      console.error('❌ Redis connection error:', error);
      throw error;
    }
  }

  static getRedisClient(): ReturnType<typeof createClient> | null {
    return this.redisClient;
  }

  static async disconnect(): Promise<void> {
    try {
      if (this.mongoConnection) {
        await mongoose.disconnect();
        this.mongoConnection = null;
        console.log('🔌 Disconnected from MongoDB');
      }

      if (this.redisClient) {
        await this.redisClient.quit();
        this.redisClient = null;
        console.log('🔌 Disconnected from Redis');
      }
    } catch (error) {
      console.error('Error during database disconnection:', error);
    }
  }

  static async getConnectionStatus(): Promise<{
    mongodb: boolean;
    redis: boolean;
  }> {
    return {
      mongodb: mongoose.connection.readyState === 1,
      redis: this.redisClient?.isOpen || false
    };
  }
} 