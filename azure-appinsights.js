const appInsights = require('applicationinsights');
const fs = require('fs');
require('dotenv').config();

const packageData = JSON.parse(fs.readFileSync('./package.json'));
if (process.env.APPINSIGHTS_INSTRUMENTATIONKEY) {
  appInsights
    .setup(process.env.APPINSIGHTS_INSTRUMENTATIONKEY)
    .setAutoCollectExceptions(false) // logger handles these
    .start();
  appInsights.defaultClient.context.tags['ai.cloud.role'] = `${packageData.name}`;
  module.exports = appInsights;
} else {
  module.exports = null;
}
