/** This serverless function requests workout details form the database*/

const axios = require('axios');
require('dotenv').config();

const { SEARCH_LINK } = require('./utils/linkQueries.js');
const sendQuery = require('./utils/sendQuery');
const formattedResponse = require('./utils/formattedResponse');

exports.handler = async (event) => {
    if (event.httpMethod !== 'POST') {
        return formattedResponse(405, { err: 'Method not supported' });
    }
    const { id } = JSON.parse(event.body);
    const variables = { id };
    try {
        const res = await sendQuery(
            SEARCH_LINK,
            variables
        );
        //console.log(event)
        //const { opponents } = JSON.parse(event.body);
        //const res = await sendQuery(SEARCH_LINK);
        //const data = res.link;
        //console.log
        //console.log(res)
        return formattedResponse(200, res);
    } catch (err) {
        console.error(err);
        return formattedResponse(500, { err: 'Something went wrong' });
    }
};  