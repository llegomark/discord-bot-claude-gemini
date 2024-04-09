const { EmbedBuilder } = require('discord.js');

async function helpCommand(interaction) {
	const helpEmbed = new EmbedBuilder()
		.setColor('#0099ff')
		.setTitle('Available Commands')
		.setDescription('Here are the available commands and their usage:')
		.addFields(
			{ name: '/clear', value: 'Clears the conversation history.' },
			{ name: '/save', value: 'Saves the current conversation and sends it to your inbox.' },
			{ name: '/model', value: 'Change the model used by the bot. Usage: `/model [model_name]`' },
			{ name: '/prompt', value: 'Change the system prompt used by the bot. Usage: `/prompt [prompt_name]`' },
			{ name: '/reset', value: 'Reset the model and prompt to the default settings.' },
			{ name: '/help', value: 'Displays this help message.' },
			{
				name: 'Installation & Activation',
				value: `To install and activate the Discord bot on your server, please DM [markllego](https://discord.com/users/1012984419029622784) on either Discord or [Twitter](https://twitter.com/markllego).`,
			},
		)
		.setTimestamp();

	await interaction.reply({ embeds: [helpEmbed], ephemeral: true });
}

module.exports = { helpCommand };
