import { Sequelize } from 'sequelize';
import Config from '../config';
import FafUser from './fafuser';
import Guild from './guild';
import GuildJoin from './guildjoin';

const config = Config;

let sequelize = new Sequelize(config.database, config.username, config.password, config);

const fafUser = FafUser(sequelize);
const guild = Guild(sequelize);
const guildJoin = GuildJoin(sequelize);

export default {
    // connection: {
    //   sequelize,
    //   Sequelize
    // },
    FafUser: fafUser,
    Guild: guild,
    GuildJoin: guildJoin,
};
