// LaunchButtons  WP : 2022-05-22
//
// Novation Launchpad script hacked up to work with BassApps.de/launchbuttons. (Early Not very functional alpha v0.01)
//
// The plan is to get the following ideas working
//
// LAUNCHER
//    - The killer feature of real novation launchpads, emulated and then enhanced by Launchapps.de app.
//    - Full 8x8 grid with the main 8x8 grid of buttons launching scenes
//    - Separate play and stop and record
//    - Grid note buttons create and record clip when pressing empty clip
//    - When you already have a clip and want to erase and re-record, shift then hit clip again.
//    - When you simply want to erase a clip you hit shift (release) shift (release) then clip.
//    - When you want to create an empty clip you simply press and HOLD for three seconds.
//    - On squares that have a clip, pressing will play it, and again to stop it.
//
// SEQUENCER
//   - Bottom of the main 8x8 grid shows notes
//   - Top half shows one lane (midi note#) midi note events
//  
// KEYS
//   - Play keyboards chromatically.
//
// TRACK/MIXERS/SENDS Mode (concept not even coded)
//  - Grid becomes 8 track faders which can be put into main track gain fader mode, pan mode, send a,b,c,
//    and into a mute/solo  buttons mode.
//    
//
// 
// Top Row Buttons
//   1 UP, 2 DOWN,  3 Left 4 Right  -> mostly should be used to scroll around in some mode. 
//                   Colours should indicate states.
//                     In session mode (clip launcher) should let me move around the session grid
//                     In modes with playable keys, up and down should change octave.
//                     In sequencer mode left and right should let me change the sequencer grid note value (1/4, 1/8, 1/16)
//
//   5 SESSION     - go to clip launcher
//   6 USER1(KEYS) - go to note mode
//   7 USER2(SEQ)  - go to sequencer
//   8 SHIFT      - Holding this should latch into a shift mode 1.  Shift mode 1 will change what session,note,custom do
//                  and also when you press a grid button, what that does. 
//                  You should be able to press it multiple times and change its color and that will 
//                  make as many shift levels.  
//                 Shift one shift, shift mode mode two, then cancel shift, I think is enough.
//
//  Top Row Functions with SHIFT pressed
//    Up   - Increase Launch Quantization (1 bar clip quantize, 2 bar, 4 bar)
//    Down - Decrease Launch Quantization (from 2 bar down to 1 bar etc)
//    Left - Track Select Previous
//    Right - Track Select Next
//
//  Right Side Buttons - First Column
//    The icons on the right show play and these launch scenes.
//    With shift pressed?
//
//  Right Side Buttons - Second Column
//    No idea but will think of a cool use!
//
//  Right Side Buttons - Third Column
//    These have labels printed in the launchapps.de app
//    PLAY
//    STOP
//    RECORD (CIRCLE)
//    PLUS  (no idea what it means)
//    CIRCLE with a half circle (no idea what it means)
//    A
//    B
//    FADER MODE (this is an app feature that this script can see fader values)
//
//  LEFT SIDE Buttons
//    Different features per major mode.
//       Seq/Keys mode - Velocity values
//       Launcher mode - record quantize values
//      
// MAIN GRID
//    In step mode it's a split.
//    In launcher mode its a clip launcher or a split keys and clip launcher
//    In seq mode it's a sequencer and key split.
//  Untested Ideas: 
//    Track Selection
//       Last row of main grid would be nice to have a track select function? (Ruins my split launcher)
//       Shift plus clip would select the instrument?

var trace= 2; //  type trace=1 in the controller script console to enable most debug messages
var view_shift=0; // 0,1,2,3,4 when cursor_down is pressed.
var activeNotes = null;
var playing=0;
var userVarPans = 8; // DO NOT CHANGE
var userVelNote = false; // false recommended, true NOT recommended.
var MUSICAL_STOP_STATE = 0;
var MasterTrackVolume = 1.0;
 
var dancing_leds = false;
var polledFunctionCounter = 0;

// New velocity setup, has a set number for low and high, and you use the two middle buttons to index the rest of the velocities.velocity setup is in Launchpad_Step_Sequencer.js
var velocities2 = [];
for	(index = 127; index > -1; index--)
{
    velocities2[velocities2.length] = index;  // javascript, genius or shit. you decide.
}

// Start the API
loadAPI(10);

// This stuff is all about defining the script and getting it to autodetect and attach the script to the controller
host.defineController("BassApps", "LaunchButtons WP", "1.0", "e6a21650-92f0-11ea-ab12-0800200c9a66");
host.defineMidiPorts(1, 1);

//host.addDeviceNameBasedDiscoveryPair(["Launchpad"], ["Launchpad"]);
//host.addDeviceNameBasedDiscoveryPair(["Launchpad S"], ["Launchpad S"]);
//host.addDeviceNameBasedDiscoveryPair(["Launchpad Mini"], ["Launchpad Mini"]);
// if(host.platformIsLinux())
// {
// 	for(var i=1; i<16; i++)
// 	{
// 	   host.addDeviceNameBasedDiscoveryPair(["Launchpad S " + + i.toString() + " MIDI 1"], ["Launchpad S " + + i.toString() + " MIDI 1"]);
// 	   host.addDeviceNameBasedDiscoveryPair(["Launchpad Mini " + + i.toString() + " MIDI 1"], ["Launchpad Mini " + + i.toString() + " MIDI 1"]);
// 	}
// }

function showPopupNotification( amsg) {
   println('::> '+amsg);
   host.showPopupNotification( amsg);
}
  







// TempMode is a variable used for the Temporary views used in ClipLauncher mode.
var TempMode =
{
   OFF:-1,
   VOLUME:0,
   PAN:1,
   SEND_A:2,
   SEND_B:3,
   TRACK:4,
   SCENE:5,
   USER1:6,
   USER2:7,
   USER3:8
};

// loads up the other files needed
load("launchpad_constants.js"); // contains CCs, Colour values and other variables used across the scripts
load("launchpad_page.js"); // defines the page type which is used for the different pages on the Launchpad
load("launchpad_notemap.js"); // works out all the notemaps, the scales and drawing of the black and white keys
load("launchpad_grid.js"); // draws the main clip launcher and other pages such as volume, pan, sends, and user controls
load("launchpad_keys.js"); // draws the keys as set in launchpad_notemap and places them across the pads
load("launchpad_step_sequencer.js"); // everything to do with the step sequencer

// activePage is the page displayed on the Launchpad, the function changes the page and displays popups
var activePage = null;

var transport = null;
var offset = null;
var quant = null;

function sendMidiOut(status,data1,data2) {
   println("sendMidi "+status+" "+data1+" "+data2);
   host.getMidiOutPort(0).sendMidi(status,data1,data2);
}

// set one of the primary modes active.
// note that many of the top row buttons are always controlled
// in the main script (this file).
function setActivePage(page)
{
   if (trace>0) {
      println("setActivePage "+page)
   }
   var isInit = activePage == null;
    
   clear();


    

   if (page != activePage)
   {
      activePage = page;
      if (!isInit)
      {
         showPopupNotification(":::"+page.title);
      }

      updateNoteTranlationTable();
      updateVelocityTranslationTable();

      // Update indications in the app
      for(var p=0; p<8; p++)
      {
         var track = trackBank.getTrack(p);
         track.getClipLauncher().setIndication(activePage == gridPage);
      }
   }
}

// This sets the order of the buttons on the track control temporary mode
var TrackModeColumn =
{
   STOP:0,
   SELECT:1,
   ARM:2,
   SOLO:3,
   MUTE:4,
   RETURN_TO_ARRANGEMENT:7
};

var timerState = 0;

var TEMPMODE = -1;

var IS_GRID_PRESSED = false;
//var IS_EDIT_PRESSED = false;
var IS_KEYS_PRESSED = false;
//var IS_RECORD_PRESSED = false;
var IS_SHIFT_PRESSED = false; // mapped to mixer key (top row of round buttons, rightmost/8th key)

// Declare arrays which are used to store information received from Bitwig about what is going on to display on pads
var volume = initArray(0, 8);
var pan = initArray(0, 8);
var mute = initArray(0, 8);
var solo = initArray(0, 8);
var arm = initArray(0, 8);
var isMatrixStopped = initArray(0, 8);
var isSelected = initArray(0, 8);
var isQueuedForStop = initArray(0, 8);
var trackExists = initArray(0, 8);
var sendA = initArray(0, 8);
var sendB = initArray(0, 8);
var vuMeter = initArray(0, 8);
var masterVuMeter = 0;
var isDrumMachine = false;

var userValue = initArray(0, 24);

var hasContent = initArray(0, 64);
var isPlaying = initArray(0, 64);
var isRecording = initArray(0, 64); // recording states.
var isQueued = initArray(0, 64);
var isStopQueued = initArray(0, 64);
var noteInput = null;

var isSetPressed = false;

function getPlaying(row,column) {
   return isPlaying[column + 8*row];
}

// Observer functions to store receive information into the above arrays
function getTrackObserverFunc(track, varToStore)
{
   return function(value)
   {
      varToStore[track] = value;
   }
}

function getGridObserverFunc(track, varToStore)
{
   return function(scene, value)
   {
      varToStore[scene*8 + track] = value;
   }
}
function getGridObserverFunc2(track, varToStore)
{
   return function(scene, value)
   {
      if (trace>0){
      println("scene:"+scene+" track:"+track+" play:"+value);
      }
      var i = scene*8 + track; 
      if (varToStore[i] != value) { 
         varToStore[i] = value;
         //polledFunction(); 
      }
   }
}
function getGridObserverFunc3(track, varToStore)
{
   return function(scene, value)
   {
      if (trace>0){
      println("scene:"+scene+" track:"+track+"  content:"+value);
      }
      varToStore[scene*8 + track] = value;
   }
}

var noteOn = initArray(false, 128);
WRITEOVR = false;

var sceneBank = null;

var trackEquality = [];

function getMasterVol() {
   return masterTrack.volume().value().get();
}
function setMasterVol(v) {
      if (v<0) {
         v = 0;
      }
      if(v >1.0) {
         v= 1.0;
      }
   println("setMasterVol "+v);

   masterTrack.volume().value().set(v);
}
   
function createSpecialTrack(pluginName) {
   application.createInstrumentTrack(0);
   
   host.scheduleTask( function() {
       trackBank.scrollToChannel(0);
       c = RGB_COLORS[Math.floor(Math.random()*RGB_COLORS.length)];
       trackBank.getChannel(0).color().set(c[0], c[1], c[2])
       trackBank.getChannel(0).browseToInsertAtStartOfChain();
       application.arrowKeyDown();
       host.scheduleTask( function() {
           for (var i=0; i<cursorResultBank.getSize(); i++) {
               item = cursorResultBank.getItem(i)
               item.isSelected().set(true);
               name = item.name().getValue();
               println( "Sel " + i + " -> " +item.name().getValue());
               if (name == pluginName) break;
           }
           browser.commit();
           t = trackBank.getChannel(0);
           t.selectInMixer(); 

       }, 300); 
   }, 100);

}

selectedName = [""]

function getSelectedNameObserver() {
   return function( name ) {
       if (trace>0) {
          println( "getSelectedNameObserver name: "+name );
       }
       selectedName[0] = name;
   }
}

// The init function gets called when initializing by Bitwig
function init()
{
   // setup MIDI in
   host.getMidiInPort(0).setMidiCallback(onMidi);

   sceneBank = host.createSceneBank(NUM_SCENES);
   


   noteInput = host.getMidiInPort(0).createNoteInput("Launchpad", "80????", "90????");
   noteInput.setShouldConsumeEvents(false);

   // Create a transport and application control section
   transport = host.createTransport();
   transport.isPlaying().markInterested();
   application = host.createApplication();
   transport.addIsPlayingObserver (function(pPlaying) {
      playing = pPlaying;
     // println("playing "+playing);
      // if(playing) {
      //     playButton.turnOn();
      // } else {
      //     playButton.turnOff();
      // }
   });
   transport.addLauncherOverdubObserver(function(state){
        WRITEOVR=state;
   });


//TVbene: variables for post record delay and default clip launch quantization
	transport.getClipLauncherPostRecordingTimeOffset().markInterested();
	transport.defaultLaunchQuantization().markInterested();
	quant = transport.defaultLaunchQuantization();
	offset = transport.getClipLauncherPostRecordingTimeOffset();


   
   // a Trackbank is the tracks, sends and scenes being controlled, these arguments are set to 8,2,8 in the launchpad_constants.js file changing them will change the size of the grid displayed on the Bitwig Clip Launcher
   trackBank = host.createMainTrackBank(NUM_TRACKS, NUM_SENDS, NUM_SCENES)
 //  var t9 = trackBank.scrollToTrack (9);

   // This scrolls through the controllable tracks and clips and picks up the info from Bitwig to later display/control, it stores them in the arrays declared above
   for(var t=0; t<NUM_TRACKS; t++)
   {
      var track = trackBank.getChannel(t);

      trackBank.getChannel(t).isActivated().markInterested();

      track.getVolume().addValueObserver(8, getTrackObserverFunc(t, volume));
      track.getPan().addValueObserver(userVarPans, getTrackObserverFunc(t, pan));
      track.getSend(0).addValueObserver(8, getTrackObserverFunc(t, sendA));
      track.getSend(1).addValueObserver(8, getTrackObserverFunc(t, sendB));    
      track.getMute().addValueObserver(getTrackObserverFunc(t, mute));
      track.getSolo().addValueObserver(getTrackObserverFunc(t, solo));
      track.getArm().addValueObserver(getTrackObserverFunc(t, arm));
      track.getIsMatrixStopped().addValueObserver(getTrackObserverFunc(t, isMatrixStopped));
      track.exists().addValueObserver(getTrackObserverFunc(t, trackExists));
      track.addVuMeterObserver(7, -1, true, getTrackObserverFunc(t, vuMeter));
      track.addIsSelectedObserver(getTrackObserverFunc(t, isSelected));
      track.addIsQueuedForStopObserver(getTrackObserverFunc(t, isQueuedForStop));
       

      var clipLauncher = track.getClipLauncherSlots();

		clipLauncher.addHasContentObserver(getGridObserverFunc3(t, hasContent));


      clipLauncher.addIsPlayingObserver(getGridObserverFunc2(t, isPlaying));
      clipLauncher.addIsRecordingObserver(getGridObserverFunc(t, isRecording));
      clipLauncher.addIsQueuedObserver(getGridObserverFunc(t, isQueued));
      clipLauncher.addIsStopQueuedObserver(getGridObserverFunc(t, isStopQueued)); 
      clipLauncher.addIsSelectedObserver(getGridObserverFunc(t, isSelected));      //TVbene
      //var primaryDevice = track.getDeviceChain.hasDrumPads(isDrumMachine);
       //println(isDrumMachine);
	  
      
   }

   // These next 4 pick up whether the Clip Launcher can be moved
   trackBank.addCanScrollTracksUpObserver(function(canScroll)
   {
      gridPage.canScrollTracksUp = canScroll;
   });

   trackBank.addCanScrollTracksDownObserver(function(canScroll)
   {
      gridPage.canScrollTracksDown = canScroll;
   });

   trackBank.addCanScrollScenesUpObserver(function(canScroll)
   {
      gridPage.canScrollScenesUp = canScroll;
   });

   trackBank.addCanScrollScenesDownObserver(function(canScroll)
   {
      gridPage.canScrollScenesDown = canScroll;
   });
   
   // Cursor track allow selection of a track
   cursorTrack = host.createArrangerCursorTrack(0, 0);
   cursorTrack.addNoteObserver(seqPage.onNotePlay);
   cursorDevice = cursorTrack.createCursorDevice(); //primaryDevice
   cursorDevice.exists().markInterested(); 
   cursorDevice.getChannel().getSolo().markInterested(); 
   cursorDevice.getChannel().getMute().markInterested(); 
   remoteControls = cursorDevice.createCursorRemoteControlsPage(8);

   browser  = host.createPopupBrowser();
   resultColumn = browser.resultsColumn();
   cursorResult = resultColumn.createCursorItem();
   cursorResult.addValueObserver(100, "", getSelectedNameObserver() );
   cursorResultBank = resultColumn.createItemBank(1000);

   
   for (var t = 0;t<NUM_TRACKS;t++) {
      var track = trackBank.getChannel(t);
      trackEquality[t] = cursorTrack.createEqualsValue(track);
   
   }
   cursorDeviceBrowser = cursorDevice.createDeviceBrowser(4,4);//columns,results


  

   // cursorTrack.playingNotes().addValueObserver(function(notes) {
   //    activeNotes = notes;
   // });

   deviceBank = cursorTrack.createDeviceBank(1);
   //primaryDevice = deviceBank.getDevice(1);
   //println(primaryDevice);
    //isDrumMachine = primaryDevice.addNameObserver(10, "noDevice", blah);

   // Picks up the Master Track from Bitwig for use displaying the VuMeter
   masterTrack = host.createMasterTrack(0);
   masterTrack.addVuMeterObserver(8, -1, true, function(level)
   {
      masterVuMeter = level;
   });

   masterTrack.volume().value().markInterested();
   
   


   // Picks up the controllable knobs, buttons which have been set via "Learn Controller Assignment". There are 24 set here because there are 3 pages of user controls with 8 assignable controls on each
   userControls = host.createUserControls(24);

   for(var u=0; u<24; u++)
   {
      var control = userControls.getControl(u);

      control.addValueObserver(8, getTrackObserverFunc(u, userValue));
      control.setLabel("U" + (u+1));
   }


   cursorClip = host.createCursorClip(SEQ_BUFFER_STEPS, 128); // change to createLauncherCursorClip
   cursorClip.addStepDataObserver(seqPage.onStepExists);
   cursorClip.addPlayingStepObserver(seqPage.onStepPlay);
   cursorClip.scrollToKey(0);
   
   // Call resetdevice which clears all the lights
   resetDevice();
   setGridMappingMode();
   setActivePage(gridPage);

   updateNoteTranlationTable();
   updateVelocityTranslationTable();
   // Calls the function just below which displays the funky Bitwig logo, which ends the initialization stage 

   println("init complete. on grid page. type trace=1 to output trace info.")

   clear();

   host.scheduleTask(polledFunction,  10);
}

function polledFunction() {
  
  
  polledFunctionCounter = polledFunctionCounter  +1;
  if (trace>3) {
   if ((polledFunctionCounter%10) == 0) {
      println("polling");
   }
  }
   
 //println( "isRecording[0]="+isRecording[0] );
  timerState = timerState + 1;
  if (timerState > 3 ) {
     timerState = 0;
  }
  host.scheduleTask(polledFunction,  200);

  if (MUSICAL_STOP_STATE>0) { 
       println("Musical stop... ");
       MUSICAL_STOP_STATE = MUSICAL_STOP_STATE+1; 
       vol =  MasterTrackVolume - ( 0.05*MUSICAL_STOP_STATE);
        if (vol <0 ) { 
            vol = 0; 
         }
       setMasterVol(vol);
        
  }

  flush();


}

function clearMusicalStopState() {
   println("clearMusicalStopState");
   MUSICAL_STOP_STATE = 0;
   setMasterVol(MasterTrackVolume);
   masterTrack.mute().set(true);
}



// Function called on exit of the script
function exit()
{
   resetDevice();
}

// Reset all lights by sending MIDI and sets all values in the pendingLEDs array to 0
function resetDevice()
{  if (trace>0) {
   println("resetDevice");
  } 
   sendMidi(0xB0, 0, 0);

   for(var i=0; i<LED_COUNT; i++)
   {
      pendingLEDs[i] = 0;
      activeLEDs[i] = -1;
   }
   for(var i=0; i<80; i++)
   {
      isPlaying[i] = 0;
   }
  // flushLEDs();
}


function setGridMappingMode()
{
   sendMidi(0xB0, 0, 1);
}

function updateNoteTranlationTable()
{
   //println("updateNoteTranlationTable");
   var table = initArray(-1, 128);

   for(var i=0; i<128; i++)
   {
      var y = i >> 4;
      var x = i & 0xF;

      if (x < 8 && activePage.shouldKeyBeUsedForNoteInport(x, y))
      {
         table[i] = activeNoteMap.cellToKey(x, y);
      }
   }

   noteInput.setKeyTranslationTable(table);
}

function updateVelocityTranslationTable()
{
   var table = initArray(seqPage.velocity, 128);
   table[0] = 0;

   noteInput.setVelocityTranslationTable(table);
}
function sendRawMidi(status,data1,data2)
{
   noteInput.sendRawMidiEvent(status,data1,data2);
}

// cycle through modes in backward order
function previousMode() {
   //println("previousMOde");
   if (activePage == gridPage) {
      setActivePage(keysPage);
      showPopupNotification("Keys Mode");
   } else if (activePage==keysPage) {
      setActivePage(seqPage);
      showPopupNotification("Sequencer Mode");

   }
   else {
      setActivePage(gridPage);
      showPopupNotification("Grid/Keys Split Mode");
   } 
   activePage.updateOutputState();


   //  flushLEDs();

}

// cycle through modes in forward order
function nextMode() {
   //println("nextMode");
   if (activePage==seqPage) {
      setActivePage(keysPage);
      showPopupNotification("Keys Mode");
   } else if (activePage == gridPage ) {
      setActivePage(seqPage);
      showPopupNotification("Sequencer Mode");

   }
   else {
      setActivePage(gridPage);
      showPopupNotification("Grid/Keys Split Mode");
   } 
}

function RewindAndStopAllClips() {
   if (IS_SHIFT_PRESSED) {
      println("Rewind.");
      transport.rewind();
      println("Stop all clips.");
        for (track=0; track<NUM_TRACKS;track++) {
         var t = trackBank.getTrack(track);
         var l = t.getClipLauncherSlots();
         l.stop();
      }
      
   }

}

function PlayStop(isPressed)
{
   if (isPressed)
   {  
      if (IS_SHIFT_PRESSED && playing) {
         println("shift+play: musical stop");
         MUSICAL_STOP_STATE = 1;
         MasterTrackVolume = getMasterVol();

         return;
      }
      println("play="+playing);
      if (playing != 0) 
      {	
         transport.stop();
         showPopupNotification("Stop");
         
      }
      else
      {  
         
         if (IS_SHIFT_PRESSED) {
            println("Rewind.");
            transport.rewind();
         };
         showPopupNotification("Play");
         transport.play();
         masterTrack.mute().set(false);

      }
   }
   else
   {  if (MUSICAL_STOP_STATE>0) {
         transport.stop();
         RewindAndStopAllClips();
         host.scheduleTask(clearMusicalStopState,  2000);
      }
   }
}

function ModeAdvance(isPressed)
{
   if (isPressed)
   {  
     // VIEW
     
     view_shift = view_shift +1;
     if(view_shift>4) {
        view_shift=0;
     }

     gridPage.split = (view_shift>0);
     clear();
     
     showPopupNotification("KEYS PAGE "+(view_shift+1));
   }
   else
   {
      //view_shift=0;
   }
}

// This is the main function which runs whenever a MIDI signal is sent
// You can uncomment the printMIDI below to see the MIDI signals within Bitwigs Controller script console

function onMidi(status, data1, data2)
{
   if (trace>0){
	printMidi(status, data1, data2);
   }
   var channel = MIDIChannel(status);
   if (channel>5) {
      println("ignoring channel "+channel);
      return;
   }
   
   if ((status>=CC_MSG)&&(status<=CC_MSG2))
   {  

      if (trace>0){
       println("onMidi channel"+channel+" CC #"+data1+" : data2="+data2);
      }

      // isPressed checks whether MIDI signal is above 0 in value declaring that button is being pressed
      var isPressed = data2 > 0;

	  // This section changes the page within the script displayed on the device
	  // data1 is the CC, the CC values are defined within the launchpad_contants script and range from 104 to 111 for the topbuttons
     if ((status==CC_MSG2)&&(data1>=CCTransport.STOP)&&(data1<=CCTransport.SEND_B))
     {
         //println("more transport stuff... "+data1)
         switch(data1) {
            case CCTransport.STOP:
                  if (isPressed) { 
                        transport.stop();
                  }
                  showPopupNotification('Stop');
                  break;
            case CCTransport.RECORD:
                  transport.record();
                  break;
            case CCTransport.PLUS:
                  break;
            case CCTransport.RECORD_MODE:
                  break;         
            case CCTransport.SEND_A:
                  break;
            case CCTransport.SEND_B:
                  break;
            // the device  mixer knob icon in the app opens a panel in the app and doesnt send a cc.      

         }

     }
     else if ((status==CC_MSG)&&IsRightSideButton(data1))
     {
        row = data1-1;
        activePage.onRightSideButton(row, data2 > 0);
     }

     else if ((status==CC_MSG)&&IsMixerButton(data1))
     {
        row = GRID_NOTE_ROWS-Math.floor(data1/GRID_COL_MOD);
         println(" midi SCENE button # " + row + " via CC "+data1);

        
        activePage.onSceneButton(row, data2 > 0);
     }
     else if (status==CC_MSG)
     switch(data1)
      {
         case CCTransport.PLAY:
            if (isPressed) {
               if (playing==0) {
                  transport.play();
                  showPopupNotification('Play');
               }
            }
            break;
         case TopButton.CURSOR_UP:
            activePage.onUp(isPressed);
            
            break;
         case TopButton.CURSOR_DOWN:
             activePage.onDown(isPressed);
            break;

         case TopButton.CURSOR_LEFT:
            activePage.CursorLeft(isPressed);
            break;

         case TopButton.CURSOR_RIGHT:
            activePage.CursorRight(isPressed);
            break;
	
         case TopButton.SESSION:
            activePage.onSession(isPressed); 
            // isSetPressed  = isPressed;
            // if (isSetPressed)
            // { 
            //    println("[META] Pressed");
            // } 
            // else
            // { 
            //    println("[META] Release");
            // }

            break;

         case TopButton.USER1:
           
                println("USER1/MIX");
         
                activePage.onUser1(isPressed);
                if(IS_KEYS_PRESSED)
                {
                    IS_KEYS_PRESSED=false;
                }

            break;

         case TopButton.USER2:
            activePage.onUser2(isPressed);

            break;

         case TopButton.MIXER:
            activePage.onShift(isPressed);
                if (isPressed)
                { if (trace>0) {
                   println("shift ON");
                  }

                    IS_SHIFT_PRESSED = true;
                }
                else
                {
                    if(IS_SHIFT_PRESSED)
                    {  if (trace>0) {
                     println("shift OFF");
                    }
  
                        IS_SHIFT_PRESSED=false;
                    }
                }
            break;
      }
   }

   if ((isNoteOn(status) || isNoteOff(status, data2))&&(data1>=GRID_NOTE_MIN))
   {
      var row = Math.floor(data1/GRID_COL_MOD); 
      row = GRID_NOTE_ROWS-row;
      var column = (data1 % GRID_COL_MOD)-1;
         
      println("  row = " + row + "col = " + column)   
      if ((row>=0)&&(row < GRID_NOTE_ROWS))
      {
         
         if (trace>0) {
            println(" Midi GRID note  row = " + row + "col = " + column)
            }
           
         activePage.onGridButton(row, column, data2 > 0);
      }
    
   }
}

function FlashColor(col1,col2) {
   return (timerState<2) ? col1 : col2;
}
// Clears all the lights
function clear()
{
   for(var i=0; i<LED_COUNT; i++)
   {
      pendingLEDs[i] = 0;// Colour.OFF; 
      activeLEDs[i] = -1;
   }


}

function setAllPrimaryPads(colour) 
{
   for (var c=0;c<GRID_NOTE_ROWS;c++) //
   for (var r=0;r<GRID_NOTE_ROWS;r++) // GRID_NOTE_ROWS
      setCellLED(c,r, colour );
}

function setAllPrimaryPadsTest() 
{
   println("setAllPrimaryPadsTest");

   for(var i=0; i<LED_COUNT; i++)
   {
      pendingLEDs[i] = Colour.OFF; 
      activeLEDs[i] = -2;
      
   }
 //  pendingLEDs[LEFT_PAD_LED(0)] = Colour.LIME_FULL;
 //  pendingLEDs[SCENE_LED(0)] = Colour.ORANGE2;// FlashColor(Colour.ORANGE,Colour.ORANGE_LOW);
//
//   pendingLEDs[SCENE_LED(1)] = FlashColor(Colour.ORANGE2, Colour.ORANGE_FULL);
 
 for (i=0;i<8;i++) {
   setTopLED(i, COLOUR_ANIMATE_RGB[i] );
   setSceneLEDColor( i,COLOUR_ANIMATE_RGB[i+2]);
   setLeftLED(i,COLOUR_ANIMATE_RGB[i+1])

 }
 


   for (var c=0;c<GRID_NOTE_ROWS;c++) //
   {
    //  var colour = Math.floor(Math.random()*115)+1;
      for (var r=0;r<GRID_NOTE_ROWS;r++) // GRID_NOTE_ROWS 
      {  var colour = COLOUR_ANIMATE_RGB[ (timerState+c) % 8 ];
         setCellLED(c,r, colour );
      }
   }

}


function flush()
{
    if (dancing_leds) {
      setAllPrimaryPadsTest()
    }
    else{
    activePage.updateOutputState(); // // set LED state vars
   }

   //setCellLED(0,0, Colour.RED_FLASHING);
   //pendingLEDs[50] = 22;
   //pendingLEDs[144] = 51;
   // 33 bright green
   // 99 amber
   // 1 pale gray
   // 41 bright blue


   flushLEDs();
}



// Sends the Top LED lights to the pendingLEDs array. LED top have a value of 72 to 80
function setTopLED(index, colour)
{
   pendingLEDs[TOP_LED(index)] = colour;
}

function setLeftLED(index, colour)
{
   pendingLEDs[LEFT_PAD_LED(index)] = colour;
}

// Sends the right LED lights to the pendingLEDs array. LED scene have a value of 64 to 72
function setSceneLEDColor(index, colour)
{
   pendingLEDs[SCENE_LED(index)] = colour;
}


// Sends the main pads to the pendingLEDs array. LED scene have a value of 0 to 63
function setCellLED(column, row, colour)
{
   var key = ( (8-row) * GRID_COL_MOD) + column +1;

   pendingLEDs[key] = colour;
   if (trace>3) {
      println( " setCellLED col "+column+", row="+row+" = colour:"+colour+":  index "+key);
   }

}

function setCellLED2(track, colour)
{
   var key = track;

   pendingLEDs[key] = colour;
}
/** Cache for LEDs needing to be updated, which is used so we can determine if we want to send the LEDs using the
 * optimized approach or not, and to send only the LEDs that has changed.
 */
 
 // arrays of 80 buttons, the main 64 pads and the 8 at the top and 8 at side. Pending is used for lights to be sent, active contains the lights already on

var pendingLEDs = new Array(LED_COUNT);
var activeLEDs = new Array(LED_COUNT);

// This function compares the LEDs in pending to those in active and if there is a difference it will send them via MIDI message
// If there is more than 30 lights changed it sends the MIDI in a single message ("optimized mode") rather than individually
function flushLEDs()
{

   if (trace>8) {
      println("flushLEDs called");
   };

	// changedCount contains number of lights changed
   var changedCount = 0;

   // count the number of LEDs that are going to be changed by comparing pendingLEDs to activeLEDs array
   for(var i=0; i<LED_COUNT; i++)
   {
      if (trace>2) {
         if (pendingLEDs[i] != 0) {
            println("pendingLEDs["+i+"] = "+pendingLEDs[i])
         }
      }
      if (pendingLEDs[i] != activeLEDs[i]) changedCount++;
   }

   // exit function if there are none to be changed
   if (changedCount == 0) return;

   
   if (trace>0) {
      println("flushLEDs active. changedCount "+changedCount);
   };


   // var colour = 22;
   // for (var byte=0;byte<99;byte++) {
   //    sendMidi(0x90, byte, colour);
   // }


   for(var i = 0; i<LED_COUNT; i++)
   {
      if (pendingLEDs[i] != activeLEDs[i])
      {
         activeLEDs[i] = pendingLEDs[i];

         var colour = activeLEDs[i];
         var byte = i;
         if (colour>127) {
            colour=127;
         }
         if (colour<=0) {
            colour=0;
         }
         sendMidi(0x90, byte, colour);
    
         //    sendMidi(0xB0, 104 + (i - 72), colour);
         
      }
   }


}

// This function is not called anywhere within the rest of the Launchpad script. textToPattern sounds like it may have been the start of displaying text on the Launchpad, or could be left from another script for another device.

/* Format text into a bit pattern that can be displayed on 4-pixels height */

function textToPattern(text)
{
   var result = [];

   for(var i=0; i<text.length; i++)
   {
      if (i != 0) result.push(0x0); // mandatory spacing

      switch (text.charAt(i))
      {
         case '0':
            result.push(0x6, 0x9, 0x6);
            break;

         case '1':
            result.push(0x4, 0xF);
            break;

         case '2':
            result.push(0x5, 0xB, 0x5);
            break;

         case '3':
            result.push(0x9, 0x9, 0x6);
            break;

         case '4':
            result.push(0xE, 0x3, 0x2);
            break;
      }
   }

   return result;
}
