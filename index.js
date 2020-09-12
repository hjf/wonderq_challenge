'use strict'

const wonderq = require('./wonderq')
const express = require('express')
const app = express()
const port = 3000

// we use JSON to pass data around
app.use(express.json())

app.get('/dequeue', async (req, res) => {
  const element = wonderq.dequeue()
  if (element == null) {
    res.status(204).send()
    return
  }
  res.json(element)
})

app.post('/enqueue', async (req, res) => {
  const elementId = wonderq.enqueue(req.body)
  res.json({ element_id: elementId })
})

app.get('/notifyDone', async (req, res) => {
  const elementId = req.query.element_id
  if (elementId === undefined) {
    res.status(400).send('Bad request.')
  }

  if (wonderq.notifyDone(elementId)) {
    res.status(204).send()
  } else {
    res.status(404).send('No such element in the queue.')
  }
})

app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`)
})
