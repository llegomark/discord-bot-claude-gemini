require('dotenv').config();
const { WebhookClient } = require('discord.js');

class ErrorHandler {
	async handleError(error, interaction) {
		console.error('Error processing the interaction:', error);

		if (interaction.commandName === 'testerror') {
			if (error.message === 'This is a test error triggered by the /testerror command.') {
				await interaction.editReply('Test error triggered successfully. Check the error notification channel for details.');
			} else {
				await interaction.editReply('An unexpected error occurred while processing the /testerror command.');
			}
		} else {
			await interaction.reply('Sorry, something went wrong! Our team has been notified and will look into the issue.');
		}

		// Log error details for debugging
		const errorDetails = {
			message: error.message,
			stack: error.stack,
			timestamp: new Date().toLocaleString('en-US', { timeZone: 'Asia/Manila' }),
			userId: interaction.user?.id,
			command: interaction.commandName,
			environment: process.env.NODE_ENV,
		};
		console.error('Error details:', errorDetails);

		// Send error notification via Discord webhook
		await this.sendErrorNotification(errorDetails);
	}

	async handleModelResponseError(error, botMessage, originalMessage) {
		console.error(error.message);
		if (error.status === 429) {
			await botMessage.edit(`<@${originalMessage.author.id}>, Meow, I'm a bit overloaded right now. Please try again later! 😿`);
		} else if (error.status === 400) {
			await botMessage.edit(
				`<@${originalMessage.author.id}>, Oops, there was an issue with the format or content of the request. Please try again.`,
			);
		} else if (error.status === 401) {
			await botMessage.edit(
				`<@${originalMessage.author.id}>, Uh-oh, there seems to be an issue with the API key. Please contact the bot owner.`,
			);
		} else if (error.status === 403) {
			await botMessage.edit(`<@${originalMessage.author.id}>, Sorry, the API key doesn't have permission to use the requested resource.`);
		} else if (error.status === 404) {
			await botMessage.edit(
				`<@${originalMessage.author.id}>, The requested resource was not found. Please check your request and try again.`,
			);
		} else if (error.status === 500) {
			await botMessage.edit(
				`<@${originalMessage.author.id}>, An unexpected error occurred on the API provider's end. Please try again later.`,
			);
		} else if (error.status === 529) {
			await botMessage.edit(`<@${originalMessage.author.id}>, The API is temporarily overloaded. Please try again later.`);
		} else {
			await botMessage.edit(`<@${originalMessage.author.id}>, Sorry, I couldn't generate a response.`);
		}
		// Send the error to the ErrorHandler for notification
		await this.handleError(error, originalMessage);
	}

	handleUnhandledRejection(error) {
		console.error('Unhandled Rejection:', error);
		// Log error details for debugging
		const errorDetails = {
			message: error.message,
			stack: error.stack,
			timestamp: new Date().toLocaleString('en-US', { timeZone: 'Asia/Manila' }),
			environment: process.env.NODE_ENV,
		};
		console.error('Error details:', errorDetails);
		// Send error notification via Discord webhook
		this.sendErrorNotification(errorDetails);
	}

	handleUncaughtException(error) {
		console.error('Uncaught Exception:', error);
		// Log error details for debugging
		const errorDetails = {
			message: error.message,
			stack: error.stack,
			timestamp: new Date().toLocaleString('en-US', { timeZone: 'Asia/Manila' }),
			environment: process.env.NODE_ENV,
		};
		console.error('Error details:', errorDetails);
		// Send error notification via Discord webhook
		this.sendErrorNotification(errorDetails);
		process.exit(1);
	}

	logErrorToFile(error) {
		const fs = require('fs');
		const path = require('path');
		const logDirectory = path.join(__dirname, 'logs');
		const logFileName = `error-${new Date().toISOString().replace(/:/g, '-')}.log`;
		const logFilePath = path.join(logDirectory, logFileName);
		// Create the logs directory if it doesn't exist
		if (!fs.existsSync(logDirectory)) {
			fs.mkdirSync(logDirectory);
		}
		const errorDetails = {
			message: error.message,
			stack: error.stack,
			timestamp: new Date().toLocaleString('en-US', { timeZone: 'Asia/Manila' }),
			environment: process.env.NODE_ENV,
		};
		const logMessage = `${JSON.stringify(errorDetails)}\n`;
		fs.appendFile(logFilePath, logMessage, (err) => {
			if (err) {
				console.error('Failed to log error to file:', err);
			}
		});
	}

	async sendErrorNotification(errorDetails) {
		const webhookUrl = process.env.ERROR_NOTIFICATION_WEBHOOK;
		if (webhookUrl) {
			const webhookClient = new WebhookClient({ url: webhookUrl });
			const errorMessage = `An error occurred:\n\`\`\`json\n${JSON.stringify(errorDetails, null, 2)}\n\`\`\``;
			try {
				await webhookClient.send({
					content: errorMessage,
					username: 'Error Notification',
				});
				console.log('Error notification sent via Discord webhook.');
			} catch (err) {
				console.error('Failed to send error notification via Discord webhook:', err);
			}
		} else {
			console.warn('ERROR_NOTIFICATION_WEBHOOK not set. Skipping error notification via Discord webhook.');
		}
	}
}

module.exports.ErrorHandler = ErrorHandler;
