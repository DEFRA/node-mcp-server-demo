/**
 * Generates a content message object for MCP tools.
 *
 * @param {string} issue_description - A description of the issue or message to display.
 * @param {string} [textInput=''] - Optional additional text to append to the message.
 * @returns {Promise<Array<{type: string, text: string}>>} A promise that resolves to an array containing the content message object.
 */
async function showContentMsg (issueDescription, textInput = '') {
  const content = [{
    type: 'text',
    text: `${issueDescription} ${textInput}`
  }]
  return content
}

export { showContentMsg }
