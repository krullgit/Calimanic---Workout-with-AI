
<p align="center"> 
  <img src="images_readme/guy_40.png" alt="Pacman Logo" width="200px" height="200px">
</p>

<h1 align="center"> CALIMANICS </h1>

<table>
<tr>
<td>
  This is a workout app for athletes who want to motivate each other. You can create a new workout plan and send it so a friend, so that you both have to do a certain amount of repetitions. It uses the neural network <a href="https://github.com/tensorflow/tfjs-models/tree/master/pose-detection"> posenet </a> to superwise the workout, so that nobody can cheat and the reps are counted properly. The app is built with the <a href="https://jamstack.wtf/"> Jamstack </a> (JavaScript, API & Markup), <a href="https://www.netlify.com/products/functions/"> serverless functions </a> for notifications and database handling, a <a href="https://fauna.com/"> fauna database :floppy_disk: </a> and published with netflify<a href="https://www.netlify.com/"> netflify </a> :ocean:.
</td>
</tr>
</table>

<p align="center"> 
  <img src="gif/pacman_game.gif" alt="Animated gif pacman game" height="282px" width="637">
</p>

---

<div align='center'>
  
### Quick Links
  
<a href='https://projects.colegaw.in/well-app?utm_source=GitHub&utm_medium=readme&utm_campaign=well_app_readme'>
  
<img src='https://img.shields.io/badge/HOMEPAGE-gray?style=for-the-badge'>
  
</a>
  
<a href='https://projects.colegaw.in/well-app/research?utm_source=GitHub&utm_medium=readme&utm_campaign=well_app_readme'>
  
<img src='https://img.shields.io/badge/RESEARCH-blue?style=for-the-badge'>
  
</a>
  
<a href='https://projects.colegaw.in/well-app/case-study?utm_source=GitHub&utm_medium=readme&utm_campaign=well_app_readme'>
  
<img src='https://img.shields.io/badge/CASE STUDY-green?style=for-the-badge'>
  
</a>
  
<br />
  
<br />

</div>

---


<!-- TABLE OF CONTENTS -->
<h2 id="table-of-contents"> :book: Table of Contents</h2>

<details open="open">
  <summary>Table of Contents</summary>
  <ol>
    <li><a href="#test"> ➤ About The Project</a></li>
  </ol>
</details> 

yarn install

# delete global netlify folder under usr/local/lib/node_modules 
# sudo chmod -R 777 ./" first, and than just delete the folder

npm install netlify-cli@2.58.0 -g
sudo netlify init # to create the .netlify folder
sudo netlify build # to create the folder for the serverless functions inside the .netlify folder

sudo netlify dev # select yarn build # to build into the dist folder
sudo netlify dev # select yarn watch # to start the server
