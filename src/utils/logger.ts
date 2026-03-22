export const logErrorToServer = async (error: Error | string | unknown, context?: string, arabicDescription?: string) => {
  try {
    let message = "Unknown error";
    let stack = "";

    if (error && typeof error === 'object') {
      const errName = (error as any).name;
      const errMsg = (error as any).message;
      if (errName === 'AbortError' || errName === 'TimeoutError' || (typeof errMsg === 'string' && errMsg.includes('signal timed out'))) {
        return; // Ignore network timeout errors to prevent log spam
      }
      if (error instanceof TypeError && errMsg === 'Failed to fetch') {
        return; // Ignore network connection errors to prevent log spam
      }
    }

    if (error instanceof Error) {
      message = error.message;
      stack = error.stack || "";
    } else if (typeof error === "string") {
      if (error.includes('AbortError') || error.includes('TimeoutError') || error.includes('signal timed out')) {
        return;
      }
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
        message: arabicDescription || message,
        stack,
        context: context || 'General',
        url: window.location.href,
        userAgent: navigator.userAgent
      })
    });
  } catch (e) {
    if (e instanceof TypeError && e.message === 'Failed to fetch') {
      // Silently ignore fetch errors for the logger to avoid console spam when offline
    } else {
      console.error('Failed to send error log to server', e);
    }
  }
};
