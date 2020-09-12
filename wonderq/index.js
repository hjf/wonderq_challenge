'use strict'

const { v4: uuidv4 } = require('uuid');

// The default message timeout
const MESSAGE_TIMEOUT = 10000;

// Our queue, actually only holds "pointers" to the actual data
var queue = [];

// The "hashtable" for the actual data
var queue_elements = {};

/**
 * Adds a new element to the queue, and returns its ID.
 * @param {any} payload An object to enqueue. Can be anything
 * @return {uuidv4} The ID of the generated message
 */
function enqueue(payload) {
    let element_id = uuidv4(); //We use a RFC4122 UUID as an id
    queue_elements[element_id] = payload;
    queue.push(element_id); //Add the element at the end of the array
    return element_id;
}

/**
 * Gets an element from the queue, and waits for the timeout to see if it's been processed
 * @return {any} An object with the ID of the element, and the payload. Null if the queue is empty
 */
function dequeue() {
    while (true) {
        let element_id = queue.shift(); //gets the first available element

        if (element_id === undefined) //if the queue is empty, this is undefined
            return null

        let element = queue_elements[element_id]; //we grab the element from the queue

        //a race condition happened: a client notified "done" just as the timeout finished
        if (element === undefined)
            continue; //keep looping until we find something, or the queue is full

        setTimeout(() => {
            if (queue_elements[element_id] !== undefined)
                queue.unshift(element_id) //Add the element at the head of the array, to reprocess ASAP
        }, MESSAGE_TIMEOUT);

        return {
            "element_id": element_id,
            "payload": element
        };
    }
}

/**
 * Notifies the queue that the consumer has finished processing the element
 * @param {uuidv4} element_id The ID of the element that has finished processing
 * @returns {boolean} True, if the element was successfully removed, or False, if it didn't exist.
 */
function notifyDone(element_id) {
    if (queue_elements[element_id] !== undefined) {
        delete queue_elements[element_id]
        return true
    }
    return false
}

exports.enqueue = enqueue;
exports.dequeue = dequeue;
exports.notifyDone = notifyDone;