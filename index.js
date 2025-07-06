/* eslint-disable no-console */
const server = require('./app');
const { PORT } = require('./utils/config');

server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
