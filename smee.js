const SmeeClient = require('smee-client')

const smee = new SmeeClient({
  source: process.env.SMEE_URL,
  target: 'http://localhost:8888/.netlify/functions/webhook',
  logger: console
});

const keypress = async () => {
  process.stdin.setRawMode(true)
  return new Promise(resolve => process.stdin.once('data', () => {
    process.stdin.setRawMode(false)
    resolve()
  }))
}

(async () => {
    const webhook = smee.start();
    console.log('Press any key to exit');
    await keypress()
})().then(process.exit);
