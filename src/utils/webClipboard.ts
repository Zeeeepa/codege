/**
 * Web-compatible clipboard utilities that match Raycast's Clipboard API
 */

export interface ClipboardContent {
  text?: string;
  html?: string;
}

class WebClipboard {
  /**
   * Copy text to clipboard
   */
  async copy(content: string | ClipboardContent): Promise<void> {
    try {
      if (typeof content === 'string') {
        await navigator.clipboard.writeText(content);
      } else {
        // For more complex content, use the Clipboard API
        const clipboardItems: ClipboardItem[] = [];
        const data: Record<string, Blob> = {};

        if (content.text) {
          data['text/plain'] = new Blob([content.text], { type: 'text/plain' });
        }

        if (content.html) {
          data['text/html'] = new Blob([content.html], { type: 'text/html' });
        }

        if (Object.keys(data).length > 0) {
          clipboardItems.push(new ClipboardItem(data));
          await navigator.clipboard.write(clipboardItems);
        }
      }
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
      
      // Fallback for older browsers
      this.fallbackCopy(typeof content === 'string' ? content : content.text || '');
      throw error;
    }
  }

  /**
   * Read text from clipboard
   */
  async readText(): Promise<string> {
    try {
      return await navigator.clipboard.readText();
    } catch (error) {
      console.error('Failed to read from clipboard:', error);
      throw error;
    }
  }

  /**
   * Check if clipboard API is available
   */
  isAvailable(): boolean {
    return !!(navigator.clipboard && navigator.clipboard.writeText);
  }

  /**
   * Fallback copy method for older browsers
   */
  private fallbackCopy(text: string): void {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    
    try {
      document.execCommand('copy');
    } catch (error) {
      console.error('Fallback copy failed:', error);
    } finally {
      document.body.removeChild(textArea);
    }
  }

  /**
   * Copy with user feedback
   */
  async copyWithFeedback(content: string | ClipboardContent, successMessage = 'Copied to clipboard'): Promise<void> {
    try {
      await this.copy(content);
      
      // Show success feedback
      const event = new CustomEvent('show-toast', {
        detail: {
          title: successMessage,
          style: 'success',
          duration: 2000,
        }
      });
      window.dispatchEvent(event);
    } catch (error) {
      // Show error feedback
      const event = new CustomEvent('show-toast', {
        detail: {
          title: 'Failed to copy to clipboard',
          message: error instanceof Error ? error.message : 'Unknown error',
          style: 'failure',
          duration: 3000,
        }
      });
      window.dispatchEvent(event);
      throw error;
    }
  }

  /**
   * Paste from clipboard (requires user interaction)
   */
  async paste(): Promise<string> {
    try {
      return await this.readText();
    } catch (error) {
      console.error('Failed to paste from clipboard:', error);
      throw error;
    }
  }
}

// Create singleton instance
const webClipboard = new WebClipboard();

// Export as Clipboard to match Raycast API
export const Clipboard = {
  copy: webClipboard.copy.bind(webClipboard),
  readText: webClipboard.readText.bind(webClipboard),
  paste: webClipboard.paste.bind(webClipboard),
};

// Export utility functions
export const {
  copy,
  readText,
  isAvailable,
  copyWithFeedback,
  paste,
} = webClipboard;

export default webClipboard;

