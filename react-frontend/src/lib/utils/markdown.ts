import { marked } from 'marked';
import TurndownService from 'turndown';
import { gfm } from '@joplin/turndown-plugin-gfm';

// Configure marked for GFM with task lists
marked.use({
  breaks: true,
  gfm: true,
  renderer: {
    list(body, ordered, start) {
      const isTaskList = body.includes('data-checked=');

      if (isTaskList) {
        return `<ul data-type="taskList">${body}</ul>`;
      }

      const type = ordered ? 'ol' : 'ul';
      const startatt = ordered && start !== 1 ? ` start="${start}"` : '';
      return `<${type}${startatt}>${body}</${type}>`;
    },

    listitem(text, task, checked) {
      if (task) {
        const checkedAttr = checked ? 'true' : 'false';
        return `<li data-type="taskItem" data-checked="${checkedAttr}">${text}</li>`;
      }
      return `<li>${text}</li>`;
    }
  }
});

// Configure turndown service for HTML to Markdown conversion
const turndownService = new TurndownService({
  codeBlockStyle: 'fenced',
  headingStyle: 'atx'
});

turndownService.escape = (string) => string;

// Use turndown-plugin-gfm for proper GFM table support
turndownService.use(gfm);

// Add custom table header rule
turndownService.addRule('tableHeaders', {
  filter: 'th',
  replacement: function (content) {
    return content;
  }
});

// Add custom table rule to handle headers properly
turndownService.addRule('tables', {
  filter: 'table',
  replacement: function (content, node) {
    const element = node as HTMLElement;
    // Extract rows
    const rows = Array.from(element.querySelectorAll('tr'));
    if (rows.length === 0) return content;

    let markdown = '\n';

    rows.forEach((row, rowIndex) => {
      const cells = Array.from(row.querySelectorAll('th, td'));
      const cellContents = cells.map((cell) => {
        // Get the text content and clean it up
        let cellContent = turndownService.turndown(cell.innerHTML).trim();
        // Remove extra paragraph tags that might be added
        cellContent = cellContent.replace(/^\n+|\n+$/g, '');
        return cellContent;
      });

      // Add the row
      markdown += '| ' + cellContents.join(' | ') + ' |\n';

      // Add separator after first row (which should be headers)
      if (rowIndex === 0) {
        const separator = cells.map(() => '---').join(' | ');
        markdown += '| ' + separator + ' |\n';
      }
    });

    return markdown + '\n';
  }
});

// Add task list items rule
turndownService.addRule('taskListItems', {
  filter: (node) =>
    node.nodeName === 'LI' &&
    (node.getAttribute('data-checked') === 'true' ||
      node.getAttribute('data-checked') === 'false'),
  replacement: function (content, node) {
    const checked = node.getAttribute('data-checked') === 'true';
    content = content.replace(/^\s+/, '');
    return `- [${checked ? 'x' : ' '}] ${content}\n`;
  }
});

// Convert TipTap mention spans -> <@id>
turndownService.addRule('mentions', {
  filter: (node) => node.nodeName === 'SPAN' && node.getAttribute('data-type') === 'mention',
  replacement: (_content, node) => {
    const element = node as HTMLElement;
    const id = element.getAttribute('data-id') || '';
    // TipTap stores the trigger char in data-mention-suggestion-char (usually "@")
    const ch = element.getAttribute('data-mention-suggestion-char') || '@';
    // Emit <@id> style, e.g. <@llama3.2:latest>
    return `<${ch}${id}>`;
  }
});

export { marked, turndownService };

