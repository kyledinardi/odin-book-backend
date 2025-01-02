/* eslint-disable no-console */
require('dotenv').config();
require('./helpers/passport');
const express = require('express');
const cors = require('cors');
const http = require('http');
const { setupSocketIo } = require('./helpers/socketIo');
const indexRouter = require('./routes/index');

const app = express();
const server = http.createServer(app);
const PORT = 3000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use('/', indexRouter);
setupSocketIo(server);

app.use((req, res, next) => {
  const err = new Error('Page not found');
  err.status = 404;
  next(err);
});

app.use((err, req, res, next) => {
  res.status(err.status || 500);

  const response = {
    error: {
      message: err.message,
      status: err.status || 500,
      stack: err.stack,
    },
  };

  console.error(response);
  return res.json(response);
});

server.listen(PORT, () =>
  console.log(`Odin Book - listening on port ${PORT}!`),
);
