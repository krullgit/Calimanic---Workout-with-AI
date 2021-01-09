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

      console.log(opponentspushSubscriptions)
      if (opponentspushSubscriptions != null){
        opponentspushSubscriptions = opponentspushSubscriptions.split("PULLUPDIVIDER")
        if (opponentspushSubscriptions.length>1){
          console.log(1)
          console.log(opponentspushSubscriptions)
          if (opponents_index_me == 0){
            console.log(2)
            console.log(opponentspushSubscriptions)
            opponentspushSubscriptions = opponentspushSubscriptions[1]
          } else if(opponents_index_me == 1){
            console.log(3)
            console.log(opponentspushSubscriptions)
            opponentspushSubscriptions = opponentspushSubscriptions[0]
          }
          console.log(4)
          console.log(opponentspushSubscriptions)
          // the subscription is weirdly formatted in graphql, so I hack something here to fix it
          opponentspushSubscriptions = opponentspushSubscriptions.replace(/\\/g, ''); // replace "\" with ""
          console.log(5)
          console.log(opponentspushSubscriptions)
          

          console.log("aaaa")
          console.log(opponentspushSubscriptions)
          console.log(opponentspushSubscriptions[0])
          while(opponentspushSubscriptions[0]=== '"'){
            console.log(opponentspushSubscriptions)
            //console.log(opponentspushSubscriptions[i])
            opponentspushSubscriptions = opponentspushSubscriptions.substring(1, opponentspushSubscriptions.length);
            //console.log("b")
          }
          //Do something
          
          console.log(6)
          console.log(opponentspushSubscriptions)
          opponentspushSubscriptions = JSON.parse(opponentspushSubscriptions)
          console.log(7)
          console.log(opponentspushSubscriptions)
        
          let text = opponent_me + " did " + opponentsreps[opponents_index_me]+"/"+challengereps+" "+ challengetype
          let url = "https://thirsty-brattain-52b1a8.netlify.app/camera.html?id="+id

          console.log(8)
          console.log(opponentspushSubscriptions)

          webpush
          .sendNotification(
            opponentspushSubscriptions,
            JSON.stringify({
              title: text,
              url: url,
              icon: "/images/user_1.png"
            })
          )
          console.log(9)
          console.log(opponentspushSubscriptions)
        }
      }
      
      return formattedResponse(200, { message: 'Everbody notified' })

    } catch (err) {
      console.error(err);
      return formattedResponse(500, { err: 'Something went wrong' });
    }

    
  
};  


