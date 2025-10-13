import dotenv from "dotenv";
dotenv.config();

export const dbConfig = {
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "eloquentjs_db",
  connectionLimit: parseInt(process.env.DB_CONNECTION_LIMIT || "10", 10),
};
