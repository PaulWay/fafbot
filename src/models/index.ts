import { Sequelize } from 'sequelize';
import Config from '../config';
import FafUser from './fafuser';
import Guild from './guild';
import GuildJoin from './guildjoin';

const config = Config;

require("dotenv").config();
const fs = require('fs');
const path = require('path');
const Sequelize = require('sequelize');
const basename = path.basename(__filename);
const env = process.env.NODE_ENV || 'development';
const config = require('/config/config.js')[env];
const db = {};

let sequelize = new Sequelize(config.database, config.username, config.password, config);

Object.keys(db).forEach(modelName => {
  if (db[modelName].associate) {
    db[modelName].associate(db);
  }
});
db.sequelize = sequelize;
db.Sequelize = Sequelize;

module.exports = {
    connection: db,
    FafUser: FafUser,
    Guild: Guild,
    GuildJoin: GuildJoin,
};
