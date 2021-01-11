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

    const { id, opponent_me, mode} = JSON.parse(event.body);
    console.log("11")
    console.log(mode)
    const variables = { id };
    

    try {

    

      // get old subscriptions
      const res_1 = await sendQuery(
          SEARCH_LINK,
          variables
      );
      // check which index the requester has in our database
      let opponents = res_1.findLinkByID.opponents.split(",").map(s => s.trim())
      // console.log(opponents)
      // console.log(opponent_me)
      let opponents_index_me = opponents.indexOf(opponent_me.trim())
      // console.log(opponents_index_me)
      let opponentspushSubscriptions = JSON.stringify(res_1.findLinkByID.opponentspushSubscriptions)

      let opponentsreps = String(res_1.findLinkByID.opponentsreps).split(",").map(s => s.trim())
      // console.log(opponentspushSubscriptions)
      let challengetype = String(res_1.findLinkByID.challengetype)
      if (challengetype == "pullup"){
        challengetype = "Pullups"
      }
      let challengereps = String(res_1.findLinkByID.challengereps)
      

      if (opponentspushSubscriptions != null){
        opponentspushSubscriptions = opponentspushSubscriptions.split("PULLUPDIVIDER")
        if (opponentspushSubscriptions.length>1){

          let title;
          let text;
          let url;


            // console.log(1)
            // console.log(opponentspushSubscriptions)
            if (opponents_index_me == 0){
              // console.log(2)
              // console.log(opponentspushSubscriptions)
              opponentspushSubscriptions = opponentspushSubscriptions[1]
            } else if(opponents_index_me == 1){
              // console.log(3)
              // console.log(opponentspushSubscriptions)
              opponentspushSubscriptions = opponentspushSubscriptions[0]
            }

            // console.log(4)
            // console.log(opponentspushSubscriptions)
            // the subscription is weirdly formatted in graphql, so I hack something here to fix it
            opponentspushSubscriptions = opponentspushSubscriptions.replace(/\\/g, ''); // replace "\" with ""
            // console.log(5)
            // console.log(opponentspushSubscriptions)
            

            // console.log("aaaa")
            // console.log(opponentspushSubscriptions)
            // console.log(opponentspushSubscriptions[0])
            while(opponentspushSubscriptions[0]=== '"'){
              console.log(opponentspushSubscriptions)
              //console.log(opponentspushSubscriptions[i])
              opponentspushSubscriptions = opponentspushSubscriptions.substring(1, opponentspushSubscriptions.length);
              //console.log("b")
            }
            while(opponentspushSubscriptions[opponentspushSubscriptions.length-1] === '"'){
              console.log(opponentspushSubscriptions)
              //console.log(opponentspushSubscriptions[i])
              opponentspushSubscriptions = opponentspushSubscriptions.substring(0, opponentspushSubscriptions.length-1);
              //console.log("b")
            }
            //Do something
            
            // console.log(6)
            // console.log(opponentspushSubscriptions)
            opponentspushSubscriptions = JSON.parse(opponentspushSubscriptions)
            // console.log(7)
            // console.log(opponentspushSubscriptions)

            var currentdate = new Date(); 
            var datetime =  currentdate.getHours() + ":"  
                              + currentdate.getMinutes() + ":"
            if(mode == "reset"){
              title = datetime + " " +opponent_me + " reopened the challenge."

              text = "Last result: ["+opponents[0]+", "+opponents[1]+"], ["+opponentsreps[0]+", "+opponentsreps[1]+"]";
              
            }else{
              
              title = datetime + " " + opponent_me + " did " + opponentsreps[opponents_index_me]+"/"+challengereps+" "+ challengetype
              text = ""
            }

            console.log("11")
            console.log(title)
            console.log(text)

            url = "https://thirsty-brattain-52b1a8.netlify.app/camera.html?id="+id
            let test = await webpush
            .sendNotification(
              opponentspushSubscriptions,
              JSON.stringify({
                title: title,
                url: url,
                text: text
                // icon: "/images/user_1.png",
                // badge: "/images/user_1.png"
              })).then((message) => {
              // console.log(9)
              // console.log(message)
              // console.log(opponentspushSubscriptions)
              // console.log(10)
            })

        }
        // console.log(12)
      }
      // console.log(13)
      // console.log(text)
      
      return formattedResponse(200, { message: "done" })
      //return formattedResponse(202, { stat: 'Something went wrongggs' });
      

    } catch (err) {
      console.log(14)
      console.error(err);
      return formattedResponse(500, { err: 'Something went wrongg' });
    }

    
  
};  


