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
			await interaction.deferReply();
			conversationManager.clearHistory(interaction.user.id);
			await interaction.editReply('Your conversation history has been cleared.');
		} catch (error) {
			await errorHandler.handleError(error, interaction);
		}
		return;
	}

	if (interaction.commandName === 'save') {
		try {
			await interaction.deferReply();
			await commandHandler.saveCommand(interaction, conversationManager);
			await interaction.editReply('The conversation has been saved and sent to your inbox.');
		} catch (error) {
			await errorHandler.handleError(error, interaction);
		}
		return;
	}

	if (interaction.commandName === 'model') {
		try {
			await interaction.deferReply();
			await commandHandler.modelCommand(interaction, conversationManager);
			await interaction.editReply(`The model has been set to ${interaction.options.getString('name')}.`);
		} catch (error) {
			await errorHandler.handleError(error, interaction);
		}
		return;
	}

	if (interaction.commandName === 'prompt') {
		try {
			await interaction.deferReply();
			await commandHandler.promptCommand(interaction, conversationManager);
			await interaction.editReply(`> \`The system prompt has been set to ${interaction.options.getString('name')}.\``);
		} catch (error) {
			await errorHandler.handleError(error, interaction);
		}
		return;
	}

	if (interaction.commandName === 'reset') {
		try {
			await commandHandler.resetCommand(interaction, conversationManager);
		} catch (error) {
			await errorHandler.handleError(error, interaction);
		}
		return;
	}

	if (interaction.commandName === 'testerror') {
		try {
			await interaction.deferReply();
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
}

module.exports = { onInteractionCreate };
