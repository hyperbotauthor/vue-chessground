const express = require('express')
const app = express()
const port = 3000
const path = require('path')

app.use(function(req, res, next) {    
  res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp')
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin')
  return next();
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'root.html'))
})

app.get('/stockfish.js', (req, res) => {
  res.sendFile(path.join(__dirname, 'stockfish.js'))
})

app.get('/stockfish.wasm', (req, res) => {
  res.sendFile(path.join(__dirname, 'stockfish.wasm'))
})

app.get('/stockfish.worker.js', (req, res) => {
  res.sendFile(path.join(__dirname, 'stockfish.worker.js'))
})

app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`)
})