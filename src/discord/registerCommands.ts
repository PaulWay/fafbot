import { SlashCommandBuilder } from '@discordjs/builders';
import { REST } from '@discordjs/rest';
import { Routes } from 'discord-api-types/v9';
import config from '../config';
import commands, { Command } from './commands';

const rest = new REST({ version: '9' }).setToken(config.discordToken);

const buildSlash = ({name, description}: Command) => new SlashCommandBuilder()
  .setName(name)
  .setDescription(description)
  .toJSON();

const register = async (clientId: string, guildId: string) => {
  const messages = commands.map(buildSlash);
  await rest.put(Routes.applicationGuildCommands(clientId, guildId), { body: messages })
  console.log('registered commands');
}

export default register;
