const axios = require('axios');
require('dotenv').config();
const webpush = require("web-push");

const { SEARCH_LINK } = require('./utils/linkQueries.js');
const sendQuery = require('./utils/sendQuery');
const formattedResponse = require('./utils/formattedResponse');

const publicVapidKey =
  "BFOOfkKMIYUQBlNJ0iw84a3_RA9zzpXomJTEN_H7tBFQjhtql6WoNmEPgVZQvs0eqp6JekQdbG3k-CXzJXdVQZc";
const privateVapidKey = "04_UKVCdWgrU8RxwAsyDp3y7zEr_RGlEWBp_Bn0kY04";

webpush.setVapidDetails(
  "mailto:test@test.com",
  publicVapidKey,
  privateVapidKey
);



exports.handler = async (event) => {
    if (event.httpMethod !== 'POST') {
        return formattedResponse(405, { err: 'Method not supported' });
    }

    console.log("Got request")

    const { id, opponent_me} = JSON.parse(event.body);
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
      let opponentspushSubscriptions = JSON.stringify(res_1.findLinkByID.opponentspushSubscriptions)

      let opponentsreps = String(res_1.findLinkByID.opponentsreps).split(",").map(s => s.trim())
      let challengetype = String(res_1.findLinkByID.challengetype)
      if (challengetype == "pullup"){
        challengetype = "Pullups"
      }
      let challengereps = String(res_1.findLinkByID.challengereps)

      
      if (opponentspushSubscriptions != null){
        opponentspushSubscriptions = opponentspushSubscriptions.split("PULLUPDIVIDER")
        if (opponentspushSubscriptions.length>1){
          if (opponents_index_me == 0){
            opponentspushSubscriptions = opponentspushSubscriptions[1]
          } else if(opponents_index_me == 1){
            opponentspushSubscriptions = opponentspushSubscriptions[0]
          }
          // the subscription is weirdly formatted in graphql, so I hack something here to fix it
          opponentspushSubscriptions = opponentspushSubscriptions.replace(/\\/g, ''); // replace "\" with ""
          opponentspushSubscriptions = opponentspushSubscriptions.substring(0, opponentspushSubscriptions.length - 1); // cut last """
          opponentspushSubscriptions = JSON.parse(opponentspushSubscriptions)
        
          let text = opponent_me + " did " + opponentsreps[opponents_index_me]+"/"+challengereps+" "+ challengetype
          let url = "https://thirsty-brattain-52b1a8.netlify.app/camera.html?id="+id

          webpush
          .sendNotification(
            opponentspushSubscriptions,
            JSON.stringify({
              title: text,
              url: url,
              icon: "/images/user_1.png"
            })
          )
        }
      }
      
      return formattedResponse(200, { message: 'Everbody notified' })

    } catch (err) {
      console.error(err);
      return formattedResponse(500, { err: 'Something went wrong' });
    }

    
  
};  


