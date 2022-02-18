yarn install
yarn build
yarn 
yarn watch

# delete global netlify folder under usr/local/lib/node_modules 
# sudo chmod -R 777 ./" first, and than just delete the folder

npm install netlify-cli@2.58.0 -g
sudo netlify init # to create the .netlify folder
sudo netlify build # to create the folder for the serverless functions inside the .netlify folder

sudo netlify dev # select yarn build # to build into the dist folder
sudo netlify dev # select yarn watch # to start the server
