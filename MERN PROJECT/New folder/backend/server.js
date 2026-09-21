const app = require('./src/app');
const { env } = require('./src/config/env');
const { logger } = require('./src/utils/logger');

app.listen(env.PORT, () => {
  logger.info(`JobTrack backend listening on port ${env.PORT}`);
});
