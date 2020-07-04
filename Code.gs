/** 
* Get the subtitles from a YouTube video using Google Apps Script
* If using YouTube API, activate API first: Menu Bar -> Resources -> Advanced Google Services -> YouTube Data API v3: "ON"
*
* References
* https://developers.google.com/youtube/v3/quickstart/apps-script
* https://medium.com/@cafraser/how-to-download-public-youtube-captions-in-xml-b4041a0f9352
* https://github.com/syzer/youtube-captions-scraper
* https://developers.google.com/youtube/v3/docs/captions/download
* https://www.reddit.com/r/GoogleAppsScript/comments/hgrbap/is_there_a_way_to_import_caption_from_youtube/
*/

// **********************************************************************************************************************************************************

/** 
* Create a menu option for script functions
*
*/

function onOpen() {
  var ui = SpreadsheetApp.getUi();
  ui.createMenu('YouTube Data')
  .addItem('Get Subtitles', 'getSubtitles')  
  .addToUi();
}

// **********************************************************************************************************************************************************

/** 
* Primary function to get the subtitles from a YouTube video.
*
*/

function getSubtitles(){
  
  //  Add header row
  var firstCell = SpreadsheetApp.getActiveSheet().getRange(1, 1).getValue();
  if (firstCell != 'Link') {
    var headerRow = ["Link", "XML", "Subtitles"];
    SpreadsheetApp.getActiveSpreadsheet().appendRow(headerRow);
  }
  
  //  Display prompt for user to enter YouTube ID
  var prompt = SpreadsheetApp.getUi().prompt("Enter a valid YouTube ID (the unique string in the URL after v=) or URL (no ending slash)");
  var promptText = prompt.getResponseText().trim();
  var validYTID = (promptText.indexOf('https://www.youtube.com/watch?v=') > -1) ? promptText.substr(-11, 11) : false;  
  
  //  Confirm string is valid
  if (validYTID){
    promptText = validYTID; 
  }
  
  if (promptText !== '' && promptText.length === 11){
    
    //  Tries the Timed Text XML file first then tries the YouTube API if it fails
    try{
      getTimedTextXML(promptText);
    } catch(e){
      console.log(e);
      useYouTubeAPI(promptText);  
    }
    
  } else {
    
    //  Try again
    getSubtitles();
  }
}

// **********************************************************************************************************************************************************

/** 
* Returns the Timed Text subtitles. Repeated use may hit YouTube's request limits.
*
* @param ytID {String} The ID of the YouTube video. It is the unique string in the URL.
*
*/

function getTimedTextXML(ytID){
  
  //  Declare variables, parse results of get_video_info to return applicable subtitles XML file    
  var now = new Date();
  var videoInfo = 'https://youtube.com/get_video_info?video_id=' + ytID;
  var getVideoInfo = UrlFetchApp.fetch(videoInfo).getContentText(); 
  var decodeVideoInfo = decodeURIComponent(getVideoInfo);  
  var getVideoInfoURL = DriveApp.createFile("get_video_info_subtitle-" + ytID + "_" + now + ".txt", decodeVideoInfo).getUrl();
  var captionSplit = decodeVideoInfo.split(':{"captionTracks":[{"baseUrl":"')[1];     
  var finalCaptionSplit = captionSplit.split('{"baseUrl":"');  
  var finalArray = new Array (finalCaptionSplit.length);
  var responseArray = new Array (finalArray.length);
  var URLArray = new Array (finalArray.length);
  var innerArray = [];
  
  for (var x = 0; x < finalArray.length; x++){
    
    finalArray[x] = finalCaptionSplit[x].split('","')[0];    
    finalArray[x] = finalArray[x].replace(/\\u0026/g, "&");
    
    //  Receive your subtitles via the XML
    try {
      responseArray[x] = UrlFetchApp.fetch(finalArray[x]).getContentText();
    }catch(e){
      responseArray[x] = e;
      URLArray[x] = 'N/A';
    }    
    
    //    Save the subtitles to your Google Drive
    URLArray[x] = DriveApp.createFile("subtitle-TT-" + ytID + "_" + now + ".txt", responseArray[x]).getUrl();      
    
    innerArray.push(['https://www.youtube.com/watch?v=' + ytID, finalArray[x], URLArray[x]]);
  }    
  
  //  Print all to to sheet
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  sheet.getRange(sheet.getLastRow() + 1, 1, innerArray.length, innerArray[0].length).setValues(innerArray);
}

// **********************************************************************************************************************************************************

/** 
* Returns the subtitles using the API. 
*
* Common Error: The permissions associated with the request are not sufficient to download the caption track. 
* The request might not be properly authorized, or the video order might not have enabled third-party contributions for this caption.
*
* This indicates you do not have rights to get the subtitles. Only works if you own the video or the owner allows it explicitly.
*
* @param ytID {String} The ID of the YouTube video. It is the unique string in the URL.
*
*/

function useYouTubeAPI(ytID){
  
  //  Declare variables
  var ryanMcSloMo = {};
  var now = new Date();
  var innerArray = [];
  var driveURL = "";
  
  try {
    var captionSearch = YouTube.Captions.list(ytID, "id");  
    var captionID = captionSearch.items[0].id;  
    
    // Update options for API
    ryanMcSloMo.url = "https://www.googleapis.com/youtube/v3/captions/" + captionID + "?tfmt=srt&prettyPrint=true&key";
    ryanMcSloMo.options = {
      headers: {
        Authorization: 'Bearer ' + ScriptApp.getOAuthToken(),
        Accept: 'application/json'
      },
      method: "GET",
      muteHttpExceptions: true,
      compressed: true,
      'Accept-Encoding': 'gzip',
      'User-Agent': 'YouTubeAPI (gzip)'
    }
    
    //  Receive your texts using the API  
    var response = UrlFetchApp.fetch(ryanMcSloMo.url, ryanMcSloMo.options).getContentText();  
    
    //  Save the subtitles to your Google Drive
    driveURL = DriveApp.createFile("subtitle-API-" + ytID + "_" + now + ".txt", response).getUrl();
  }catch(e){    
    console.log(e);
    driveURL = e;
  }    
  innerArray.push(['https://www.youtube.com/watch?v=' + ytID, 'N/A', driveURL]);
  
  //  print to sheet
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  sheet.getRange(sheet.getLastRow() + 1, 1, innerArray.length, innerArray[0].length).setValues(innerArray);
}
