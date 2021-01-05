
const axios = require('axios');
require('dotenv').config();
const { UPDATE_LINK } = require('./utils/linkQueries.js');
const sendQuery = require('./utils/sendQuery');
const formattedResponse = require('./utils/formattedResponse');
exports.handler = async (event) => {
    if (event.httpMethod !== 'PUT') {
        return formattedResponse(405, { err: 'Method not supported' });
    }
    const { url, identifier, opponents, opponentsreps, challengetype, challengereps, _id: id } = JSON.parse(
        event.body
    );
    const variables = { url, identifier, opponents, opponentsreps, challengetype, challengereps, id };
    try {
        const { updateLink: updatedLink } = await sendQuery(
            UPDATE_LINK,
            variables
        );

        return formattedResponse(200, updatedLink);
    } catch (err) {
        console.error(err);
        return formattedResponse(500, { err: 'Something went wrong' });
    }
};