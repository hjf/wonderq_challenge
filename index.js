'use strict'
/** HTTP API for WonderQ
 * @module WonderqAPI
 * @requires express
 */
const wonderq = require('./wonderq')
const winston = require('winston')

const LOGGING_LEVEL = process.env.LOGGING_LEVEL || 'info'

const logger = winston.createLogger({
  level: LOGGING_LEVEL,
  format: winston.format.json(),
  defaultMeta: { service: 'http-api' },
  transports: [
    new winston.transports.Console({
      format: winston.format.simple()
    })]
})
/**
 * express module
 * @const
 */
const express = require('express')
const app = express()
const port = 3000

// we use JSON to pass data around
app.use(express.json())

/**
 * Gets an element from the queue
 * @name get/dequeue
 * @function
 * @memberof module:WonderqAPI
 * @inner
 * @return {http} JSON object containing the element ID, and the payload. HTTP 204 if the queue is empty.
 */
app.get('/dequeue', async (req, res) => {
  const element = wonderq.dequeue()
  if (element == null) {
    res.status(204).send()
    return
  }
  res.json(element)
})

/**
 * Puts an element from the queue
 * @name get/enqueue
 * @function
 * @memberof module:WonderqAPI
 * @inner
 * @param {json} all The JSON payload to insert.
 * @return {http} JSON object containing the element ID.
 */
app.post('/enqueue', async (req, res) => {
  const elementId = wonderq.enqueue(req.body)
  res.json({ element_id: elementId })
})

/**
 * Notifies the queue that the consumer has finished processing a previously requested message
 * @name get/notifyDone
 * @function
 * @memberof module:WonderqAPI
 * @inner
 * @param {string} element_id The ID of the element that was processed.
 * @return {http} HTTP 204 if the request was successful, or HTTP 404 if the element wasn't found in the queue.
 */
app.get('/notifyDone', async (req, res) => {
  const elementId = req.query.element_id
  if (elementId === undefined) {
    res.status(400).send('Bad request.')
    return
  }

  if (wonderq.notifyDone(elementId)) {
    res.status(204).send()
  } else {
    res.status(404).send('No such element in the queue.')
  }
})

app.listen(port, () => {
  logger.info(`WonderQ HTTP API Listening at http://localhost:${port}`)
})
