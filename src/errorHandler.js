require('dotenv').config();
const { WebhookClient } = require('discord.js');
const { config } = require('./config');

class ErrorHandler {
	constructor() {
		this.errorNotificationThrottle = {
			window: 60 * 1000, // 1 minute
			maxNotifications: 5, // Maximum notifications allowed within the window
			recentNotifications: [], // Array to store recent notification timestamps
		};
	}

	async handleError(error, interaction) {
		console.error('Error processing the interaction:', error);
		if (interaction.commandName === 'testerror') {
			if (error.message === 'This is a test error triggered by the /testerror command.') {
				await interaction.editReply({
					content: 'Test error triggered successfully. Check the error notification channel for details.',
					ephemeral: true,
				});
			} else {
				await interaction.editReply({
					content: 'An unexpected error occurred while processing the /testerror command.',
					ephemeral: true,
				});
			}
		} else {
			await interaction.reply({
				content: 'Sorry, something went wrong! Our team has been notified and will look into the issue.',
				ephemeral: true,
			});
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
		const userId = originalMessage.author.id;
		const errorMessages = config.messages.handleModelResponseError;

		let errorMessage;
		if (error.status && errorMessages[error.status]) {
			errorMessage = errorMessages[error.status].replace('{userId}', userId);
		} else {
			errorMessage = errorMessages.default.replace('{userId}', userId);
		}

		await botMessage.edit(errorMessage);

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
			const currentTime = Date.now();
			const { window, maxNotifications, recentNotifications } = this.errorNotificationThrottle;

			// Remove old notification timestamps outside the current window
			this.errorNotificationThrottle.recentNotifications = recentNotifications.filter((timestamp) => currentTime - timestamp <= window);

			if (recentNotifications.length >= maxNotifications) {
				console.warn('Error notification throttled due to high volume.');
				return;
			}

			const webhookClient = new WebhookClient({ url: webhookUrl });
			const errorMessage = `An error occurred:\n\`\`\`json\n${JSON.stringify(errorDetails, null, 2)}\n\`\`\``;
			try {
				await webhookClient.send({
					content: errorMessage,
					username: 'Error Notification',
				});
				console.log('Error notification sent via Discord webhook.');
				this.errorNotificationThrottle.recentNotifications.push(currentTime);
			} catch (err) {
				console.error('Failed to send error notification via Discord webhook:', err);
			}
		} else {
			console.warn('ERROR_NOTIFICATION_WEBHOOK not set. Skipping error notification via Discord webhook.');
		}
	}
}

module.exports.ErrorHandler = ErrorHandler;
