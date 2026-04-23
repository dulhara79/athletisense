/**
 * src/services/chatService.js
 * ─────────────────────────────────────────────────────────────
 * Service for persisting AI chatbot conversations in Firebase.
 */

"use strict";

const { db } = require("../config/firebase");
const logger = require("../config/logger");

/**
 * Saves a chat message to Firebase.
 * @param {string} userId - The unique identifier for the user.
 * @param {object} message - { role: 'user'|'assistant', content: string }
 * @returns {Promise<void>}
 */
async function saveChatMessage(userId, message) {
  if (!userId) return;
  try {
    const timestamp = new Date().toISOString();
    const chatRef = db.ref(`chats/${userId}/messages`);
    await chatRef.push({
      ...message,
      timestamp,
    });
  } catch (err) {
    logger.error("[chatService] saveChatMessage error:", {
      message: err.message,
      userId,
    });
  }
}

/**
 * Retrieves the chat history for a user.
 * @param {string} userId - The unique identifier for the user.
 * @param {number} limit - Maximum number of messages to retrieve.
 * @returns {Promise<object[]>}
 */
async function getChatHistory(userId, limit = 50) {
  if (!userId) return [];
  try {
    const snap = await db
      .ref(`chats/${userId}/messages`)
      .limitToLast(limit)
      .once("value");

    if (!snap.exists()) return [];

    return Object.values(snap.val()).sort(
      (a, b) => new Date(a.timestamp) - new Date(b.timestamp)
    );
  } catch (err) {
    logger.error("[chatService] getChatHistory error:", {
      message: err.message,
      userId,
    });
    return [];
  }
}

/**
 * Clears the chat history for a user.
 * @param {string} userId - The unique identifier for the user.
 * @returns {Promise<void>}
 */
async function clearChatHistory(userId) {
  if (!userId) return;
  try {
    await db.ref(`chats/${userId}/messages`).remove();
    logger.info(`[chatService] Chat history cleared for user: ${userId}`);
  } catch (err) {
    logger.error("[chatService] clearChatHistory error:", {
      message: err.message,
      userId,
    });
  }
}

module.exports = {
  saveChatMessage,
  getChatHistory,
  clearChatHistory,
};
