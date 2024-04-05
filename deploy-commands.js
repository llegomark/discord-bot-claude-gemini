require('dotenv').config();
const { SlashCommandBuilder, REST, Routes } = require('discord.js');

const commands = [
  new SlashCommandBuilder()
    .setName('clear')
    .setDescription('Clears the conversation history.')
    .setDMPermission(true),
  new SlashCommandBuilder()
    .setName('save')
    .setDescription('Saves the current conversation and sends it to your inbox.')
    .setDMPermission(true),
].map(command => command.toJSON());

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_BOT_TOKEN);

(async () => {
  try {
    console.log('Started refreshing application (/) commands.');

    await rest.put(
      Routes.applicationCommands(process.env.DISCORD_CLIENT_ID),
      { body: commands },
    );

    console.log('Successfully reloaded application (/) commands.');
  } catch (error) {
    console.error('Error deploying slash commands:', error);
  }
})();