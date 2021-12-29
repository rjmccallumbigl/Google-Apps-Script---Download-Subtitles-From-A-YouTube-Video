// Declare global variables
// Would recommend eventually creating your own API key as I do not know the owner of the shared API key, may stop working at any time
var apiKey = "AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8";
/********************************************************************************************************************************************************** 
 * 
 * Get the subtitles from a YouTube video using Google Apps Script. Will prompt for the ID.
 * Old method is deprecated, new method: https://gist.github.com/xissy/3812653
 * 
 * Instructions
 * 1) Enter your channelId in getMyYTVids(). Go to your settings from YouTube and click on Your Channel to get your ID from the URL, https://www.youtube.com/channel/<<YOUR CHANNEL ID HERE>>
 * 2) Enable the YouTube API: Services -> YouTube -> Add.
 * 3) Wanna get Subtitles from a particular video? Run getSubtitles() or the first option from the new Google Menu YouTube Data
 * 4) Wanna get Subtitles from your videos? Run getSubtitlesFromSheet() or the second option from the new Google Menu YouTube Data
 * 5) Want an example? Run getSubtitlesWithID() or the third option from the new Google Menu YouTube Data
 *
 * References
 * https://developers.google.com/youtube/v3/quickstart/apps-script
 * https://medium.com/@cafraser/how-to-download-public-youtube-captions-in-xml-b4041a0f9352
 * https://github.com/syzer/youtube-captions-scraper
 * https://developers.google.com/youtube/v3/docs/captions/download
 * 
 **********************************************************************************************************************************************************/

function getSubtitles(videoID) {

  //  Display prompt for user to enter YouTube ID
  if (!videoID) {
    var prompt = SpreadsheetApp.getUi().prompt("Enter a valid YouTube ID (the unique string in the URL after v=) or URL (no ending slash)");
    var promptText = prompt.getResponseText().trim();
  } else {
    promptText = videoID;
  }

  // Sanitize input
  var validYTID = (promptText.indexOf('https://www.youtube.com/watch?v=') > -1) ? promptText.substr(-11, 11) : false;

  //  Confirm string is valid
  if (validYTID) {
    promptText = validYTID;
  }

  //  Tries getting the Timed Text XML file for subtitles
  if (promptText !== '' && promptText.length === 11) {
    try {
      getTimedTextXML(promptText, apiKey);
    } catch (e) {
      console.log(e);
    }
  } else {
    //  Try again
    getSubtitles(videoID);
  }
}

/********************************************************************************************************************************************************** 
 * 
 * Get the subtitles from a YouTube video using Google Apps Script. The ID is passed in to the function.
 * 
 **********************************************************************************************************************************************************/

function getSubtitlesWithID() {
  getTimedTextXML("yIU5G9xHR8o", apiKey); // example YouTube Video
}

/********************************************************************************************************************************************************** 
 * 
 * Get the subtitles from the video IDs in your spreadsheet using Google Apps Script. Run getMyYTVids() first.
 * 
 **********************************************************************************************************************************************************/

function getSubtitlesFromSheet() {

  // Run getMyYTVids() first
  getMyYTVids();

  // Declare variables
  var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = spreadsheet.getSheetByName("My YouTube Videos");
  var sheetRange = sheet.getDataRange();
  var sheetRangeValues = sheetRange.getDisplayValues();
  var headerRow = sheetRangeValues[0];
  var idHeader = headerRow.indexOf("ID");
  var kindHeader = headerRow.indexOf("kind");

  // Collect subtitles on each ID
  for (var x = 1; x < sheetRangeValues.length; x++) {
    if (sheetRangeValues[x][idHeader] && sheetRangeValues[x][kindHeader] == "youtube#video") {
      getTimedTextXML(sheetRangeValues[x][idHeader], apiKey);
    }
  }
}

/********************************************************************************************************************************************************** 
 * 
 * Returns the Timed Text subtitles. Repeated use may hit YouTube's request limits. 
 * UPDATE: original script deprecated as of 12/2021 due to YouTube API restrictions, updated script based on https://gist.github.com/xissy/3812653.
 * 
 * @param youtube_video_id {String} The ID of the YouTube video. It is the unique string in the URL.
 * @param apiKey {String} The api key provided by YouTube to access the API successfully
 * 
**********************************************************************************************************************************************************/

function getTimedTextXML(youtube_video_id, apiKey) {

  //  Declare variables
  var now = new Date();
  var innerArray = [];
  var videoInfo = "https://www.youtube.com/youtubei/v1/player?key=" + apiKey;
  var options = {
    method: 'POST',
    muteHttpExceptions: true,
    'headers': {
      'Content-Type': 'application/json',
      "Cache-Control": "no-cache, no-store, must-revalidate",
      "Pragma": "no-cache",
      "Expires": 0
    },
    payload: JSON.stringify({
      "context": {
        "client": {
          "hl": "en",
          "clientName": "WEB",
          "clientVersion": "2.20210721.00.00",
          "clientFormFactor": "UNKNOWN_FORM_FACTOR",
          "clientScreen": "WATCH",
          "mainAppWebInfo": {
            "graftUrl": "/watch?v=" + youtube_video_id + ""
          }
        },
        "user": {
          "lockedSafetyMode": false
        },
        "request": {
          "useSsl": true, "internalExperimentFlags": [], "consistencyTokenJars": []
        }
      },
      "videoId": youtube_video_id,
      "playbackContext": {
        "contentPlaybackContext": {
          "vis": 0,
          "splay": false,
          "autoCaptionsDefaultOn": false,
          "autonavState": "STATE_NONE",
          "html5Preference": "HTML5_PREF_WANTS",
          "lactMilliseconds": "-1"
        }
      },
      "racyCheckOk": false,
      "contentCheckOk": false
    })
  };

  // Collect video information
  var getVideoInfo = UrlFetchApp.fetch(videoInfo, options);
  var getVideoInfoJSON = JSON.parse(getVideoInfo.getContentText());
  var title = getVideoInfoJSON.videoDetails.title;
  var link = "https://www.youtube.com/watch?v=" + youtube_video_id;
  try {
    var captionsLink = getVideoInfoJSON.captions.playerCaptionsTracklistRenderer.captionTracks[0].baseUrl;

    //  Receive your subtitles via the caption link
    try {
      var subtitlesResponse = UrlFetchApp.fetch(captionsLink);
      var subtitlesText = subtitlesResponse.getContentText();

      // Save the subtitles to your Google Drive (maybe can be parsed via https://developers.google.com/apps-script/reference/xml-service)
      driveURL = DriveApp.createFile("subtitle-TT-" + youtube_video_id + "_" + now + ".xml", subtitlesText).getUrl();
    } catch (e) {
      var subtitlesResponse = e;

    }
  } catch (e) {
    driveURL = 'Failed to grab subtitles - ' + e;
  }
  // Save to array
  innerArray.push([title, link, driveURL]);

  //  Print to to sheet
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Captions");
  sheet.getRange(sheet.getLastRow() + 1, 1, innerArray.length, innerArray[0].length).setValues(innerArray);

}
/****************************************************************************************************************************************
 *
 * Export YouTube videos to Google Sheet
 *
 * Sources
 * https://github.com/rjmccallumbigl/Google-Apps-Script---Export-YouTube-playlist-to-Google-Sheet/blob/5670a9fec269db7c731c1037d8000957dae4eca5/Code.gs
 *
****************************************************************************************************************************************/

function getMyYTVids() {

  // Declare variables
  var nextPageToken;
  var ytItems = {};
  var snippetArray = [];
  var idArray = [];

  // Call to YouTube API
  do {
    var myYTVideos = YouTube.Search.list('id, snippet', {
      channelId: "Enter channel ID here", // Go to your settings from YouTube and click on Your Channel to get your ID from the URL, https://www.youtube.com/channel/<<YOUR CHANNEL ID HERE>>      
      order: "title",
      maxResults: 50,
      pageToken: nextPageToken,
    });

    // Loop through returned items and add them to the array
    for (var j = 0; j < myYTVideos.items.length; j++) {
      snippetArray.push(myYTVideos.items[j].snippet);
      idArray.push(myYTVideos.items[j].id);
      nextPageToken = myYTVideos.nextPageToken;
    }
  }
  while (nextPageToken);

  // Print to spreadsheet
  ytItems.snippets = snippetArray;
  ytItems.ids = idArray;
  setObjectSheet(ytItems, "My YouTube Videos");
}

/******************************************************************************************************
* Convert 2D object into sheet
* 
* @param {Object} ytObject The multidimensional object that we need to map to a sheet
* @param {String} sheetName The name of the sheet the object is being mapped to
* 
******************************************************************************************************/

function setObjectSheet(ytObject, sheetName) {

  //  Declare variables
  var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  var keyArray = [];
  var memberArray = [];

  // Define an array of all the returned object's keys to act as the Header Row
  keyArray.length = 0;
  keyArray = Object.keys(ytObject.snippets[0]).concat("ID").concat("kind");
  memberArray.length = 0;
  memberArray.push(keyArray);

  //  Map returned data to print value for key
  for (var x = 0; x < ytObject.snippets.length; x++) {
    memberArray.push(keyArray.map(function (key) {
      // Return the ID from ytObect.ids
      if (key == "ID") {
        if (ytObject.ids[x]["videoId"]) {
          return ytObject.ids[x]["videoId"];
        } else {
          return ytObject.ids[x]["playlistId"];
        }
        // Return the kind of YouTube object from ytObect.ids
      } else if (key == "kind") {
        return ytObject.ids[x][key];
        // Otherwise return all values from ytObject.snippets
      } {
        return ytObject.snippets[x][key];
      }
    }));
  }

  // Select the sheet and set values  
  try {
    sheet = spreadsheet.insertSheet(sheetName);
  } catch (e) {
    sheet = spreadsheet.getSheetByName(sheetName).clear();
  }
  sheet.setFrozenRows(1);
  sheet.getRange(1, 1, memberArray.length, memberArray[0].length).setValues(memberArray);
}

/********************************************************************************************************************************************************** 
 * 
 * Create a menu option for script functions, updates header row
 * 
**********************************************************************************************************************************************************/

function onOpen() {

  // Declare variables
  var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  var sheetName = "Captions";
  var ui = SpreadsheetApp.getUi();

  // Create menu
  ui.createMenu('YouTube Data')
    .addItem('Get Subtitles from a particular video', 'getSubtitles')
    .addItem('Get Subtitles From My YouTube Videos', 'getSubtitlesFromSheet')
    .addItem('Example', 'getSubtitlesWithID')
    .addToUi();

  // Select or create the sheet
  try {
    sheet = spreadsheet.insertSheet(sheetName);
  } catch (e) {
    sheet = spreadsheet.getSheetByName(sheetName).clear();
  }

  //  Add header row    
  var firstCells = sheet.getRange(1, 1, 1, 3).getDisplayValues();
  var headerRow = [["Title", "URL", "Subtitles"]];
  if (firstCells.toString() != headerRow.toString()) {
    SpreadsheetApp.getActiveSpreadsheet().appendRow(headerRow[0]);
  }
}
