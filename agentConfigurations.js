// Which Tally machine serves which dealer codes. Edit this when onboarding a machine,
// then redeploy and restart the gateway.
// Keys are deliberately NOT stored here: this file is committed to git, so each
// agent's key lives in the environment variable named below.
module.exports = [
  {
    agentId: "th-ats-prd",
    apiKey: "880139a5b5a1afd00cce24e528e4dfced12f1f2cde4e9d91306e54adc82c1ba5",
    dealerCodes: ["D001"],
  },
];
