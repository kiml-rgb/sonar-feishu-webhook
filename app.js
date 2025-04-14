const express = require('express');
const bodyParser = require('body-parser');
const { sendFeishuCard } = require('./feishu');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

app.use(bodyParser.json());

app.post('/webhook/sonar', async (req, res) => {
  try {
    const payload = req.body;
    await sendFeishuCard(payload);
    res.status(200).send('ok');
  } catch (err) {
    console.error('Error processing webhook:', err);
    res.status(500).send('error');
  }
});

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
