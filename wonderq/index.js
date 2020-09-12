'use strict'
/** WonderQ Queing Module
 * @module Wonderq
 */
const { v4: uuidv4 } = require('uuid')
const winston = require('winston')

// The message timeout. If not defined, defaults to 10 seconds
const MESSAGE_TIMEOUT = process.env.DEFAULT_MESSAGE_TIMEOUT || 10000

const LOGGING_LEVEL = process.env.LOGGING_LEVEL || 'info'

const logger = winston.createLogger({
  level: LOGGING_LEVEL,
  format: winston.format.json(),
  defaultMeta: { service: 'wonderq' },
  transports: [
    new winston.transports.Console({
      format: winston.format.simple()
    })]
})

logger.info('Initialized WonderQ queue with a timeout of ' + MESSAGE_TIMEOUT + 'ms')

// Our queue, actually only holds "pointers" to the actual data
const queue = []

// The "hashtable" for the actual data
const queueElements = {}

/**
 * Adds a new element to the queue, and returns its ID.
 * @param {any} payload An object to enqueue. Can be anything
 * @return {uuidv4} The ID of the generated message
 */
function enqueue (payload) {
  const elementId = uuidv4() // We use a RFC4122 UUID as an id
  queueElements[elementId] = payload
  queue.push(elementId) // Add the element at the end of the array
  logger.debug('Added element ' + elementId + 'to the queue')
  return elementId
}

/**
 * Gets an element from the queue, and waits for the timeout to see if it's been processed
 * @return {any} An object with the ID of the element, and the payload. Null if the queue is empty
 */
function dequeue () {
  while (true) {
    const elementId = queue.shift() // gets the first available element

    if (elementId === undefined) { // if the queue is empty, this is undefined
      logger.debug('Dequeue called, but the queue is empty')
      return null
    }

    const element = queueElements[elementId] // we grab the element from the queue

    // a race condition happened: a client notified "done" just as the timeout finished
    if (element === undefined) {
      logger.error('Something weird happened: ' + elementId + 'was in the queue but did not exist in the hashtable.')
      continue // keep looping until we find something, or the queue is full
    }

    setTimeout(() => {
      if (queueElements[elementId] !== undefined) {
        logger.info('Element ' + elementId + 'added back to the queue after ' + MESSAGE_TIMEOUT + 'ms timeout.')
        queue.unshift(elementId) // Add the element at the head of the array, to reprocess ASAP
      }
    }, MESSAGE_TIMEOUT)

    logger.debug('Element ' + elementId + 'delivered to client')
    return {
      element_id: elementId,
      payload: element
    }
  }
}

/**
 * Notifies the queue that the consumer has finished processing the element
 * @param {uuidv4} elementId The ID of the element that has finished processing
 * @returns {boolean} True, if the element was successfully removed, or False, if it didn't exist.
 */
function notifyDone (elementId) {
  if (queueElements[elementId] !== undefined) {
    delete queueElements[elementId]
    logger.debug('Element ' + elementId + 'finished processing')
    return true
  }
  logger.info('Element ' + elementId + 'was notified as Done, but it was not in the queue. Possible duplicate?')
  return false
}

exports.enqueue = enqueue
exports.dequeue = dequeue
exports.notifyDone = notifyDone
