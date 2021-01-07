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

import {drawBoundingBox, drawKeypoints, drawSkeleton, isMobile, toggleLoadingUI, tryResNetButtonName, tryResNetButtonText, updateTryResNetButtonDatGuiCss} from './demo_util';

const bspurl = "http://localhost:8888/camera.html?id=286629219312599553&O=Matthes"
const videoWidth = 600;
const videoHeight = 500;
const stats = new Stats();

var rep_counter_background=document.getElementById('rep_counter_background');
var rep_counter=document.getElementById('rep_counter');
var rep_counter_total=document.getElementById('rep_counter_total');
var challengereps;

/**ä
 * Loads a the camera to be used in the demo
 *
 */

function docReady(fn) {
  // see if DOM is already available
  if (document.readyState === "complete" || document.readyState === "interactive") {
      // call on next available tick
      setTimeout(fn, 1);
  } else {
      document.addEventListener("DOMContentLoaded", fn);
  }
}   

async function setupCamera() {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    throw new Error(
        'Browser API navigator.mediaDevices.getUserMedia not available');
  }

  const video = document.getElementById('video');
  video.width = videoWidth;
  video.height = videoHeight;

  const mobile = isMobile();
  const stream = await navigator.mediaDevices.getUserMedia({
    'audio': false,
    'video': {
      facingMode: 'user',
      width: mobile ? undefined : videoWidth,
      height: mobile ? undefined : videoHeight,
    },
  });
  video.srcObject = stream;

  return new Promise((resolve) => {
    video.onloadedmetadata = () => {
      resolve(video);
    };
  });
}

// async function setupCamera2() {
//     // var video = $('body > video')[0];
//     var video = document.getElementsByTagName("video")[0];
//     video.width = videoWidth;
//     video.height = videoHeight;
    
//     navigator.getMedia = (navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia || navigator.msGetUserMedia);
    
//      const stream = await navigator.mediaDevices.getUserMedia({
//     'audio': false,
//     'video': {
//       facingMode: 'user'
//     },
//   });
//   video.srcObject = stream;
    
//     return new Promise((resolve) => {
//       video.onloadedmetadata = () => {
//         resolve(video);
//       };
//     });
 

// }

async function loadVideo() {
  const video = await setupCamera();
  //const video = await setupCamera2();
  video.play();
  return video;
}

const defaultQuantBytes = 2;

const defaultMobileNetMultiplier = isMobile() ? 0.50 : 0.75;
const defaultMobileNetStride = 16;
const defaultMobileNetInputResolution = 500;

const defaultResNetMultiplier = 1.0;
const defaultResNetStride = 32;
const defaultResNetInputResolution = 250;

const guiState = {
  algorithm: 'multi-pose',
  input: {
    architecture: 'MobileNetV1',
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
    maxPoseDetections: 5,
    minPoseConfidence: 0.15,
    minPartConfidence: 0.1,
    nmsRadius: 30.0,
  },
  output: {
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

  const gui = new dat.GUI({width: 300});

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
 * Sets up....
 */
function setupPullUp() {
  var node = document.createElement("div");   
  node.setAttribute("id", "pullUp");      
  node.innerHTML = "test";  
  // var textnode = document.createTextNode("Water");    
  //textnode.setAttribute("id", "pullUp_true");      
  //node.appendChild(textnode);                              // Append the text to <li>
  document.getElementById('main').appendChild(node);
  
}

/**
 * Feeds an image to posenet to estimate poses - this is where the magic
 * happens. This function loops with a requestAnimationFrame method.
 */

var pullUps = {
  startPositionTaken: false,
  startPositionPosition: [],
  shoulderWidth: [],
  pullUpCounter: 0,
}

function detectPoseInRealTime(video, net) {
  const canvas = document.getElementById('output');
  
  document.getElementById('output').style.height = "100%";
  document.getElementById('output').style.position = "fixed";
  document.getElementById('output').style.margin = "auto";
  // document.getElementById('output').style.marginLeft = "-20vw";



  // left: 50%;
  // -ms-transform: translate(-50%, -50%);
  // transform: translate(-50%, -50%);
  //document.getElementById('output').style.marginLeft = "-400px";
  console.log(document.getElementById('output').style.height)
  const ctx = canvas.getContext('2d');
  rep_counter_total.style.display='block'; 

  // since images are being fed from a webcam, we want to feed in the
  // original image and then just flip the keypoints' x coordinates. If instead
  // we flip the image, then correcting left-right keypoint pairs requires a
  // permutation on all the keypoints.
  const flipPoseHorizontal = true;
  

  canvas.width = videoWidth;
  canvas.height = videoHeight;

  async function poseDetectionFrame() {
    
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

            // check if hands are high enough
            if ((LeftWristY < NoseY-shoulderWidthMean*1.5) && (RightWirstY < NoseY-shoulderWidthMean*1.5)){
              console.log("startPositionTaken")
              pullUps.startPositionTaken = true // save that we reached start position
              document.getElementById('pullUp').innerHTML = "Start Position reached!";

              // save wrist postitions 
              pullUps.startPositionPosition = [] // reset positions
              pullUps.startPositionPosition.push(LeftWristX);
              pullUps.startPositionPosition.push(LeftWristY);
              pullUps.startPositionPosition.push(RightWirstX);
              pullUps.startPositionPosition.push(RightWirstY);
              console.log(pullUps.startPositionPosition)
              
            }
          // we are already at start position and weight for the pull pull up
          }else{
            if (((pullUps.startPositionPosition[1]+pullUps.startPositionPosition[3])/2 > NoseY)){
              pullUps.startPositionTaken = false // save that we are waiting for getting to the start position again (hang loose)
              pullUps.pullUpCounter = pullUps.pullUpCounter + 1
              rep_counter_total.innerHTML = pullUps.pullUpCounter+"/"+challengereps;
              rep_counter.innerHTML = pullUps.pullUpCounter
              rep_counter_background.style.display='block';        
              rep_counter.style.display='block';  
              
              setTimeout(function(){
              //After the time is passed then I change the css display to block that appears the elements
                rep_counter_background.style.display='none';     
                rep_counter.style.display='none';
                        
              }, 500);
            }
          }
        }
      }



      if (score >= minPoseConfidence) {
        if (guiState.output.showPoints) {
          drawKeypoints(keypoints, minPartConfidence, ctx);
        }
        if (guiState.output.showSkeleton) {
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

  poseDetectionFrame();
}

/**
 * Kicks off the demo by loading the posenet model, finding and loading
 * available camera devices, and setting off the detectPoseInRealTime function.
 */
export async function bindPage() {

  var base_url = window.location.origin;
  let link_new = base_url
  let button_new = document.getElementById("img_new")
  button_new.onclick = function() {
    window.location.href = link_new;
  }
  


  toggleLoadingUI(true);
  const net = await posenet.load({
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
  const id = urlParams.get('id')

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
      console.log(res)
      const links = await res.json();
      try {
        let opponents = String(links.findLinkByID.opponents).split(",").map(s => s.trim())
        let opponentsreps = String(links.findLinkByID.opponentsreps).split(",").map(s => s.trim())
        let challengetype = String(links.findLinkByID.challengetype)
        challengereps = String(links.findLinkByID.challengereps)
        let challengerules = String(links.findLinkByID.challengerules)
        return [opponents, opponentsreps, challengetype, challengereps, challengerules]
      } catch (error) {
        console.log("WARNING: Fallback the default game!")
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
  // wait if the server responded the challnge details
  // ------------------------------------------------------------------------------------------------------

  databaseQueryID().then((messages) => {
    let opponents = messages[0]
    let opponentsreps = messages[1]
    let challengetype = messages[2]
    let challengereps = messages[3]
    let challengerules = messages[4]

    rep_counter_total.innerHTML = "0/"+challengereps;

    var opponents_title = ""
  
    var opponents_title = document.getElementById("opponents_title").innerHTML
    console.log(opponents)
    // console.log(opponents[0])
    // console.log(opponent_me)

    document.getElementById('spinner_1').style.display = 'none';
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
        render_challenge_overview(node.innerHTML)
      }  
    }

    let button = document.getElementById('opponents_selection_1')
    

    function render_challenge_overview(opponent_me) {
      
      document.getElementById('img_accept_start').style.display = 'block';
      document.getElementById('rules').style.display = 'block';
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
        document.getElementById("opponents_reps_OX").style.fontSize = "larger"
        document.getElementById("opponents_reps_OXR").innerHTML = challengereps
        document.getElementById("opponents_reps_OXR").style.color = "#04b72bff";
      }else if (opponentsreps[0] < challengereps){
        
        document.getElementById("opponents_reps_OXR").innerHTML = opponentsreps[0]
        document.getElementById("opponents_reps_OXR").style.color = "#ff5555ff";
      }
  
      if (opponentsreps[1] == "-1"){
        document.getElementById("opponents_reps_OYR").innerHTML = "open"
      }else if (opponentsreps[0] == challengereps){
        document.getElementById("opponents_reps_OY").style.fontSize = "larger"
        document.getElementById("opponents_reps_OYR").innerHTML = challengereps
        document.getElementById("opponents_reps_OYR").style.color = "#04b72bff";
      }else if (opponentsreps[0] < challengereps){
        document.getElementById("opponents_reps_OYR").innerHTML = opponentsreps[0]
        document.getElementById("opponents_reps_OYR").style.color = "#ff5555ff";
      }
      
      if (opponentsreps[0] != "-1" && opponentsreps[1] != "-1"){
        let challenge_winner = ""
        let opponentsreps_index_me = opponents.indexOf(opponent_me)
        let opponentsreps_me = opponentsreps[opponentsreps_index_me]
        document.getElementById('img_accept_start').style.display = 'None';
        
        if (opponentsreps_me != challengereps){
          document.getElementById('img_looser').style.display = 'block';
        }else{
          document.getElementById('img_winner').style.display = 'block';
        }
        document.getElementById('img_reopen').style.display = 'block';
        document.getElementById('rules').style.display = 'none';
      }else{
        let button = document.getElementById("img_accept_start")
        button.onclick = function() {
          document.getElementById('logo').style.display = 'none';
          document.getElementById('opponents_title').style.display = 'none';
          fromStartToChallenge(net)
        }
      }
    }
    
    


  });

  // ------------------------------------------------------------------------------------------------------
  // get the ID from the url
  // ------------------------------------------------------------------------------------------------------


  

  // toggleLoadingUI(false);

  // let video;

  // try {
  //   video = await loadVideo();
  // } catch (e) {
  //   let info = document.getElementById('info');
  //   info.textContent = 'this browser does not support video capture,' +
  //       'or this device does not have a camera';
  //   info.style.display = 'block';
  //   throw e;
  // }

  // setupGui([], net);
  // setupFPS();
  // detectPoseInRealTime(video, net);

  // setupPullUp();

 
}

export async function fromStartToChallenge(net) {

  toggleLoadingUI(false);

  let video;

  try {
    video = await loadVideo();
  } catch (e) {
    let info = document.getElementById('info');
    info.textContent = 'this browser does not support video capture,' +
        'or this device does not have a camera';
    info.style.display = 'block';
    throw e;
  }

  setupGui([], net);
  setupFPS();
  detectPoseInRealTime(video, net);

  setupPullUp();

 
}

navigator.getUserMedia = navigator.getUserMedia ||
    navigator.webkitGetUserMedia || navigator.mozGetUserMedia;
// kick off the demo
bindPage();
