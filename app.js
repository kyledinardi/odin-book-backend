require('dotenv').config();
require('./passport');
const express = require('express');
const indexRouter = require('./routes/index');

const app = express();
const PORT = 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use('/', indexRouter);

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
  res.json(response);
});

app.listen(PORT, () => console.log(`Odin Book - listening on port ${PORT}!`));
