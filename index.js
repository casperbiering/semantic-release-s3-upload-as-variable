const verifyAction = require('./lib/verify');
const prepareAction = require('./lib/prepare');

let verified = false;

async function verifyConditions(pluginConfig, context) {
  await verifyAction(pluginConfig, context);
  verified = true;
}

async function prepare(pluginConfig, context) {
  if (!verified) {
    await verifyConditions(pluginConfig, context);
  }

  await prepareAction(pluginConfig, context);
}

module.exports = { verifyConditions, prepare };
