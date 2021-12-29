// Failing due to the error "Video unavailable"


function test2() {
  getTimedTextXMLFailing("BYqZet63wYQ");
  // var y = "xasdasd";
  // console.log(Array.isArray(y));
  // for (var x = 0; x <y.length; x++){
  // console.log(x);
  // }
}

function getTimedTextXMLFailing(youtube_video_id) {

  //  Declare variables
  var now = new Date();
  var innerArray = [];
  var videoInfo = "https://www.youtube.com/youtubei/v1/player?key=AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8";
  var fetchArray = [];
  var captionsLink = [];

  // Check if it's a single ID or multiple
  if (Array.isArray(youtube_video_id)) {
    for (var a in youtube_video_id) {
      fetchArray.push(buildOptions(videoInfo, youtube_video_id[a]));
    }
  } else {
    fetchArray.push(buildOptions(videoInfo, youtube_video_id[a]));
  }

  // Collect video information
  var getVideoInfo = UrlFetchApp.fetchAll(fetchArray);

  for (var v in getVideoInfo) {
    var getVideoInfoJSON = JSON.parse(getVideoInfo[v].getContentText());
    var title = getVideoInfoJSON.videodetails.title;
    var link = "https://www.youtube.com/watch?v=" + youtube_video_id;
    var captionsLink = getVideoInfoJSON.captions.playerCaptionsTracklistRenderer.captionTracks[0].baseUrl;


    //  Receive your subtitles via the caption link
    try {
      var subtitlesResponses = UrlFetchApp.fetchAll([captionsLink]);
      for (var s in subtitlesResponse) {
        subtitlesResponse = subtitlesResponses[s].getContentText();

        // Save the subtitles to your Google Drive (maybe can be parsed via https://developers.google.com/apps-script/reference/xml-service)
        driveURL = DriveApp.createFile("subtitle-TT-" + youtube_video_id + "_" + now + ".xml", subtitlesResponse).getUrl();
      }
    } catch (e) {
      var subtitlesResponse = e;
      driveURL = 'N/A';
    }

    // Save to array
    innerArray.push([title, link, driveURL]);
  }

  //  Print to to sheet
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  sheet.getRange(sheet.getLastRow() + 1, 1, innerArray.length, innerArray[0].length).setValues(innerArray);
}

function buildOptions(apiURL, ytID) {
  return {
    url: apiURL,
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
            "graftUrl": "/watch?v=" + ytID + ""
          }
        },
        "user": {
          "lockedSafetyMode": false
        },
        "request": {
          "useSsl": true, "internalExperimentFlags": [], "consistencyTokenJars": []
        }
      },
      "videoId": ytID,
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
}

/********************************************************************************************************************************************************** 
 * 
 * Create a menu option for script functions, updates header row
 * 
**********************************************************************************************************************************************************/

function onOpen2() {
  var ui = SpreadsheetApp.getUi();
  ui.createMenu('YouTube Data')
    .addItem('Get Subtitles', 'getSubtitles')
    .addToUi();

  //  Add header row  
  var firstCells = SpreadsheetApp.getActiveSheet().getRange(1, 1, 1, 3).getDisplayValues();
  var headerRow = [["Title", "URL", "Subtitles"]];
  if (firstCells.toString() != headerRow.toString()) {
    SpreadsheetApp.getActiveSpreadsheet().appendRow(headerRow[0]);
  }
}