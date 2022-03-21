
/*
*  GRID PAGE
*
*  Originally this was an 8 scene x 8 track clip launcher grid.
*
*  Warren's version, top half is a clip launcher grid for four tracks.
*  Bottom half is a keyboard note or midi CC transmitter.
*  The Down arrow changes which bank of keys or midi CC notes are sent.
*  The color of the bottom half of the page was red when Warren took over this copy of this script.
*  Eventually Warren wants to make the bottom half very dynamically colored.
*
* 
* */






gridPage = new Page();

gridPage.mixerAlignedGrid = true;
gridPage.canScrollTracksUp = false;
gridPage.canScrollTracksDown = false;
gridPage.canScrollScenesUp = false;
gridPage.canScrollScenesDown = false;
gridPage.title = "Clip Launcher";
gridPage.currentVelocity = 127;
gridPage.split = false;
gridPage.grid_shift=0; //0,4,8,12
gridPage.scene_active = -1; // no active scene
gridPage.armed_track = -1;
gridPage.canCycle = false; // parameter pages : cycle when reach end? 
gridPage.PressedCol = -1;
gridPage.PressedRow = -1;





ARMED=false;




gridPage.nextPreset = function()
{  println("next preset");
	//cursorDevice.switchToNextPreset(); // use browser instead
	browser.selectNextFile();
};

gridPage.previousPreset = function()
{   println("previous preset");
	//cursorDevice.switchToPreviousPreset(); // use browser instead
	browser.selectPreviousFile();
};
 
gridPage.nextParameterPage = function()
{  println("next parameter page");
   remoteControls.selectNextPage(gridPage.canCycle); // replaces CursorTrack.nextParameterPage() which is DEPRECATED but not documented as such.
};

gridPage.previousParameterPage= function()
{   println("previous param page");
	remoteControls.selectPreviousPage(gridPage.canCycle); // replaces CursorTrack.previousParameterPage() which is DEPRECATED but not documented as such.
};
 


gridPage.previousDevice = function()
{
	cursorDevice.selectPrevious();
	
};

gridPage.nextDevice = function()
{
	cursorDevice.selectNext();
};

gridPage.CursorLeft = function(isPressed)
{
	if (isPressed) {
		gridPage.grid_shift = gridPage.grid_shift - 2;
		if (gridPage.grid_shift<0) {
			gridPage.grid_shift = 4;
		}
		
		showPopupNotification('Grid +'+gridPage.grid_shift);;
	}
}


gridPage.CursorRight = function(isPressed)
{
	if (isPressed) {
		gridPage.grid_shift = gridPage.grid_shift +2;
		if (gridPage.grid_shift>4) {
			gridPage.grid_shift =0;
		}
		showPopupNotification('Grid +'+gridPage.grid_shift);
	}
	
}

gridPage.ChangeVelocity = function()
{
	gridPage.currentVelocity = gridPage.currentVelocity + 40;
	if  (gridPage.currentVelocity>=128 ) {
		gridPage.currentVelocity = 40;
	}
	if (gridPage.currentVelocity>=119) {
		gridPage.currentVelocity = 127;
	}
	showPopupNotification("Velocity "+gridPage.currentVelocity);
}

gridPage.updateOutputState = function()
{
   //clear(); // its problematic to do this.


   
   this.updateGrid();
   var c = Colour.OFF;
   var cls1 = ((WRITEOVR) ? [Colour.RED_FLASHING,Colour.RED_FULL]:[Colour.RED_FLASHING,Colour.YELLOW_FULL]); 
   var cls2 = ((WRITEOVR) ? [Colour.RED_FLASHING,Colour.RED_FULL]:[Colour.BLUE,Colour.RED_FULL]);  
   // Set the top LEDs while in Clip Launcher
   clipActive = transport.isPlaying().get();

   setTopLED(0,  clipActive ? Colour.GREEN_FULL : Colour.GREEN_LOW );


	setTopLED(1,  ViewShiftColour(view_shift) ); // same color as the bottom half of the grid when split
  
	setTopLED(2, Colour.ROSE_FULL);
	setTopLED(3, Colour.ROSE_FULL);
	setTopLED(4, Colour.ORANGE);

   setTopLED(5, IS_SHIFT_PRESSED ? Colour.BLUE_GREEN_FULL : Colour.ORANGE  ); 
   setTopLED(6, IS_SHIFT_PRESSED ? Colour.SKY_BLUE_FULL   : Colour.BLUE);
   setTopLED(7, IS_SHIFT_PRESSED ? Colour.AMBER_FULL      : Colour.YELLOW_FULL);
   
  
};

gridPage.onSession = function(isPressed)
{   
    
    if(TEMPMODE == TempMode.OFF && !IS_GRID_PRESSED)
    {
        if(IS_SHIFT_PRESSED)
            {
            application.undo();
            host.showPopupNotification("Undo");
            return;
            }
        else
        {
        this.mixerAlignedGrid = !this.mixerAlignedGrid;
          
	          if(this.mixerAlignedGrid)
              {
              application.setPerspective('MIX');
		      }
	          if(this.mixerAlignedGrid == false)
              {
	          application.setPerspective('ARRANGE');
		      }
          
              host.showPopupNotification("Orientation: " + (this.mixerAlignedGrid ? "Mix" : "Arranger"));
        }

    }
}

function doqset(q)
{
	showPopupNotification("Loop Quantize: "+q);
	quant.set(q);
}

gridPage.SetQuantNext = function()
{
	q = quant.get();
	//println("quant="+q);

	if (q == "1/4" ) {
		doqset("1/2");
	}
	else if (q== "1/2") {
		doqset("1");
	}
	else if (q== "1") {
		doqset("2");
	}
	else if (q== "2") {
		doqset("4");
	}
	else if (q== "4") {
		doqset("1/4");
	}
	else {
		doqset("1/4");
	}
	
	gridPage.updateGrid();
	flushLEDs();
	

}

gridPage.cursorDeviceReplace = function()
{
	if (cursorDevice.exists().get()) {
		cursorDevice.browseToReplaceDevice();
	} else {
		cursorDevice.browseToInsertAtStartOfChain();
	}
}

gridPage.onRightSideButton = function(row,isPressed)
{
	// 
	if (isPressed) {
		println("onRightSideButton "+row);
	}
}
// SIDE BUTTONS:
//   TVbene: side buttons select post record delay and launch quantization
gridPage.onSceneButton = function(row, isPressed)
{
	var maxrow = 8;
	if (!gridPage.split) {
		maxrow = 4;
	}

   if (isPressed)
   {
	   if (row<maxrow) {
		// top half is like ableton live launchpad, launches a scene.
		masterTrack.mute().set(false);
		scene = row+gridPage.grid_shift;
		//println("scene="+scene);
		sceneBank.getScene(scene).launch();
		gridPage.scene_active = scene; 
	   }
	   else
     switch(row)
      {   
		  	case MixerButton.STOP:
				if (IS_SHIFT_PRESSED) {
					gridPage.previousParameterPage();
				} else {
				   gridPage.nextParameterPage();
				}
			   
			  break;
         case MixerButton.TRK_ON: 
		 	if (IS_SHIFT_PRESSED) {
				 gridPage.previousDevice();
			 } else {
				gridPage.nextDevice();
			 }
            break;

         case MixerButton.SOLO:
			if (isSetPressed) {
				isSolo =  cursorDevice.getChannel().getSolo().get(); 
				cursorDevice.getChannel().getSolo().set( !isSolo );
				if (!isSolo) {
					cursorDevice.getChannel().getMute().set(false);
					showPopupNotification("SOLO");
				} else {
					showPopupNotification("SOLO Off");
				}


			} else if (IS_SHIFT_PRESSED) {
				isMute =  cursorDevice.getChannel().getMute().get(); 
				cursorDevice.getChannel().getMute().set( !isMute );
				if (!isMute) {
					cursorDevice.getChannel().getSolo().set( false );
					showPopupNotification("MUTE");
				} else {
					showPopupNotification("MUTE Off");
				}
			} 
			else {
				println("Change Keys velocity");
		    	gridPage.ChangeVelocity();
			}
            break;

         case MixerButton.ARM:
			if (isSetPressed) {
				gridPage.cursorDeviceReplace();

			} else if (IS_SHIFT_PRESSED) {
				// you can create a track given any known bitwig device name or plugin name
				createSpecialTrack('Drum Machine');
			} else {
				gridPage.SetQuantNext();
			}
			break;

      }
   }
};






gridPage.onUser1 = function(isPressed)
{
	if (isPressed) {
		if (isSetPressed) {
			gridPage.previousPreset();

		} else if (IS_SHIFT_PRESSED) {
		
		} else {
			
		}
	}
   
}

gridPage.onUser2 = function(isPressed)
{
	if (isPressed) {
		if (isSetPressed) {
			gridPage.nextPreset();

		} else if (IS_SHIFT_PRESSED) {
		
		} else {
			// browser.startBrowsing(); no worky.
		}
	}
}

// This detects when the Mixer button is pressed and changes the orientation identifier mixerAlignedGrid and displays the text popup
gridPage.onShift = function(isPressed)
{
   
    if(ARMED > 0)
    {
    ARMED = 0;
    return;
    }

}




REFROW=false;
ROWARM=false;

var BASE_NOTE = 36; // C2=36
var NOTE_PAGE_SIZE = 24;
var BASE_NOTES = [36,12,48,96];

gridPage.doGridNoteOrCCButton = function(row,column,pressed)
{
	var rowInvert = 3 - (row-4);
	var baseNoteNo = BASE_NOTES[view_shift];

	if (pressed) {
		gridPage.PressedRow = row;
		gridPage.PressedCol = column;
	} else {
		gridPage.PressedRow = -1;
		gridPage.PressedCol = -1;
	
	}
	
	var channel = 0;
	
	if (rowInvert<0 ) {
		rowInvert = 0;
	}
	var noteIndex = baseNoteNo+ ((rowInvert)*8)+column;

	if (noteIndex<0) {
		noteIndex = 0;
	};
	
	if (noteIndex<=108)
	{
		//println("doGridNoteOrCCButton A");
	    if (noteIndex==108)  {
			noteIndex = 36;
		} else if (noteIndex==107)  {
			noteIndex = 0;
		};

		if (noteIndex>=0) {
			if (pressed) {
					
				if (trace>0) {
					println("gridPage: MIDI NOTE "+noteIndex+" for controls page "+view_shift);
				}
				
				noteInput.sendRawMidiEvent(NOTE_ON+channel, noteIndex, gridPage.currentVelocity );
			}
			else {	
				noteInput.sendRawMidiEvent(NOTE_OFF+channel, noteIndex, 0);
			};
			}
	}
	else
	{
	  // println("doGridNoteOrCCButton B");
	
		//noteIndex = 108;
		ccIndex = noteIndex-88;
		if (trace>0) {
		println("Midi CC "+ccIndex);
		}
		noteInput.sendRawMidiEvent(CC_MSG+channel, /*data1*/ccIndex, /*data2*/pressed ? 127 : 0 );
        noteIndex = -1;
	};


};

// record clips and play them.
gridPage.onGridButton = function(row, column, pressed)
{
	// Warren adapted to split into a 4 track, 8 scene clip launcher with 4 rows of 8 midi cc and note buttons
    if (trace>0) {
			 println("gridPage.onGridButton row "+row+" column "+column+" pressed "+pressed );
	}

	if ((row < 4)||(!gridPage.split)) 
	{
		var track = column;
		var scene =  row+gridPage.grid_shift;
		//println("scene "+scene);
	
			
		var t = trackBank.getChannel(track);
		var l = t.getClipLauncherSlots();
			

		if (pressed) {

				if (gridPage.armed_track>=0) {
					//println("darm");
					trackBank.getChannel(gridPage.armed_track).arm().set(false);
					//println("darm2");
				}
				
				trackBank.scrollToChannel(track);
				trackBank.getChannel(track).arm().set(true);
				//println("arm");
				gridPage.armed_track = track;
				//println("arm2");

				if (IS_SHIFT_PRESSED) {
					println("clear scene");
					l.deleteClip(scene);
					
					showPopupNotification('Delete Clip '+(scene+1))
				}
				//if(isPlaying[column+8*scene] > 0)
				if(  getPlaying(scene,column) )
				{	
					if (!IS_SHIFT_PRESSED) {
						println("stop track "+(track+1) +" clip "+(scene+1));				
						l.stop();
					}

				}
				else
				{  
					masterTrack.mute().set(false);
					if ((scene>=0)&&(scene<=7)) {
						println("launch track "+(track+1)+" clip "+(scene+1));
						l.launch(scene);
					} else {
						println("launch track "+(track+1)+" clip "+(scene+1)+" ? ");
						
					}

				}
		}

	}
	else if ((row >= maxrow)&&(gridPage.split)) 
	{
		println("split_playable_key");

		gridPage.doGridNoteOrCCButton(row,column,pressed);
		

	}


};

function setTopSplitGridColour(colour) 
{
   for (var c=0;c<8;c++) //
   for (var r=0;r<4;r++) // GRID_NOTE_ROWS
      setCellLED(c,r, colour );
}
function setBottomSplitGridColour(colour) 
{
   for (var c=0;c<8;c++) //
   for (var r=4;r<8;r++) // GRID_NOTE_ROWS
      setCellLED(c,r, colour );
}

// updates the grid (no more vumeter feature)
gridPage.updateGrid = function()
{
	//println("grid update");
	var maxrow = 8;// split
	if (gridPage.split) {
		maxrow = 4;
		if (playing)
			setTopSplitGridColour(Colour.OFF)
		else
			setTopSplitGridColour(Colour.DARK_GRAY);

		if 	((gridPage.PressedRow >=0)&&(gridPage.PressedCol>=0)) {
			setCellLED(gridPage.PressedCol,gridPage.PressedRow, Colour.WHITE)
		}
		setBottomSplitGridColour(ViewShiftColour(view_shift));
		
	}
	else {
		if (playing) {
			setAllPrimaryPads( Colour.OFF);
		} 
		else {
			setAllPrimaryPads( Colour.DARK_GRAY);
		}
	}


//	
	

	
		
	

	// clip status color set
	 for(var col=0; col<8; col++)
	 {
		
		active = trackBank.getChannel(col).isActivated().get();
		selected = active && trackEquality[col].get();
	
	 	this.updateTrackValue(maxrow,col,active,selected); // one column of grid
	 }



   this.updateSideButtons(); // right side buttons.

   // todo left side buttons.

   
};

// sets the colours for the VUmeters
// calls the mixColour function within the launchpad_constants.js script
function vuLevelColor(level)
{
   switch (level)
   {
      case 1:
         return mixColour(0, 1, false);

      case 2:
         return mixColour(0, 2, false);

      case 3:
         return mixColour(0, 3, false);

      case 4:
         return mixColour(2, 3, false);

      case 5:
         return mixColour(3, 3, false);

      case 6:
         return mixColour(3, 2, false);

      case 7:
         return mixColour(3, 0, false);
   }

   return Colour.OFF;
}


function getClipsPlaying(scene) {
	n = false;
	for (track = 0; track < NUM_TRACKS;track++) {	
		if (isPlaying[track + (scene*8)]) {
			n = true;
			break;
		}
	}
	return n;
}

// updates side buttons but no longer actually updates the vu meter.
// first four buttons are play stop and last four are command buttons.
gridPage.updateSideButtons  = function()
{
  //println("updateSideButtons");
  	var val = null;
	var offsetFormatted = offset.getFormatted();
	var quantValue = quant.get();

	var alt = Colour.GREEN_LOW;



	// last three scene LEDs are for various status flags
	if (IS_SHIFT_PRESSED ) {
		for(var j=0; j<4; j++)
			{
			
			setSceneLEDColor(j, Colour.YELLOW_LOW);
			}
	
		for(var j=4; j<8; j++)
			{
			
			setSceneLEDColor(j, Colour.AMBER_FULL);
			}
	}
	else {
		for(var j=0; j<4; j++)
		{
			scenePlaying = playing && ( j+gridPage.grid_shift == gridPage.scene_active );
		   if ((scenePlaying) && (timerState==0)) {
			setSceneLEDColor(j,  Colour.OFF );
		   } 
		   else 
		   {
			
				if (( gridPage.grid_shift==2)&&(j==1)) {
					alt = Colour.OFF;
				} 
				else if (( gridPage.grid_shift==4)&&(j==3)) {
					alt = Colour.OFF;
				}
				else
					alt = Colour.GREEN_LOW;
				
				setSceneLEDColor(j, scenePlaying ? Colour.GREEN_FULL : alt );
		   }
		 
		}

		setSceneLEDColor(4, Colour.YELLOW_LOW);
		setSceneLEDColor(5, Colour.YELLOW_FULL);
		setSceneLEDColor(6, Colour.RED_LOW);
		setSceneLEDColor(6, Colour.GREEN_LOW);
		
	
	}
	

	
   
};


// track = column
gridPage.updateTrackValue = function(maxrow,track,active,selected)
{
	//println("updateTrack "+track);
	track_offset = track;

	
	//selected = active && trackEquality[track_offset].get();
	//println("selected "+selected);
	
	tplay = transport.isPlaying().get();

	//println("active "+active);

	// scenes are ROWS in the launchpad in this script. 
	for(var scene=0; scene<maxrow; scene++)
	{
		var i = track_offset + ((scene+gridPage.grid_shift) *8);

		var col = Colour.OFF;
		var fullval = mute[track_offset] ? 1 : 3;
	
			 
	
		
		 if (hasContent[i] > 0)
		 { 
			if ((isQueued[i] > 0)&&(tplay))
			{ // about to play
				if ( (timerState < 2 ) ||  !transport.isPlaying()  )  {
				col = Colour.GREEN_FULL;
			   } else if (timerState==1) {
				   col = Colour.YELLOW_FULL;
			   };	
			}
			else if ((isRecording[i] > 0)&&tplay)
			{
				 // what about about to record?
				if (timerState==0 ) {
			     col = Colour.RED_FULL;
				} else if (timerState==1) {
					col = Colour.RED_LOW ;
				};
			}
			else if ((isStopQueued[i] > 0)&&tplay)
			{ // about to stop
				if (timerState==0 ) {
					col = Colour.YELLOW_FULL;
				   } else if (timerState==1) {
					   col = Colour.RED_LOW ;
				   };	
			}
			else if (isPlaying[i] > 0)
			{
			
				if  ((timerState < 2 )||(!tplay))  {
					col = Colour.GREEN_FULL;
				   } else  {
					
											
					   col = Colour.GREEN_LOW;
					
				   };	
			}
			else
			{
			   col = Colour.GREEN_LOW; // clip exists, not playing. 
			}
		}
		else
			col = -1;
		

		if (col>=0) {
		 setCellLED(track, scene, col);
		}

	}
	
};
