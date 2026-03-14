export const logErrorToServer = async (error: Error | string | unknown, context?: string) => {
  try {
    let message = "Unknown error";
    let stack = "";

    if (error instanceof Error) {
      message = error.message;
      stack = error.stack || "";
    } else if (typeof error === "string") {
      message = error;
    } else {
      try {
        message = JSON.stringify(error);
      } catch (e) {
        message = "Error object could not be stringified: " + String(error);
      }
    }

    await fetch('/api/logs/error', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message,
        stack,
        context: context || 'General',
        url: window.location.href,
        userAgent: navigator.userAgent
      })
    });
  } catch (e) {
    console.error('Failed to send error log to server', e);
  }
};
