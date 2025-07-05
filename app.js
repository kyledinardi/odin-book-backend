/* eslint-disable no-console */
require('./utils/passport');
const express = require('express');
const cors = require('cors');
const compression = require('compression');
const http = require('http');
const helmet = require('helmet');
const indexRouter = require('./routes/index');
const { setupSocketIo } = require('./utils/socketIo');
const { PORT } = require('./utils/config');

const app = express();
const server = http.createServer(app);

app.use(helmet());
app.use(cors());
app.use(compression());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use('/', indexRouter);
setupSocketIo(server);

app.use((req, res, next) => {
  const err = new Error('Endpoint not found');
  err.status = 404;
  next(err);
});

app.use((err, req, res, next) => {
  const status = err.status || 500;
  res.status(status);

  const response = {
    error: {
      message: err.message,
      status,
      stack: err.stack,
    },
  };

  console.error(response);
  return res.json(response);
});

server.listen(PORT, () =>
  console.log(`Odin-Book - listening on port ${PORT}`)
);
