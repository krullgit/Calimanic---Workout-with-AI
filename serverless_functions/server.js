
/**'use strict';
const express = require('express');
const path = require('path');
const serverless = require('serverless-http');
const app = express();
const bodyParser = require('body-parser');

// # ------------------------------------------------------------------------------------------------------
// # THIS FILE IS CURRENTLY NOT USED
// # ------------------------------------------------------------------------------------------------------

app.use(express.static(path.join(__dirname, '../dist')));

const router = express.Router();
router.get('/', (req, res) => {
    res.sendFile('camera.html', { root: path.join(__dirname, '../dist') });
});

app.use(bodyParser.json());
app.use('/.netlify/functions/server', router);  // path must route to lambda

module.exports = app;
module.exports.handler = serverless(app);
*/