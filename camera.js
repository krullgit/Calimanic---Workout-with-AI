/**
 * @license
 * Copyright 2019 Google LLC. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * =============================================================================
 */
import * as posenet from '@tensorflow-models/posenet';
import dat from 'dat.gui';
import Stats from 'stats.js';
//dwsd

import {drawBoundingBox, drawKeypoints, drawSkeleton, isMobile, toggleLoadingUI, tryResNetButtonName, tryResNetButtonText, updateTryResNetButtonDatGuiCss, drawSegment, toTuple} from './demo_util';

const bspurl = "http://localhost:8888/camera.html?id=286629219312599553&O=Matthes"
let videoWidth = 600;
let videoHeight = 500;

const stats = new Stats();
const gui = new dat.GUI({width: 300});
// dat.GUI.toggleHide();
let video_object = null;
let net = null;
let processing_active = false; // this cariable is needed to deactivate the processing when the back button is triggered

var rep_counter_background=document.getElementById('rep_counter_background');
var rep_counter=document.getElementById('rep_counter');
var rep_counter_total=document.getElementById('rep_counter_total');
var rep_counter_total_done=document.getElementById('rep_counter_total_done');
var rep_counter_done=document.getElementById('rep_counter_done');
var challengereps;
var opponents;
var opponentsreps;
var opponent_me;
var param_me_update = false;
var id;

let opponentsreps_me_backup;

import {
  isPushNotificationSupported,
  initializePushNotifications,
  registerServiceWorker,
  getUserSubscription,
  createNotificationSubscription
} from "./push-notifications";


var pullUps;
function pullUps_reset() {
  pullUps = {
    startPositionTaken: false,
    startPositionPosition: [],
    shoulderWidth: [],
    pullUpCounter: 0,
    startPositionPositionLeftWrist: 0,
    startPositionPositionRightWrist: 0
  }
}

// detect if we are in iOS
function iOS() {
  return [
    'iPad Simulator',
    'iPhone Simulator',
    'iPod Simulator',
    'iPad',
    'iPhone',
    'iPod'
  ].includes(navigator.platform)
  // iPad on iOS 13 detection
  || (navigator.userAgent.includes("Mac") && "ontouchend" in document)
}




window.addEventListener('popstate', function(event) {

  processing_active = false
  // video_object.pause();
  // video_object.src = "";
  if (video_object != null){
    video_object.srcObject.getTracks().forEach(function(track) {
      track.stop();
    });
    video_object = null;
  }

  // # ------------------------------------------------------------------------------------------------------
  // # delete ever child of the opponents container
  // # ------------------------------------------------------------------------------------------------------
  
  const myNode = document.getElementById("opponents_selection");
  while (myNode.lastElementChild) {
    myNode.removeChild(myNode.lastElementChild);
  }

  // # ------------------------------------------------------------------------------------------------------
  // # hode ever elements in element "loading" and "main"
  // # ------------------------------------------------------------------------------------------------------
  
  let children = document.getElementById('loading').children;
  for (var i = 0; i < children.length; i++) {
    children[i].style.display = "none";
  }
  children = document.getElementById('main').children;
  for (var i = 0; i < children.length; i++) {
    children[i].style.display = "none";
  }

  document.getElementById("challenge_done").style.display = "none";
  
  history.pushState(null, null, window.location.pathname+window.location.search);
  bindPage()

}, false);


const video = document.getElementById('video');


async function setupCamera() {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    throw new Error(
        'Browser API navigator.mediaDevices.getUserMedia not available');
  }

  let stream;
  if (!iOS()){
    alert("NOT iOS");
    const stream_test = await navigator.mediaDevices.getUserMedia({
      'audio': false,
      'video': {
        facingMode: 'user'
      },
    });
    let {width, height} = stream_test.getTracks()[0].getSettings();
    stream_test.getTracks().forEach(function(track) {
      alert("here");
      track.stop();
    });
    videoWidth = width
    videoHeight = height
    stream = await navigator.mediaDevices.getUserMedia({
      'audio': false,
      'video': {
        facingMode: 'user'
      },
    });
  }else{
    alert("This is iOS")
    stream = await navigator.mediaDevices.getUserMedia({
      'audio': false,
      'video': {
        facingMode: 'user',
        width: videoWidth,
        height: videoHeight,
      },
    });
  }

  video.width = videoWidth;
  video.height = videoHeight;


  


  


  video.srcObject = stream;
  
  return new Promise((resolve) => {
    video.onloadedmetadata = () => {
      resolve(video);
    };
  });
}


async function loadVideo() {
  const video = await setupCamera();
  video.play();
  return video;
}

const defaultQuantBytes = 2;

const defaultMobileNetMultiplier = 1.0;
// const defaultMobileNetMultiplier = isMobile() ? 0.50 : 0.75;
const defaultMobileNetStride = 16;
const defaultMobileNetInputResolution = 250;

const defaultResNetMultiplier = 1.0;
const defaultResNetStride = 32;
const defaultResNetInputResolution = 250;

const guiState = {
  algorithm: 'multi-pose',
  input: {
    architecture: 'MobileNetV1', // ResNet50, MobileNetV1
    outputStride: defaultMobileNetStride,
    inputResolution: defaultMobileNetInputResolution,
    multiplier: defaultMobileNetMultiplier,
    quantBytes: defaultQuantBytes
  },
  singlePoseDetection: {
    minPoseConfidence: 0.1,
    minPartConfidence: 0.5,
  },
  multiPoseDetection: {
    maxPoseDetections: 1,
    minPoseConfidence: 0.15,
    minPartConfidence: 0.1,
    nmsRadius: 30.0,
  },
  output: {
    showVideo: true,
    showVideo: true,
    showSkeleton: true,
    showPoints: true,
    showBoundingBox: false,
  },
  net: null,
};

/**
 * Sets up dat.gui controller on the top-right of the window
 */
function setupGui(cameras, net) {
  guiState.net = net;

  if (cameras.length > 0) {
    guiState.camera = cameras[0].deviceId;
  }

  

  let architectureController = null;
  guiState[tryResNetButtonName] = function() {
    architectureController.setValue('ResNet50')
  };
  gui.add(guiState, tryResNetButtonName).name(tryResNetButtonText);
  updateTryResNetButtonDatGuiCss();

  // The single-pose algorithm is faster and simpler but requires only one
  // person to be in the frame or results will be innaccurate. Multi-pose works
  // for more than 1 person
  const algorithmController =
      gui.add(guiState, 'algorithm', ['single-pose', 'multi-pose']);

  // The input parameters have the most effect on accuracy and speed of the
  // network
  let input = gui.addFolder('Input');
  // Architecture: there are a few PoseNet models varying in size and
  // accuracy. 1.01 is the largest, but will be the slowest. 0.50 is the
  // fastest, but least accurate.
  architectureController =
      input.add(guiState.input, 'architecture', ['MobileNetV1', 'ResNet50']);
  guiState.architecture = guiState.input.architecture;
  // Input resolution:  Internally, this parameter affects the height and width
  // of the layers in the neural network. The higher the value of the input
  // resolution the better the accuracy but slower the speed.
  let inputResolutionController = null;
  function updateGuiInputResolution(
      inputResolution,
      inputResolutionArray,
  ) {
    if (inputResolutionController) {
      inputResolutionController.remove();
    }
    guiState.inputResolution = inputResolution;
    guiState.input.inputResolution = inputResolution;
    inputResolutionController =
        input.add(guiState.input, 'inputResolution', inputResolutionArray);
    inputResolutionController.onChange(function(inputResolution) {
      guiState.changeToInputResolution = inputResolution;
    });
  }

  // Output stride:  Internally, this parameter affects the height and width of
  // the layers in the neural network. The lower the value of the output stride
  // the higher the accuracy but slower the speed, the higher the value the
  // faster the speed but lower the accuracy.
  let outputStrideController = null;
  function updateGuiOutputStride(outputStride, outputStrideArray) {
    if (outputStrideController) {
      outputStrideController.remove();
    }
    guiState.outputStride = outputStride;
    guiState.input.outputStride = outputStride;
    outputStrideController =
        input.add(guiState.input, 'outputStride', outputStrideArray);
    outputStrideController.onChange(function(outputStride) {
      guiState.changeToOutputStride = outputStride;
    });
  }

  // Multiplier: this parameter affects the number of feature map channels in
  // the MobileNet. The higher the value, the higher the accuracy but slower the
  // speed, the lower the value the faster the speed but lower the accuracy.
  let multiplierController = null;
  function updateGuiMultiplier(multiplier, multiplierArray) {
    if (multiplierController) {
      multiplierController.remove();
    }
    guiState.multiplier = multiplier;
    guiState.input.multiplier = multiplier;
    multiplierController =
        input.add(guiState.input, 'multiplier', multiplierArray);
    multiplierController.onChange(function(multiplier) {
      guiState.changeToMultiplier = multiplier;
    });
  }

  // QuantBytes: this parameter affects weight quantization in the ResNet50
  // model. The available options are 1 byte, 2 bytes, and 4 bytes. The higher
  // the value, the larger the model size and thus the longer the loading time,
  // the lower the value, the shorter the loading time but lower the accuracy.
  let quantBytesController = null;
  function updateGuiQuantBytes(quantBytes, quantBytesArray) {
    if (quantBytesController) {
      quantBytesController.remove();
    }
    guiState.quantBytes = +quantBytes;
    guiState.input.quantBytes = +quantBytes;
    quantBytesController =
        input.add(guiState.input, 'quantBytes', quantBytesArray);
    quantBytesController.onChange(function(quantBytes) {
      guiState.changeToQuantBytes = +quantBytes;
    });
  }

  function updateGui() {
    if (guiState.input.architecture === 'MobileNetV1') {
      updateGuiInputResolution(
          defaultMobileNetInputResolution,
          [200, 250, 300, 350, 400, 450, 500, 550, 600, 650, 700, 750, 800]);
      updateGuiOutputStride(defaultMobileNetStride, [8, 16]);
      updateGuiMultiplier(defaultMobileNetMultiplier, [0.50, 0.75, 1.0]);
    } else {  // guiState.input.architecture === "ResNet50"
      updateGuiInputResolution(
          defaultResNetInputResolution,
          [200, 250, 300, 350, 400, 450, 500, 550, 600, 650, 700, 750, 800]);
      updateGuiOutputStride(defaultResNetStride, [32, 16]);
      updateGuiMultiplier(defaultResNetMultiplier, [1.0]);
    }
    updateGuiQuantBytes(defaultQuantBytes, [1, 2, 4]);
  }

  updateGui();
  input.open();
  // Pose confidence: the overall confidence in the estimation of a person's
  // pose (i.e. a person detected in a frame)
  // Min part confidence: the confidence that a particular estimated keypoint
  // position is accurate (i.e. the elbow's position)
  let single = gui.addFolder('Single Pose Detection');
  single.add(guiState.singlePoseDetection, 'minPoseConfidence', 0.0, 1.0);
  single.add(guiState.singlePoseDetection, 'minPartConfidence', 0.0, 1.0);

  let multi = gui.addFolder('Multi Pose Detection');
  multi.add(guiState.multiPoseDetection, 'maxPoseDetections')
      .min(1)
      .max(20)
      .step(1);
  multi.add(guiState.multiPoseDetection, 'minPoseConfidence', 0.0, 1.0);
  multi.add(guiState.multiPoseDetection, 'minPartConfidence', 0.0, 1.0);
  // nms Radius: controls the minimum distance between poses that are returned
  // defaults to 20, which is probably fine for most use cases
  multi.add(guiState.multiPoseDetection, 'nmsRadius').min(0.0).max(40.0);
  multi.open();

  let output = gui.addFolder('Output');
  output.add(guiState.output, 'showVideo');
  output.add(guiState.output, 'showSkeleton');
  output.add(guiState.output, 'showPoints');
  output.add(guiState.output, 'showBoundingBox');
  output.open();


  architectureController.onChange(function(architecture) {
    // if architecture is ResNet50, then show ResNet50 options
    updateGui();
    guiState.changeToArchitecture = architecture;
  });

  algorithmController.onChange(function(value) {
    switch (guiState.algorithm) {
      case 'single-pose':
        multi.close();
        single.open();
        break;
      case 'multi-pose':
        single.close();
        multi.open();
        break;
    }
  });

  gui.close()
  
}

/**
 * Sets up a frames per second panel on the top-left of the window
 */
function setupFPS() {
  stats.showPanel(0);  // 0: fps, 1: ms, 2: mb, 3+: custom
  document.getElementById('main').appendChild(stats.dom);
}



/**
 * Feeds an image to posenet to estimate poses - this is where the magic
 * happens. This function loops with a requestAnimationFrame method.
 */

const sendNoti = async (mode="normal") => {

  const body = { id, opponent_me, mode};
  const res = await fetch('/.netlify/functions/sendPushNotification', {
    method: 'POST',
    body: JSON.stringify(body),
  })
  // console.log("sendNoti: " + res)
  // console.log(res.text())
}


function createPageDone() {

  video_object.srcObject.getTracks().forEach(function(track) {
    track.stop();
  });
  video_object = null;
  
  
  document.getElementById('main').style.display = "none"
  document.getElementById("rep_counter_total_done").style.display = "block"
  document.getElementById("challenge_done").style.display = "block"
  

  if (pullUps.pullUpCounter >= challengereps){
    document.getElementById("maybe_next_time").style.display = "none"
  }else{
    document.getElementById("you_still_got_it").style.display = "none"
  }
  

  let button_retry = document.getElementById("button_retry")
  button_retry.onclick = function() {
    pullUps_reset();

    // here we check if the challenge was meanwhile reset by another player
    // This prevents making the challenge although the game is closed already
    // in this case we alert the user and reset the page
    databaseQueryID().then((messages) => {
      let opponents = messages[0]
      let opponentsreps = messages[1]
      let opponentsreps_index_me = opponents.indexOf(opponent_me)
      let opponentsreps_me = opponentsreps[opponentsreps_index_me]
      if (opponentsreps_me_backup != opponentsreps_me){
        alert("Another player reset the challenge. Page is reloaded.")
        location.reload();
      }
    })
    
    fromStartToChallenge(net)
  }
  let button_thisneverhappened = document.getElementById("button_thisneverhappened")
  button_thisneverhappened.onclick = function() {
    // here we check if the challenge was meanwhile reset by another player
    // This prevents making the challenge although the game is closed already
    // in this case we alert the user and reset the page
    databaseQueryID().then((messages) => {
      let opponents = messages[0]
      let opponentsreps = messages[1]
      let opponentsreps_index_me = opponents.indexOf(opponent_me)
      let opponentsreps_me = opponentsreps[opponentsreps_index_me]
      if (opponentsreps_me_backup != opponentsreps_me){
        alert("Another player reset the challenge. Page is reloaded.")
        location.reload();
      }
    })
    bindPage()
  }
  let button_submit = document.getElementById("button_submit")
  let spinner_submit = document.getElementById("spinner_submit")
  button_submit.style.display = "block";
  spinner_submit.style.display = "none";
  button_submit.onclick = function() {
    button_submit.style.display = "none";
    spinner_submit.style.display = "block";
    // here we check if the challenge was meanwhile reset by another player
    // This prevents making the challenge although the game is closed already
    // in this case we alert the user and reset the page
    databaseQueryID().then((messages) => {
      let opponents = messages[0]
      let opponentsreps = messages[1]
      let opponentsreps_index_me = opponents.indexOf(opponent_me)
      let opponentsreps_me = opponentsreps[opponentsreps_index_me]
      if (opponentsreps_me_backup != opponentsreps_me){
        alert("Another player reset the challenge. Page is reloaded.")
        location.reload();
      }
    })

    databaseSubmitReps().then((messages) => {
      
      sendNoti();
      pullUps_reset();
      bindPage();

    
    })
  }
}

function detectPoseInRealTime(video, net) {

  processing_active = true

  const canvas = document.getElementById('output');
  canvas.style.height = "100%";
  canvas.style.position = "fixed";
  canvas.style.margin = "auto";
  canvas.style.display = "block";
  // document.getElementById('output').style.marginLeft = "-20vw";



  // left: 50%;
  // -ms-transform: translate(-50%, -50%);
  // transform: translate(-50%, -50%);
  //document.getElementById('output').style.marginLeft = "-400px";
  const ctx = canvas.getContext('2d');
  rep_counter_total.innerHTML = pullUps.pullUpCounter+"/"+challengereps;

  rep_counter_total_done.innerHTML = pullUps.pullUpCounter+"/"+challengereps;

  rep_counter_total.style.display='block'; 
  rep_counter_done.style.display='block'; 

  // HEREEE

  setTimeout(function(){
    document.getElementById("rep_counter_e1").style.display='none';                
    document.getElementById("rep_counter_e2").style.display='none';   
  }, 500);
  setTimeout(function(){
    document.getElementById("rep_counter_e1").style.display='block';      
    document.getElementById("rep_counter_e2").style.display='none';             
  }, 1000);
  setTimeout(function(){
    document.getElementById("rep_counter_e1").style.display='none';  
    document.getElementById("rep_counter_e2").style.display='block';                  
  }, 1500);
  setTimeout(function(){
    document.getElementById("rep_counter_e1").style.display='block';  
    document.getElementById("rep_counter_e2").style.display='none';                  
  }, 2000);
  setTimeout(function(){
    document.getElementById("rep_counter_e1").style.display='none';  
    document.getElementById("rep_counter_e2").style.display='block';                  
  }, 2500);
  setTimeout(function(){
    document.getElementById("rep_counter_e1").style.display='block';  
    document.getElementById("rep_counter_e2").style.display='none';                  
  }, 3000);
  setTimeout(function(){
    document.getElementById("rep_counter_e1").style.display='none';  
    document.getElementById("rep_counter_e2").style.display='block';                  
  }, 3500);
  setTimeout(function(){
    document.getElementById("rep_counter_e1").style.display='none';  
    document.getElementById("rep_counter_e2").style.display='none';                  
  }, 4000);



  

  let challenge_done = false;
  rep_counter_done.onclick = function() {
    challenge_done = true;
  }

  // since images are being fed from a webcam, we want to feed in the
  // original image and then just flip the keypoints' x coordinates. If instead
  // we flip the image, then correcting left-right keypoint pairs requires a
  // permutation on all the keypoints.
  const flipPoseHorizontal = true;
  

  canvas.width = videoWidth;
  canvas.height = videoHeight;

  async function poseDetectionFrame() {


    if (challenge_done){
      ctx.clearRect(0, 0, videoWidth, videoHeight);
      createPageDone();
      return true;
    }
    if (!processing_active){
      return true;
    }
    
    if (guiState.changeToArchitecture) {
      // Important to purge variables and free up GPU memory
      guiState.net.dispose();
      toggleLoadingUI(true);
      guiState.net = await posenet.load({
        architecture: guiState.changeToArchitecture,
        outputStride: guiState.outputStride,
        inputResolution: guiState.inputResolution,
        multiplier: guiState.multiplier,
      });
      toggleLoadingUI(false);
      guiState.architecture = guiState.changeToArchitecture;
      guiState.changeToArchitecture = null;
    }

    if (guiState.changeToMultiplier) {
      guiState.net.dispose();
      toggleLoadingUI(true);
      guiState.net = await posenet.load({
        architecture: guiState.architecture,
        outputStride: guiState.outputStride,
        inputResolution: guiState.inputResolution,
        multiplier: +guiState.changeToMultiplier,
        quantBytes: guiState.quantBytes
      });
      toggleLoadingUI(false);
      guiState.multiplier = +guiState.changeToMultiplier;
      guiState.changeToMultiplier = null;
    }

    if (guiState.changeToOutputStride) {
      // Important to purge variables and free up GPU memory
      guiState.net.dispose();
      toggleLoadingUI(true);
      guiState.net = await posenet.load({
        architecture: guiState.architecture,
        outputStride: +guiState.changeToOutputStride,
        inputResolution: guiState.inputResolution,
        multiplier: guiState.multiplier,
        quantBytes: guiState.quantBytes
      });
      toggleLoadingUI(false);
      guiState.outputStride = +guiState.changeToOutputStride;
      guiState.changeToOutputStride = null;
    }

    if (guiState.changeToInputResolution) {
      // Important to purge variables and free up GPU memory
      guiState.net.dispose();
      toggleLoadingUI(true);
      guiState.net = await posenet.load({
        architecture: guiState.architecture,
        outputStride: guiState.outputStride,
        inputResolution: +guiState.changeToInputResolution,
        multiplier: guiState.multiplier,
        quantBytes: guiState.quantBytes
      });
      toggleLoadingUI(false);
      guiState.inputResolution = +guiState.changeToInputResolution;
      guiState.changeToInputResolution = null;
    }

    if (guiState.changeToQuantBytes) {
      // Important to purge variables and free up GPU memory
      guiState.net.dispose();
      toggleLoadingUI(true);
      guiState.net = await posenet.load({
        architecture: guiState.architecture,
        outputStride: guiState.outputStride,
        inputResolution: guiState.inputResolution,
        multiplier: guiState.multiplier,
        quantBytes: guiState.changeToQuantBytes
      });
      toggleLoadingUI(false);
      guiState.quantBytes = guiState.changeToQuantBytes;
      guiState.changeToQuantBytes = null;
    }

    // Begin monitoring code for frames per second
    stats.begin();

    let poses = [];
    let minPoseConfidence;
    let minPartConfidence;
    switch (guiState.algorithm) {
      case 'single-pose':
        const pose = await guiState.net.estimatePoses(video, {
          flipHorizontal: flipPoseHorizontal,
          decodingMethod: 'single-person'
        });
        poses = poses.concat(pose);
        minPoseConfidence = +guiState.singlePoseDetection.minPoseConfidence;
        minPartConfidence = +guiState.singlePoseDetection.minPartConfidence;
        break;
      case 'multi-pose':
        let all_poses = await guiState.net.estimatePoses(video, {
          flipHorizontal: flipPoseHorizontal,
          decodingMethod: 'multi-person',
          maxDetections: guiState.multiPoseDetection.maxPoseDetections,
          scoreThreshold: guiState.multiPoseDetection.minPartConfidence,
          nmsRadius: guiState.multiPoseDetection.nmsRadius
        });

        poses = poses.concat(all_poses);
        minPoseConfidence = +guiState.multiPoseDetection.minPoseConfidence;
        minPartConfidence = +guiState.multiPoseDetection.minPartConfidence;
        break;
    }

    ctx.clearRect(0, 0, videoWidth, videoHeight);

    if (guiState.output.showVideo) {
      ctx.save();
      ctx.scale(-1, 1);
      ctx.translate(-videoWidth, 0);
      ctx.drawImage(video, 0, 0, videoWidth, videoHeight);
      ctx.restore();
    }

    // For each pose (i.e. person) detected in an image, loop through the poses
    // and draw the resulting skeleton and keypoints if over certain confidence
    // scores
    poses.forEach(({score, keypoints}) => {
      // let positionLeftWirst = keypoints[9]["position"]["y"]
      // let positionRightWirst = keypoints[10]["position"]["y"]
      // let positionNose = keypoints[0]["position"]["y"]

      let LeftWrist = keypoints[9]
      let RightWirst = keypoints[10]
      let Nose = keypoints[0]
      let leftShoulder = keypoints[5]
      let rightShoulder = keypoints[6]
      
      
      if ((LeftWrist["score"] > minPoseConfidence) && (RightWirst["score"] > minPoseConfidence) && (Nose["score"] > minPoseConfidence) && (leftShoulder["score"] > minPoseConfidence) && (rightShoulder["score"] > minPoseConfidence)){
        
        pullUps.shoulderWidth.push(leftShoulder["position"]["x"]-rightShoulder["position"]["x"]);
        if (pullUps.shoulderWidth.length > 10){

          // get shoulder mean

          pullUps.shoulderWidth.shift();
          const average = arr => arr.reduce( ( p, c ) => p + c, 0 ) / arr.length;
          const shoulderWidthMean = Math.abs(average(pullUps.shoulderWidth));
          

          // look if wrists are shoulder mean higher than Nose
          
          const NoseY = Nose["position"]["y"] 
          const LeftWristX = LeftWrist["position"]["x"] 
          const LeftWristY = LeftWrist["position"]["y"] 
          const RightWirstX = RightWirst["position"]["x"]
          const RightWirstY = RightWirst["position"]["y"]
          
          // check if we are already in start position (hands at bar)
          if (pullUps.startPositionTaken == false){

            let cond_wrists_high_enough_y = (LeftWristY < NoseY-shoulderWidthMean*1.3) && (RightWirstY < NoseY-shoulderWidthMean*1.3)
            let cond_wrists_far_enough_apart_x = Math.abs(LeftWristX-RightWirstX) > (shoulderWidthMean*0.6)
            let cond_wrists_not_too_far_enough_apart_y = Math.abs(LeftWristY-RightWirstY) < (shoulderWidthMean*0.3)

            // check if hands are high enough
            if (cond_wrists_high_enough_y && cond_wrists_far_enough_apart_x&& cond_wrists_not_too_far_enough_apart_y){


              pullUps.startPositionTaken = true // save that we reached start position

              // save wrist postitions 
              pullUps.startPositionPosition = [] // reset positions
              pullUps.startPositionPosition.push(LeftWristX);
              pullUps.startPositionPosition.push(LeftWristY);
              pullUps.startPositionPosition.push(RightWirstX);
              pullUps.startPositionPosition.push(RightWirstY);

              // show wrists start positions 
              pullUps.startPositionPositionLeftWrist = LeftWrist;
              pullUps.startPositionPositionRightWrist = RightWirst;
            
              
            }
          // we are already at start position and weight for the pull pull up
          }else{

            // check if he left the bar
            let cond_wrists_too_low_y = (LeftWristY > NoseY+shoulderWidthMean*1.5) && (RightWirstY > NoseY+shoulderWidthMean*1.5);
            let cond_wrists_too_high_y = (LeftWristY < pullUps.startPositionPosition[1]-shoulderWidthMean*0.6) && (RightWirstY < pullUps.startPositionPosition[3]-shoulderWidthMean*0.6);
            console.log("cond_wrists_too_high_y: "+cond_wrists_too_high_y)

            if (!cond_wrists_too_low_y && !cond_wrists_too_high_y){

              let cond_head_high_enough_y = (pullUps.startPositionPosition[1]+pullUps.startPositionPosition[3])/2 > NoseY
              if (cond_head_high_enough_y){
                
                pullUps.startPositionTaken = false // save that we are waiting for getting to the start position again (hang loose)
                pullUps.startPositionPositionLeftWrist = 0 
                pullUps.startPositionPositionRightWrist = 0
                pullUps.pullUpCounter = pullUps.pullUpCounter + 1
                rep_counter_total.innerHTML = pullUps.pullUpCounter+"/"+challengereps;
                rep_counter_total_done.innerHTML = pullUps.pullUpCounter+"/"+challengereps;
                rep_counter.innerHTML = pullUps.pullUpCounter
                rep_counter_background.style.display='block';        
                rep_counter.style.display='block';  
                
                
                setTimeout(function(){
                  
            
                  rep_counter_background.style.display='none';     
                  rep_counter.style.display='none';
                          
                }, 500);
  
                if (pullUps.pullUpCounter >= challengereps | challenge_done){
                  createPageDone();
                  return true;
                }
              
              // if he left the bar, reset startPositionTaken to avoid cheated pullups
              }
            }else{
              let text;
              if (cond_wrists_too_low_y){
                text = "tl"
              
              }else if (cond_wrists_too_high_y){
                text = "th"
              }
              else{
                text = "else"
              }

              

              rep_counter.innerHTML = text
              rep_counter_background.style.fontSize='block';
              rep_counter_background.style.display='block';        
              rep_counter.style.display='block';  

              setTimeout(function(){
                rep_counter_background.style.display='none';     
                rep_counter.style.display='none';  
              }, 500);

              pullUps.startPositionTaken = false
              pullUps.startPositionPositionLeftWrist = 0 
              pullUps.startPositionPositionRightWrist = 0
            }
          }
        }
      }



      if (score >= minPoseConfidence) {
        if (guiState.output.showPoints) {
          if (pullUps.startPositionPositionLeftWrist != 0){
            let keypoint_start = [pullUps.startPositionPositionLeftWrist, pullUps.startPositionPositionRightWrist]
            drawKeypoints(keypoint_start, minPartConfidence, ctx,1, "#ffffff", 7);
          }
          drawKeypoints(keypoints, minPartConfidence, ctx, 1, "#74ffc4", 3);
        }
        if (guiState.output.showSkeleton) {
          if (pullUps.startPositionPositionLeftWrist != 0){
            let keypoint_start = [pullUps.startPositionPositionLeftWrist, pullUps.startPositionPositionRightWrist]
            drawSegment(
              toTuple(pullUps.startPositionPositionLeftWrist.position), toTuple(pullUps.startPositionPositionRightWrist.position), "#ffffff",
              1, ctx);
            drawKeypoints(keypoint_start, minPartConfidence, ctx,1, "#ffffff", 7);
          }
          drawSkeleton(keypoints, minPartConfidence, ctx);
        }
        if (guiState.output.showBoundingBox) {
          drawBoundingBox(keypoints, ctx);
        }
      }
    });

    // End monitoring code for frames per second
    stats.end();

    requestAnimationFrame(poseDetectionFrame);
  }
  poseDetectionFrame().then((message) => {
    
  });
}

// ------------------------------------------------------------------------------------------------------
// get data from server according to challenge ID
// ------------------------------------------------------------------------------------------------------

const databaseQueryID = async () => {
  const body = { id };
  try {
    const res = await fetch('/.netlify/functions/getLinks', {
      method: 'POST',
      body: JSON.stringify(body),
    });
    const links = await res.json();
    try {
      opponents = String(links.findLinkByID.opponents).split(",").map(s => s.trim())
      opponentsreps = String(links.findLinkByID.opponentsreps).split(",").map(s => s.trim())
      let challengetype = String(links.findLinkByID.challengetype)
      challengereps = String(links.findLinkByID.challengereps)
      let challengerules = String(links.findLinkByID.challengerules)
      return [opponents, opponentsreps, challengetype, challengereps, challengerules]
    } catch (error) {
      let opponents = ["Opponent1","Opponent2"]
      let opponentsreps = ["0","0"]
      let challengetype = "pullup"
      let challengereps = "5"
      let challengerules = null
      return [opponents, opponentsreps, challengetype, challengereps, challengerules]
    }
  } catch (error) {
    console.error(error);
  }
};

// ------------------------------------------------------------------------------------------------------
// get data from server according to challenge ID
// ------------------------------------------------------------------------------------------------------

const databaseSubmitReps = async (reset = false) => {
  
  param_me_update = true

  // let opponentsreps_index_me = opponents.indexOf(opponent_me)
  // opponentsreps[opponentsreps_index_me] = pullUps.pullUpCounter
  // let reps = String(opponentsreps[0]+","+opponentsreps[1])

  let reps = String(pullUps.pullUpCounter)

  if (reset==true){
    reps = "-1,-1"
  } 

  const body = { id, reps, opponent_me };
  try {
    const res = await fetch('/.netlify/functions/updateLinks', {
      method: 'PUT',
      body: JSON.stringify(body),
    });
    const links = await res.json();
    
  } catch (error) {
    console.error(error);
  }
  return "databaseSubmitReps done"
};


/**
 * Kicks off the demo by loading the posenet model, finding and loading
 * available camera devices, and setting off the detectPoseInRealTime function.
 */
export async function bindPage() {

 
  
  // button_new2.style.display = "block"
  
  pullUps_reset();

  var base_url = window.location.origin;
  let link_new = base_url
  document.getElementById('challenge_done').style.display = 'none';
  
  let children = document.getElementById('loading').children;
  for (var i = 0; i < children.length; i++) {
    children[i].style.display = "none";
  }
  children = document.getElementById('main').children;
  for (var i = 0; i < children.length; i++) {
    children[i].style.display = "none";
  }
  
  document.getElementById("img_new_divider").style.display = "block"
  document.getElementById("logo").style.display = "block"


  // HEREEEEEE
  let button_new = document.getElementById("img_new")
  button_new.style.display = "block"
  button_new.onclick = function() {
    window.location.href = link_new;
  }
  


  toggleLoadingUI(true);
  net = await posenet.load({
    architecture: guiState.input.architecture,
    outputStride: guiState.input.outputStride,
    inputResolution: guiState.input.inputResolution,
    multiplier: guiState.input.multiplier,
    quantBytes: guiState.input.quantBytes
  });
  toggleLoadingUI(false, "spinner");

  
  // ------------------------------------------------------------------------------------------------------
  // get the ID from the url
  // ------------------------------------------------------------------------------------------------------

  const queryString = window.location.search;
  const urlParams = new URLSearchParams(queryString);
  id = urlParams.get('id')
  const param_me = urlParams.get('me')

  

  // ------------------------------------------------------------------------------------------------------
  // wait if the server responded the challnge details
  // ------------------------------------------------------------------------------------------------------

  databaseQueryID().then((messages) => {
    let opponents = messages[0]
    let opponentsreps = messages[1]

    let challengetype = messages[2]
    let challengereps = messages[3]
    let challengerules = messages[4]

    rep_counter_total.innerHTML = "0/"+challengereps;
    document.getElementById('spinner_1').style.display = 'none';

    if (param_me == null){

      // # ------------------------------------------------------------------------------------------------------
      // # Create the "who_are_you" page
      // # ------------------------------------------------------------------------------------------------------

      var opponents_title = document.getElementById("opponents_title").innerHTML
      document.getElementById('opponents_title').style.display = 'none';
      document.getElementById('who_are_you').style.display = 'block';
      document.getElementById('opponents_selection').style.display = 'block';
      let node_opponents_selection = document.getElementById('opponents_selection');
      var i;
      for (i = 0; i < opponents.length; i++) {
        let node = document.createElement("div"); 
        node.setAttribute("id", "opponents_selection_"+i);
        node.innerHTML = opponents[i]
        node.classList.add('spinner-text-upper');
        node.classList.add('opponents_selection_item');
        node_opponents_selection.appendChild(node);  
        node.onclick = function() {
          const url = new URL(window.location.href);
          url.searchParams.set('me', node.innerHTML);
          window.history.pushState("", "", url); 
          opponent_me = node.innerHTML

          render_challenge_overview()
        }  
      }
    } else {      
      opponent_me = param_me
      
      render_challenge_overview()
    }
    

    function render_challenge_overview() {

      let opponentsreps_index_me = opponents.indexOf(opponent_me)
      let opponentsreps_me = opponentsreps[opponentsreps_index_me]
      opponentsreps_me_backup = opponentsreps_me;

      if (opponentsreps_me != -1){
        
        document.getElementById('img_accept_start_retry').style.display = 'block';
      }else{
        document.getElementById('img_accept_start').style.display = 'block';
      }
      

      
      document.getElementById('rules').style.display = 'block';

      let button_get_notified = document.getElementById('button_get_notified')
      button_get_notified.style.display = 'block';
      const pushNotificationSuported = isPushNotificationSupported()
      button_get_notified.onclick = function() {

        // none the button
        button_get_notified.style.display = 'none';
        // show spinnerinstead
        let spinner_get_notified = document.getElementById('spinner_get_notified')
        spinner_get_notified.style.display = 'block';

        // ask for permission
        initializePushNotifications().then((message) => {
          // register SW
          registerServiceWorker().then((registration) => {
            
            // subscribe
            createNotificationSubscription();
            // get subscription object
            getUserSubscription().then(function(subscrition) {
              if (subscrition) {
                const body = { id, subscrition, opponent_me };

                try {
                  fetch('/.netlify/functions/handlePushNotificationSubscription', {
                    method: 'POST',
                    body: JSON.stringify(body),
                  })
                    .then(response => response.json())
                    .then(data => {
                      spinner_get_notified.style.display = 'none';
                      alert("You get notified when someone did the exercise or reopened the challenge.");
                      // const body2 = { id, opponent_me };
                      // fetch('/.netlify/functions/sendPushNotification', {
                      //   method: 'POST',
                      //   body: JSON.stringify(body),
                      // }).then(response => console.log(response))
                        
                    })
                  
                } catch (error) {
                  console.error(error);
                }
              }
            });

            
            // if (reset==true){
            //   reps = "-1,-1"
            // } 
          
          
            // const body = { id, reps };
           
            registration.update()
          });
      });
        

      }

      let emoji_winner_x;
      let emoji_winner_y;

      document.getElementById('opponents_selection').style.display = 'none';
      let button = document.getElementById('who_are_you').style.display = 'none';
      opponents_title = "OX<br> challenged OY!<br>RX RT!"
      if (opponents[0] == opponent_me) {
        opponents_title = opponents_title.replace("OX", "You");
        opponents_title = opponents_title.replace("OY", opponents[1]);
      } else {
        opponents_title = opponents_title.replace("OX", opponents[0]);
        opponents_title = opponents_title.replace("OY", "you");
      }
      
      opponents_title = opponents_title.replace("RX", challengereps);
      if (challengetype == "pullup"){
        opponents_title = opponents_title.replace("RT", "PullUps");
      }
      document.getElementById("opponents_title").innerHTML = opponents_title
      document.getElementById("opponents_title").style.display = 'block';
      
      document.getElementById("opponents_reps_OX").innerHTML = opponents[0]
      document.getElementById("opponents_reps_OY").innerHTML = opponents[1]
  
      document.getElementById('opponents_reps').style.display = 'block';

      if (opponentsreps[0] == "-1"){
        document.getElementById("opponents_reps_OXR").innerHTML = "open"
      }else if (opponentsreps[0] == challengereps){
        emoji_winner_x = "🥇 "
        document.getElementById("opponents_reps_OX").style.fontSize = "xx-large"
        document.getElementById("opponents_reps_OXR").innerHTML = challengereps
        document.getElementById("opponents_reps_OXR").style.color = "#04b72bff";
        document.getElementById("opponents_reps_OXR").style.fontSize = "xx-large"
      }else if (opponentsreps[0] < challengereps){
        emoji_winner_x = "🥈 "
        document.getElementById("opponents_reps_OXR").innerHTML = opponentsreps[0]
        document.getElementById("opponents_reps_OXR").style.color = "#ff5555ff";
      }
  
      if (opponentsreps[1] == "-1"){
        document.getElementById("opponents_reps_OYR").innerHTML = "open"
      }else if (opponentsreps[1] == challengereps){
        emoji_winner_y = "🥇 "
        document.getElementById("opponents_reps_OY").style.fontSize = "xx-large"
        document.getElementById("opponents_reps_OYR").innerHTML = challengereps
        document.getElementById("opponents_reps_OYR").style.color = "#04b72bff";
        document.getElementById("opponents_reps_OYR").style.fontSize = "xx-large"
      }else if (opponentsreps[1] < challengereps){
        emoji_winner_y = "🥈 "
        document.getElementById("opponents_reps_OYR").innerHTML = opponentsreps[1]
        document.getElementById("opponents_reps_OYR").style.color = "#ff5555ff";
      }

      // # ------------------------------------------------------------------------------------------------------
      // # Case: Both player played = Game Done
      // # ------------------------------------------------------------------------------------------------------
      
      if (opponentsreps[0] != "-1" && opponentsreps[1] != "-1"){
        document.getElementById("opponents_reps_OX").innerHTML = emoji_winner_x + document.getElementById("opponents_reps_OX").innerHTML
        document.getElementById("opponents_reps_OY").innerHTML = emoji_winner_y + document.getElementById("opponents_reps_OY").innerHTML

        document.getElementById('img_accept_start').style.display = 'None';
        document.getElementById('img_accept_start_retry').style.display = 'None';
        
        if (opponentsreps_me != challengereps){
          //document.getElementById('img_looser').style.display = 'block';
        }else{
          document.getElementById('img_winner').style.display = 'block';
        }
        document.getElementById('img_reopen').style.display = 'block';
        document.getElementById('rules').style.display = 'none';

        let button_reopen = document.getElementById('img_reopen')
        button_reopen.onclick = function() {

          // here we check if the challenge was meanwhile reset by another player
          // This prevents making the challenge although the game is closed already
          // in this case we alert the user and reset the page
          databaseQueryID().then((messages) => {
            let opponents = messages[0]
            let opponentsreps = messages[1]
            let opponentsreps_index_me = opponents.indexOf(opponent_me)
            let opponentsreps_me = opponentsreps[opponentsreps_index_me]
            if (opponentsreps_me_backup != opponentsreps_me){
              alert("Another player reset the challenge. Page is reloaded.")
              location.reload();
            }
          })

          databaseSubmitReps(true);
          sendNoti("reset");
          console.log("reload now")
          setTimeout(function(){
            //do what you need here
          location.reload();
        }, 2000);
        }
      
      // # ------------------------------------------------------------------------------------------------------
      // # Case: One Player didnt play yet = Game Open
      // # ------------------------------------------------------------------------------------------------------

      }else{
        let button;
        if (document.getElementById("img_accept_start").style.display == "block"){
          button = document.getElementById("img_accept_start")
        }else{
          button = document.getElementById("img_accept_start_retry")
        }
        button.onclick = function() {

          // change the url that the use can press the button to reload the page
          const url = new URL(window.location.href);
          url.searchParams.set('mode', "challenge");
          window.history.pushState("", "", url);

        // here we check if the challenge was meanwhile reset by another player
        // This prevents making the challenge although the game is closed already
        // in this case we alert the user and reset the page
        databaseQueryID().then((messages) => {
          let opponents = messages[0]
          let opponentsreps = messages[1]
          let opponentsreps_index_me = opponents.indexOf(opponent_me)
          let opponentsreps_me = opponentsreps[opponentsreps_index_me]
          if (opponentsreps_me_backup != opponentsreps_me){
            alert("Another player reset the challenge. Page is reloaded.")
            location.reload();
          }
        })
          
          fromStartToChallenge()
        }
      }
    }
    
    


  });


 
}

export async function fromStartToChallenge() {

  document.getElementById('logo').style.display = 'none';
  document.getElementById('opponents_title').style.display = 'none';
  document.getElementById('challenge_done').style.display = 'none';

  toggleLoadingUI(false);

  if (video_object == null){
    try {
      video_object = await loadVideo();
    } catch (e) {
      alert(e)
      let info = document.getElementById('info');
      info.textContent = 'this browser does not support video capture,' +
          'or this device does not have a camera';
      info.style.display = 'block';
      throw e;
    }
  }

  if (gui.__controllers.length == 0){
    setupGui([], net);
  }
  setupFPS();
  detectPoseInRealTime(video_object, net);


 
}

navigator.getUserMedia = navigator.getUserMedia ||
    navigator.webkitGetUserMedia || navigator.mozGetUserMedia;
// kick off the demo
bindPage();
