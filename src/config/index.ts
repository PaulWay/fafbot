

export const env = process.env.NODE_ENV || 'development';
console.log("Database:", process.env.DB_DATABASE);
const config = {
  development: {
    host: process.env.DB_HOST,
    database: process.env.DB_DATABASE,
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    discordToken: process.env.DISCORD_TOKEN,
    clientId: process.env.FAF_DISCORD_APP_ID,
    dialect: "postgres",
    logging: console.log
  },
  test: {
    host: process.env.DB_HOST,
    database: process.env.DB_DATABASE,
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    discordToken: process.env.DISCORD_TOKEN,
    clientId: process.env.FAF_DISCORD_APP_ID,
    dialect: "postgres",
  },
  production: {
    host: '/tmp/.s.PGSQL.5432',
    // host: process.env.DB_HOST,
    database: process.env.DB_DATABASE,
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    discordToken: process.env.DISCORD_TOKEN,
    clientId: process.env.FAF_DISCORD_APP_ID,
    dialect: "postgres",
    dialectOptions: { socketPath: '/tmp/.s.PGSQL.5432' },
  }
};
export default config[env];
