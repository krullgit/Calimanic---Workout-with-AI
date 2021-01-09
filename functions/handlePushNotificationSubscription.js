const axios = require('axios');
require('dotenv').config();


const { SEARCH_LINK, UPDATE_opponentspushSubscriptions } = require('./utils/linkQueries.js');
const sendQuery = require('./utils/sendQuery');
const formattedResponse = require('./utils/formattedResponse');


exports.handler = async (event) => {
    if (event.httpMethod !== 'POST') {
        return formattedResponse(405, { err: 'Method not supported' });
    }
    const { id, subscrition, opponent_me} = JSON.parse(event.body);

    opponentspushSubscriptions = JSON.stringify(subscrition)
    
    // get current pushSubscriptions objects from the database
    const variables = { id };
    try {

        // get old subscriptions
        const res_1 = await sendQuery(
            SEARCH_LINK,
            variables
        );
        
        // check which index the requester has in our database
        let opponents = res_1.findLinkByID.opponents.split(",").map(s => s.trim())
        let opponents_index_me = opponents.indexOf(opponent_me.trim())
        let opponentspushSubscriptions_old = JSON.stringify(res_1.findLinkByID.opponentspushSubscriptions)
        console.log(opponents)
        console.log(opponent_me)
        console.log(opponents_index_me)
        console.log(opponentspushSubscriptions_old)
        
        // create new sub object
        var opponentspushSubscriptions_new;
        
        // if old sub object is empty so far create a complete new one for both opponents
        if (opponentspushSubscriptions_old == null || opponentspushSubscriptions_old.split("PULLUPDIVIDER").length == 1 ){
          opponentspushSubscriptions_new = [null,null];
          opponentspushSubscriptions_new[opponents_index_me] = opponentspushSubscriptions

          
          opponentspushSubscriptions_new = opponentspushSubscriptions_new[0]+"PULLUPDIVIDER"+opponentspushSubscriptions_new[0]
          
        // if there was a sub object already just update the requested one
        }else{
          console.log(0)
          console.log(opponentspushSubscriptions)
          console.log(0.5)
          console.log(opponentspushSubscriptions_old)
          opponentspushSubscriptions_old = opponentspushSubscriptions_old.split("PULLUPDIVIDER")
          console.log(0.6)
          console.log(opponentspushSubscriptions_old)
          opponentspushSubscriptions_old[opponents_index_me] = opponentspushSubscriptions
          console.log(1)
          console.log(opponentspushSubscriptions_old)

          // the subscription is weirdly formatted in graphql, so I hack something here to fix it
          opponentspushSubscriptions_old = opponentspushSubscriptions_old.map(s => s.replace(/\\/g, '')); // replace "\" with ""
          for (var i = 0; i < opponentspushSubscriptions_old.length; i++) {
              while(opponentspushSubscriptions_old[i][0] == '"'){
                opponentspushSubscriptions_old[i] = opponentspushSubscriptions_old[i].substring(1, opponentspushSubscriptions_old[i].length);
              }
              //Do something
          }
          console.log(2)
          console.log(opponentspushSubscriptions_old)
          
          opponentspushSubscriptions_new = opponentspushSubscriptions_old[0]+"PULLUPDIVIDER"+opponentspushSubscriptions_old[0]
          console.log(3)
          console.log(opponentspushSubscriptions_new)
        }
        opponentspushSubscriptions = opponentspushSubscriptions_new
        console.log(4)
          console.log(opponentspushSubscriptions)

        // update the sub object in th database
        const variables_update = { id, opponentspushSubscriptions};
        const res_2 = await sendQuery(
          UPDATE_opponentspushSubscriptions,
          variables_update
        );

        console.log(5)
          console.log(opponentspushSubscriptions)

        return formattedResponse(200, { message: 'Sub created' })

        // const res_3 = await sendQuery(
        // const res_3 = await sendQuery(
        //   SEARCH_LINK,
        //   variables
        // );
        // console.log(res_3)
        // console.log(JSON.parse(res_3.findLinkByID.opponentspushSubscriptions.split("PULLUPDIVIDER")[0]))

    } catch (err) {
        console.error(err);
        return formattedResponse(500, { err: 'Something went wrong' });
    }

    
    
    // try {
    //   return formattedResponse(200, { id: susbscriptionId });
    // } catch (err) {
    //     console.error(err);
    //     return formattedResponse(500, { err: 'Something went wrong' });
    // }
};  


