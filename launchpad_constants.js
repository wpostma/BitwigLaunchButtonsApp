var LED_COUNT = 100;

var NOTE_ON = 144; // + channel.
var NOTE_OFF = 128;

var CC_MSG =  176; // + midi channel.
var CC_MSG2 =  180; // launchbuttons transport midi channel offset

var GRID_NOTE_MAX=90;
var GRID_NOTE_MIN=10;
var GRID_NOTE_ROWS = 8;
var GRID_NOTE_COLS = 8;
var GRID_COL_MOD = 10;

/*

LAUNCHBUTTONS GRID MIDI Notes:

 MIDI NOTE 11 - bottom left note
 ...
 MIDI NOTE 88 - top right note
 
 TOP ROW BUTTONS:
 CC 91,92,93,94,95,96,97,98

LEFT SIDE CC BUTTONS TOP TO BOTTOM:
CC 80,70,60,50,40,30,20,10

RIGHT SIDECC BUTTONS WITH PLAY ARROWS: (SCENE LAUNCH,MIXER BUTTONS)
CC 89,79,69,59,49,39,29,19

RIGHT SIDE BLUE BUTTONS NO ARROWS:
CC 1,2,3,4,5,6,7,8

*/

// CCs for the Top buttons
var TopButton =
{
   CURSOR_UP:    91,
   CURSOR_DOWN:  92,
   CURSOR_LEFT:  93,
   CURSOR_RIGHT: 94,
   SESSION:      95,
   USER1:        96,
   USER2:        97,
   MIXER:        98
};

// CCs for the ScenePlay/Mixer Buttons (right side scene launching, also for clip launching)
var MixerButton =
{
   VOLUME:  89,
   PAN:     79,
   SEND_A:  69,
   SEND_B:  59,
   STOP:    49,
   TRK_ON:  39,
   SOLO:    29,
   ARM:     19
};

var CCRightSideFirst = 1; // via CC_MSG;
var CCRightSideLast = 8;


function IsRightSideButton(index) {
   return (index>=CCRightSideFirst)&&(index<=CCRightSideLast);
}

var CCTransport = 
{
   PLAY:116, // via CC_MSG,
   STOP:        94, // via CC_MSG2..
   RECORD:      95,
   PLUS:        96,
   RECORD_MODE: 97, // not sure what this icon means, it's a filled circle and a circle outline overlapping 
   SEND_A:      98,
   SEND_B:      99
}

// Called the scripts mainly within launchpad_grid
// It is used for the Bitwig logo and the VUmeter
function mixColour(red, green, blink)
{
   return (blink ? 8 : 12) | red | (green * 16);
}

// Defines the values to be sent for the colours
var Colour = // Novation are from the UK
{  UNUSED:-1,
   
   OFF:0, // was 12
   BLACK:0,
   DARK_GRAY:1,
   LIGHT_GRAY:2,
   WHITE:3,

   PEACH:4,
   RED_FULL:5,
   RED_MEDIUM:6,
   RED_LOW:7,

   BEIGE:8,
   AMBER_FULL:9,
   AMBER_MEDIUM:10,
   AMBER_LOW:11,

   LIGHT_YELLOW_FULL:12,
   YELLOW_FULL: 13,
   YELLOW_MEDIUM: 14,
   YELLOW_LOW: 15, // ???ugly???

   LIGHT_GREEN_FULL:16,
   GREEN_FULL:17,
   GREEN_MEDIUM:18,
   GREEN_LOW:19,
    //20-23,24-27,27-31 more indeterminate greens
   LIME_FULL:21,

   BLUE_GREEN_FULL:32,
   BLUE_GREEN_MEDIUM:33,
   BLUE_GREEN_MEDIUM2:34,
   BLUE_GREEN_LOW:35,

   SKY_BLUE_FULL:36,
   SKY_BLUE_MEDIUM:37,
   SKY_BLUE_MEDIUM2:38,
   SKY_BLUE_LOW:39,

   ROYAL_BLUE_FULL:40,
   ROYAL_BLUE_MEDIUM:41,
   ROYAL_BLUE_MEDIUM2:42,
   ROYAL_BLUE_LOW:43,
   //44-47 : more blue
   BLUE:44,

   PURPLE_FULL:48,
   PURPLE_MEDIUM:49,
   DEEP_BLUE:50,
   PURPLE_LOW:51,

   FUCHSIA_FULL:52,
   FUCHSIA_MEDIUM:53,
   FUCHSIA_MEDIUM2:54,
   FUCHSIA_LOW:55,

   ROSE_FULL:56,
   ROSE_MEDIUM:57,
   ROSE_MEDIUM2:58,
   ROSE_LOW:59,

   ORANGE:107,
   
   FOREST_GREEN:63,
   PURPLE:81,
   RASPBERRY:82,
   BROWN:83,
   ORANGE2:84,


   INDIGO:52

   
   // RED_FLASHING:11,
   // AMBER_FLASHING:59,
   // YELLOW_FLASHING:58,
   // GREEN_FLASHING:56
};

var COLOUR_ANIMATE_PULSE = [
   Colour.OFF,
   Colour.DARK_GRAY,
   Colour.LIGHT_GRAY,
   Colour.WHITE,
   Colour.WHITE,
   Colour.LIGHT_GRAY,
   Colour.DARK_GRAY,
   Colour.OFF

   
];
var COLOUR_ANIMATE_RGB = [
   Colour.RED_FULL, 
   Colour.ROSE_MEDIUM,
   Colour.ORANGE,
   Colour.YELLOW_FULL,
   Colour.GREEN_FULL,
   Colour.BLUE_GREEN_LOW,
   Colour.BLUE,
   Colour.FUCHSIA_LOW,
   Colour.INDIGO,
   Colour.PURPLE
];


// TRACK COLORS constants
const RGB_COLORS =
[
    [ 0.3294117748737335 , 0.3294117748737335 , 0.3294117748737335 , "Dark Gray"],
    [ 0.47843137383461   , 0.47843137383461   , 0.47843137383461   , "Gray"],
    [ 0.7882353067398071 , 0.7882353067398071 , 0.7882353067398071 , "Light Gray"],
    [ 0.5254902243614197 , 0.5372549295425415 , 0.6745098233222961 , "Silver"],
    [ 0.6392157077789307 , 0.4745098054409027 , 0.26274511218070984, "Dark Brown"],
    [ 0.7764706015586853 , 0.6235294342041016 , 0.43921568989753723, "Brown"],
    [ 0.34117648005485535, 0.3803921639919281 , 0.7764706015586853 , "Dark Blue"],
    [ 0.5176470875740051 , 0.5411764979362488 , 0.8784313797950745 , "Purplish Blue"],
    [ 0.5843137502670288 , 0.2862745225429535 , 0.7960784435272217 , "Purple"],
    [ 0.8509804010391235 , 0.21960784494876862, 0.4431372582912445 , "Pink"],
    [ 0.8509804010391235 , 0.18039216101169586, 0.1411764770746231 , "Red"],
    [ 1                  , 0.34117648005485535, 0.0235294122248888 , "Orange"],
    [ 0.8509804010391235 , 0.615686297416687  , 0.062745101749897  , "Light Orange"],
    [ 0.45098039507865906, 0.5960784554481506 , 0.0784313753247261 , "Green"],
    [ 0                  , 0.615686297416687  , 0.27843138575553894, "Cold Green"],
    [ 0                  , 0.6509804129600525 , 0.5803921818733215 , "Bluish Green"],
    [ 0                  , 0.6000000238418579 , 0.8509804010391235 , "Blue"],
    [ 0.7372549176216125 , 0.4627451002597809 , 0.9411764740943909 , "Light Purple"],
    [ 0.8823529481887817 , 0.4000000059604645 , 0.5686274766921997 , "Light Pink"],
    [ 0.9254902005195618 , 0.3803921639919281 , 0.34117648005485535, "Skin"],
    [ 1                  , 0.5137255191802979 , 0.24313725531101227, "Redish Brown"],
    [ 0.8941176533699036 , 0.7176470756530762 , 0.30588236451148987, "Light Brown"],
    [ 0.6274510025978088 , 0.7529411911964417 , 0.2980392277240753 , "Light Green"],
    [ 0.24313725531101227, 0.7333333492279053 , 0.3843137323856354 , "Grass Green"],
    [ 0.26274511218070984, 0.8235294222831726 , 0.7254902124404907 , "Light Blue"],
    [ 0.2666666805744171 , 0.7843137383460999 , 1                  , "Greenish Blue"],
];

// defines the LED locations with the pending and active LED arrays for the lights
// They are used in the format LED.SCENE
var LED =
{
   
   CURSOR_UP:0,  //top button 1
   CURSOR_DOWN:0, //top button 2
   CURSOR_LEFT:0, //top button 3
   CURSOR_RIGHT:0, //top button 4
   SESSION:0,  //top button 5
   USER1:48,   //top button 6
   USER2:49,   //top button 7
   MIXER:50,   //top button 8

   VOLUME:0,
   PAN:1,
   SEND_A:2,
   SEND_B:3,
   STOP:4,
   TRK_ON:5,
   SOLO:6,
   ARM:7
};

// Number of tracks, sends and scenes, they are called from the Launchpad.control.js file only during the init() function
var NUM_TRACKS = 40;
var NUM_SENDS = 2;
var NUM_SCENES = 8;
var NUM_EFFECT_TRACKS = 1;
var NUM_EFFECT_SCENES = 1;

//new global variables
var mixerButtonToggle = false;
var mixerDetailMode = false;
var armedToggle = false;
var sessionButtonToggle = false;
var seqPageDrumMode = false;
var seqPageNoteMode = false;
var sendNumber = 0;
var setPan = 0;
var undo1 = false;

// functional constants. row is zero based (0..7)
function LEFT_PAD_LED(row) {
   return 10*((7-row)+1);
}
// right side buttons with play icons are scene launchers. these are the leds.
function SCENE_LED(row) {
   return (10*((7-row)+1))+9;
}

function TOP_LED(index) {
   return 91+index;
}

function IsMixerButton(index) {
   return (index>=MixerButton.ARM)&&(index<=MixerButton.VOLUME)&&((index % 10)==9);
}

