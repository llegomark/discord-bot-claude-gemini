class ErrorHandler {
    async handleError(error, message) {
      console.error('Error processing the message:', error);
      await message.reply('Sorry, something went wrong!');
      // Log error details for debugging
    }
  
    handleUnhandledRejection(error) {
      console.error('Unhandled Rejection:', error);
      // Log error details for debugging
    }
  
    handleUncaughtException(error) {
      console.error('Uncaught Exception:', error);
      // Log error details for debugging
      process.exit(1);
    }
  }
  
  module.exports.ErrorHandler = ErrorHandler;