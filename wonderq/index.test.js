'use strict'

test("Empty queue, should return null", () => {
    jest.resetModules()
    let wonderq = require('./index.js')

    expect(wonderq.dequeue()).toBe(null);
});

test("Add an element, then retrieve it, then check for null", () => {
    jest.resetModules()
    let wonderq = require('./index.js')
    let inserted_element_id = wonderq.enqueue("test");
    let dequeued = wonderq.dequeue();

    expect(dequeued.element_id).toBe(inserted_element_id);
    expect(dequeued.payload).toBe("test");
    expect(wonderq.dequeue()).toBe(null);
});

test("Add 3 elements and check they come out in the expected order", () => {
    jest.resetModules()
    let wonderq = require('./index.js')
    wonderq.enqueue(1);
    wonderq.enqueue(2);
    wonderq.enqueue(3);

    expect(wonderq.dequeue().payload).toBe(1);
    expect(wonderq.dequeue().payload).toBe(2);
    expect(wonderq.dequeue().payload).toBe(3);
});

test("Add an element, dequeue it, and check if it's added back to the queue after the queue timeout", () => {
    jest.resetModules()
    let wonderq = require('./index.js')
    jest.useFakeTimers();
    wonderq.enqueue(1);
    wonderq.enqueue(2);
    wonderq.dequeue();
    jest.runAllTimers();
    expect(wonderq.dequeue().payload).toBe(1);
});

test("Add an element, dequeue it, mark it as done, and see if the queue is empty after the timeout", () => {
    jest.resetModules()
    let wonderq = require('./index.js')
    jest.useFakeTimers();
    wonderq.enqueue(1);
    let element = wonderq.dequeue();
    wonderq.notifyDone(element.element_id)
    jest.runAllTimers();
    expect(wonderq.dequeue()).toBe(null);
});