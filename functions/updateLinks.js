
const axios = require('axios');
require('dotenv').config();
const { UPDATE_LINK, SEARCH_LINK } = require('./utils/linkQueries.js');
const sendQuery = require('./utils/sendQuery');
const formattedResponse = require('./utils/formattedResponse');

exports.handler = async (event) => {
    if (event.httpMethod !== 'PUT') {
        return formattedResponse(405, { err: 'Method not supported' });
    }
    const { id, reps, opponent_me } = JSON.parse(event.body);
    try {
        
        if (reps == "-1,-1"){
            const variables_1 = { id };
            const res_1 = await sendQuery(
                SEARCH_LINK,
                variables_1
            );
            
            // check which index the requester has in our database
            console.log(101)
            console.log(reps)
            console.log(res_1.findLinkByID.opponentsreps.indexOf("-1"))
            if (res_1.findLinkByID.opponentsreps.indexOf("-1") == -1) { // check if somebody already reset the game before the current user wants to reset
            //if (true) { // check if somebody already reset the game before the current user wants to reset
                let opponents = res_1.findLinkByID.opponents.split(",").map(s => s.trim())
                let opponents_index_me = opponents.indexOf(opponent_me.trim())
                let opponentsreps_old = res_1.findLinkByID.opponentsreps
                opponentsreps_old = opponentsreps_old.split(",")
                opponentsreps_old[opponents_index_me] = reps
                opponentsreps_new = opponentsreps_old[0]+","+opponentsreps_old[1]
                console.log(101)
                console.log(opponentsreps_new)

                const opponentsreps = opponentsreps_new
                const variables = { id, opponentsreps };
                const res = await sendQuery(
                    UPDATE_LINK,
                    variables
                );
            }
        }else{
            const variables_1 = { id };
            const res_1 = await sendQuery(
                SEARCH_LINK,
                variables_1
            );

            // check which index the requester has in our database
            console.log(reps)
            let opponents = res_1.findLinkByID.opponents.split(",").map(s => s.trim())
            let opponents_index_me = opponents.indexOf(opponent_me.trim())
            let opponentsreps_old = res_1.findLinkByID.opponentsreps
            console.log("TEST")
            console.log(opponentsreps_old)
            opponentsreps_old = opponentsreps_old.split(",").map(s => s.trim())
            console.log(opponentsreps_old)
            opponentsreps_old[opponents_index_me] = reps
            console.log(opponentsreps_old)
            opponentsreps_new = opponentsreps_old[0]+","+opponentsreps_old[1]
            console.log(opponentsreps_new)
            console.log(100)

            // opponentsreps_new = "-1,-1"

            const opponentsreps = opponentsreps_new
            const variables = { id, opponentsreps };
            const res = await sendQuery(
                UPDATE_LINK,
                variables)
        }

        

        


        

        return formattedResponse(200, "Done");
    } catch (err) {
        console.error(err);
        return formattedResponse(500, { err: 'Something went wrong' });
    }
};