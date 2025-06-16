import dotenv from "dotenv"

dotenv.config({ path: ".env" })

export const config = {
    port: process.env.PORT,
    nodeEnv: process.env.NODE_ENV,
    frontendUrl: process.env.FRONTEND_URL,
    databaseUrl: process.env.DATABASE_URL,
    redis: {
        host: process.env.REDIS_HOST,
        port: process.env.REDIS_PORT,
        password: process.env.REDIS_PASSWORD,
        db: process.env.REDIS_DB
    },
}

export const validateConfig = () => {
    for (const [key, value] of Object.entries(config)) {
        if (!value) {
            throw new Error(`${key} is not defined in the environment variables`)
        }
    }
}

validateConfig()