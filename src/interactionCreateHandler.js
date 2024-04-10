const { helpCommand } = require('./helpCommand');

async function onInteractionCreate(interaction, conversationManager, commandHandler, errorHandler) {
	if (!interaction.isCommand()) return;

	if (interaction.commandName === 'help') {
		try {
			await helpCommand(interaction);
		} catch (error) {
			await errorHandler.handleError(error, interaction);
		}
		return;
	}

	if (interaction.commandName === 'clear') {
		try {
			await interaction.deferReply({ ephemeral: true });
			await commandHandler.clearCommand(interaction, conversationManager);
		} catch (error) {
			await errorHandler.handleError(error, interaction);
		}
		return;
	}

	if (interaction.commandName === 'save') {
		try {
			await interaction.deferReply({ ephemeral: true });
			await commandHandler.saveCommand(interaction, conversationManager);
		} catch (error) {
			await errorHandler.handleError(error, interaction);
		}
		return;
	}

	if (interaction.commandName === 'model') {
		try {
			await interaction.deferReply({ ephemeral: true });
			await commandHandler.modelCommand(interaction, conversationManager);
		} catch (error) {
			await errorHandler.handleError(error, interaction);
		}
		return;
	}

	if (interaction.commandName === 'prompt') {
		try {
			await interaction.deferReply({ ephemeral: true });
			await commandHandler.promptCommand(interaction, conversationManager);
		} catch (error) {
			await errorHandler.handleError(error, interaction);
		}
		return;
	}

	if (interaction.commandName === 'reset') {
		try {
			await interaction.deferReply({ ephemeral: true });
			await commandHandler.resetCommand(interaction, conversationManager);
		} catch (error) {
			await errorHandler.handleError(error, interaction);
		}
		return;
	}

	if (interaction.commandName === 'testerror') {
		try {
			await interaction.deferReply({ ephemeral: true });
			// Check if the user executing the command is the bot owner
			if (interaction.user.id !== process.env.DISCORD_USER_ID) {
				await interaction.editReply('Only the bot owner can use this command.');
				return;
			}
			// Trigger a test error
			throw new Error('This is a test error triggered by the /testerror command.');
		} catch (error) {
			await errorHandler.handleError(error, interaction);
		}
		return;
	}

	if (interaction.commandName === 'settings') {
		try {
			await interaction.deferReply({ ephemeral: true });
			await commandHandler.settingsCommand(interaction, conversationManager);
		} catch (error) {
			await interaction.editReply({
				content: 'An error occurred while processing the command.',
				ephemeral: true,
			});
			await errorHandler.handleError(error, interaction);
		}
		return;
	}
}

module.exports = { onInteractionCreate };
