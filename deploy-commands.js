require('dotenv').config();
const { SlashCommandBuilder, REST, Routes } = require('discord.js');

const commands = [
  new SlashCommandBuilder()
    .setName('clear')
    .setDescription('Clears the conversation history.')
    .setDMPermission(false),
  new SlashCommandBuilder()
    .setName('save')
    .setDescription('Saves the current conversation and sends it to your inbox.')
    .setDMPermission(false),
  new SlashCommandBuilder()
    .setName('model')
    .setDescription('Change the model used by the bot.')
    .addStringOption(option =>
      option.setName('name')
        .setDescription('The name of the model.')
        .setRequired(true)
        .addChoices(
          { name: 'claude-3-opus-20240229', value: 'claude-3-opus-20240229' },
          { name: 'claude-3-sonnet-20240229', value: 'claude-3-sonnet-20240229' },
          { name: 'claude-3-haiku-20240307', value: 'claude-3-haiku-20240307' }
        )
    )
    .setDMPermission(false),
  new SlashCommandBuilder()
    .setName('prompt')
    .setDescription('Change the system prompt used by the bot.')
    .addStringOption(option =>
      option.setName('name')
        .setDescription('The name of the prompt.')
        .setRequired(true)
        .addChoices(
          { name: 'neko cat', value: 'neko_cat' },
          { name: 'act as a JavaScript Developer', value: 'javascript_developer' },
          { name: 'act as a Python Developer', value: 'python_developer' },
          { name: 'act as a Helpful Assistant', value: 'helpful_assistant' }
        )
    )
    .setDMPermission(false),
  new SlashCommandBuilder()
    .setName('reset')
    .setDescription('Reset the model and prompt to the default settings.')
    .setDMPermission(false),
  new SlashCommandBuilder()
    .setName('help')
    .setDescription('Displays the list of available commands and their usage.')
    .setDMPermission(false),
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