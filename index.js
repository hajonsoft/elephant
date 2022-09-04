import { google } from 'googleapis';
import open from 'open';
import fs from 'fs';
import path from 'path';
import algoliaSearch from 'algoliasearch';
import axios from 'axios';
import inquirer from 'inquirer';
import { exec } from 'child_process';
import dayjs from 'dayjs';
import puppeteer from 'puppeteer';
import moment from 'moment';
import RTLArabic from "rtl-arabic";


let allLinkFiles;
let linkMap = {};

const usage =
  "node . [links|audio|text|db] [channel=CHANNELID] [gkey=GOOGLE_API_KEY] [wkey=WATSON_API_KEY] [repeat=1]";
let specs = {};

async function prepare() {
  let originalSpecs;
  if (fs.existsSync("./specs.json")) {
    originalSpecs = fs.readFileSync("./specs.json", "utf-8");
    specs = JSON.parse(originalSpecs);
  }
  if (!fs.existsSync("./links")) {
    fs.mkdirSync("./links");
  }
  if (!fs.existsSync("./mp3")) {
    fs.mkdirSync("./mp3");
  }
  if (!fs.existsSync("./text")) {
    fs.mkdirSync("./text");
  }
  if (!fs.existsSync("./db")) {
    fs.mkdirSync("./db");
  }
  process.argv.forEach((arg) => {
    if (arg.startsWith("channel=")) {
      specs.channelId = arg.split("=")[1];
    }
    if (arg.startsWith("gkey=")) {
      specs.GOOGLE_API_KEY = arg.split("=")[1];
    }
    if (arg.startsWith("wkey=")) {
      specs.WATSON_API_KEY = arg.split("=")[1];
    }
    if (arg.startsWith("wurl=")) {
      specs.WATSON_URL = arg.split("=")[1];
    }
    if (arg.startsWith("akey=")) {
      specs.ALGOLIA_API_KEY = arg.split("=")[1];
    }
    if (arg.startsWith("repeat=")) {
      specs.repeat = arg.split("=")[1];
    }
  });
  if (originalSpecs === JSON.stringify(specs)) {
    return;
  }
  fs.writeFileSync("./specs.json", JSON.stringify(specs));
}

async function getLinks() {
  if (!specs.channelId) {
    return console.error("Channel is missing\n", usage);
  }
  if (!specs.GOOGLE_API_KEY) {
    return console.error("Google API Key is missing\n", usage);
  }
  const youtube = google.youtube({
    version: "v3",
    auth: specs.GOOGLE_API_KEY,
  });
  let res = null;
  let playlistId = null;

  res = await youtube.channels.list({
    part: "snippet,contentDetails,statistics",
    id: specs.channelId,
  });
  for (const channel of res.data.items) {
    console.log(
      "Channel Name:",
      channel.snippet.title.trim(),
      "videos: ",
      channel.statistics.videoCount,
    );
    playlistId = channel.contentDetails.relatedPlaylists.uploads;
  }

  let page = 1;
  let nextPageToken;
  while (page === 1 || nextPageToken !== null) {
    page = 2;
    res = await youtube.playlistItems.list({
      part: "id,snippet,contentDetails",
      playlistId: playlistId,
      pageToken: nextPageToken,
      maxResults: 50,
    });

    nextPageToken = res.data.nextPageToken;
    if (!nextPageToken) {
      break;
    }
    const videos = await res.data.items.map((video) => {
      return {
        url: `https://www.youtube.com/watch?v=${video.contentDetails.videoId}`,
        title: video.snippet.title,
        date: new Date(video.snippet.publishedAt),
        snippet: video.snippet,
        contentDetails: video.contentDetails,
        videoId: video.contentDetails.videoId,
      };
    });
    for (const video of videos) {
      var detailsUrl =
        "https://www.googleapis.com/youtube/v3/videos?id=" +
        video.videoId +
        "&key=" +
        specs.GOOGLE_API_KEY +
        "&part=snippet,contentDetails";
      const videoDetails = await axios.get(detailsUrl);
      video.duration = {
        formatted: convert_time(
          videoDetails.data.items[0].contentDetails.duration
        ),
        seconds: convert_time(
          videoDetails.data.items[0].contentDetails.duration,
          true
        ),
      };
    }
    videos.forEach((video) => {
      const fileName =
        "./links/" +
        video?.snippet?.position +
        "_" +
        video.snippet.resourceId.videoId +
        ".json";
      fs.writeFileSync(fileName, JSON.stringify(video, null, 2));
      console.log(fileName);
    });
  }
}

async function listDuration(direction = "asc") {
  const output = [];
  let links = fs.readdirSync("./links");
  for (const link of links) {
    const content = fs.readFileSync("./links/" + link);
    const data = JSON.parse(content);
    output.push({ url: data.url, seconds: data.duration.seconds });
  }
  let sortedLinks;
  if (direction === "desc") {
    sortedLinks = output.sort((a, b) => (a.seconds > b.seconds ? -1 : 1));
  } else {
    sortedLinks = output.sort((a, b) => (a.seconds > b.seconds ? 1 : -1));
  }
  console.log("Channel videos", sortedLinks);
}

// async function downloadAudio() {
//   let links = fs.readdirSync("./links");
//   let audios = fs
//     .readdirSync("./mp3")
//     .map((f) => f.match(/(.*?)\.flac/)?.[1])
//     .filter((z) => z);
//   links = links
//     .filter((f) => !audios.includes(f.match(/_(.*?)\.json/)[1]))
//     .sort((a, b) => parseInt(a.split("_")[0]) - parseInt(b.split("_")[0]));
//   if (!links || links.length === 0) {
//     return console.warn("All links have been downloaded. no more links");
//   }
//   for (let i = 0; i < (specs.repeat || 1); i++) {
//     const meta = links[i].match(/_(.*?)\.json/);
//     if (meta.length >= 2) {
//       const videoId = meta[1];
//       console.log(
//         "DOWNLOAD videoId: ",
//         links[i],
//         "Position: ",
//         links[i].split("_")[0],
//         "available links=",
//         links.length,
//         " flac audio=",
//         audios.length,
//         " available links - flac audio =",
//         links.length - audios.length
//       );
//       audio.getYouTubeAudio(videoId).then(function () {
//         console.log(
//           `Downloaded ${videoId},  Completed: ${audios.length}`,
//         );
//       });
//     }
//   }
// }

async function transcribe() {
  if (!specs.WATSON_API_KEY) {
    return console.error("Watson api key is missing\n", usage);
  }
  if (!specs.WATSON_URL) {
    return console.error("Watson url is missing\n", usage);
  }
  let audioFiles = fs
    .readdirSync("./mp3")
    .filter((f) => f.endsWith(".flac"))
    .filter((a) => a)
    .map((f) => f.split(".")[0]);
  let textIds = fs.readdirSync("./text").map((f) => f.split(".")[0]);
  let dbIds = fs.readdirSync("./db");
  audioFiles = audioFiles
    .filter((audio) => !textIds.includes(audio))
    .filter((a) => a);
  audioFiles = audioFiles
    .filter((audio) => !dbIds.includes(audio))
    .filter((a) => a);

  if (!audioFiles || audioFiles.length === 0) {
    return console.warn("No more audio to transcribe");
  }
  const videoId = audioFiles?.[0];
  const stats = fs.statSync(`./mp3/${videoId}.flac`);
  const fileSize = `${Math.round(stats.size / (1024 * 1024), 1)} MB`;
  const curl = `curl -X POST -u "apikey:${specs.WATSON_API_KEY
    }" -o "${path.join(
      __dirname,
      "text",
      videoId + ".json"
    )}" --header "Content-Type: audio/flac" --data-binary @"./mp3/${videoId}.flac" "${specs.WATSON_URL
    }/v1/recognize?model=ar-MS_BroadbandModel"`;
  console.log(
    "TRANSCRIBE videoId: ",
    videoId,
    fileSize,
    "completed: ",
    textIds.length,
    "\n------------------------\n",
    curl + "\n---------------------------"
  );
  exec(curl, (error, stdout, stderr) => {
    console.log(stdout);
    console.error(stderr);
    if (error !== null) {
      console.error(`exec error: ${error}`);
    } else {
      exec(`head ./text/${videoId}.json`, (error, stdout, stderr) => {
        console.log(stdout);
        console.error(stderr);
        if (error !== null) {
          console.error(`exec error: ${error}`);
        }
      });
    }
  });
}

// async function transcribeWithAnthiago() {
//   const currentTime = dayjs();
//   let videoId;
//   let videoFile;

//   // Transcribe specific file (used by spawn command below)
//   process.argv.forEach((arg) => {
//     if (arg.startsWith("link=")) {
//       videoId = arg.split("=")[1];
//     }
//   });
//   if (!allLinkFiles) {
//     allLinkFiles = fs.readdirSync("./links");
//   }

//   if (!videoId) {
//     const textMap = {};
//     const allTextFiles = fs.readdirSync("./text"); // .filter(f => f.endsWith('.html'))
//     console.log("Completed: ", allTextFiles.length);

//     for (const textFile of allTextFiles) {
//       textMap[textFile.split(".")[0]] = textFile;
//     }
//     if (Object.keys(linkMap).length === 0) {
//       for (const linkFile of allLinkFiles) {
//         linkMap[linkFile.match(/\d+_(.*)\.json/)[1]] = linkFile;
//       }
//     }

//     let i = 0;
//     for (const link of Object.keys(linkMap)) {
//       if (!textMap[link]) {
//         videoFile = linkMap[link];
//         videoId = link;
//         if (i < 10) {
//           console.log("spawn for ", link);
//           spawn("node", [".", "anthiago", "link=" + link]);
//         }
//         // console.log( `node . anthiago link=${link} &`);
//         i++;
//       }
//     }
//     console.log(`Total = ${i}`);
//   } else {
//     for (const oneLink of allLinkFiles) {
//       if (oneLink.includes(videoId)) {
//         videoFile = oneLink;
//         break;
//       }
//     }
//   }

//   if (!videoFile) {
//     return console.log("can not find file", videoFile);
//   }
//   // Read file to get url
//   const linkContent = JSON.parse(
//     fs.readFileSync("./links/" + videoFile, "utf-8")
//   );
//   const url = linkContent.url;
//   const page = await anthiago.initPage(async (res) => {
//     await page.select("#codeL", "ar");
//     await page.type("#url_input", url);
//     await page.waitForSelector("#boton_desgrabar");
//     await page.waitFor(4000);
//     await page.click("#boton_desgrabar");
//     try {
//       await page.waitForXPath('//*[@id="result"]/a[2]');
//       const text = await page.$eval("#result", (e) => e.innerHTML);
//       fs.writeFileSync("./text/" + videoId + ".html", text);
//       console.log(
//         "TRANSCRIBE DONE for videoId: ",
//         `${videoId} => ${dayjs().diff(currentTime) / 1000}`,
//         `${dayjs().format("ddd D-MMM h:m:s a")}`
//       );
//     } catch {
//       console.log(
//         "Error for videoId: ",
//         videoId,
//         `${dayjs().diff(currentTime) / 1000}`,
//         `${dayjs().format("ddd D-MMM h:m:s a")}`
//       );
//       fs.writeFileSync("./text/" + videoId + ".html", "error");
//     } finally {
//       anthiago.closeBrowser();
//     }
//   });
//   await page.goto("https://anthiago.com/transcript/", {
//     waitUntil: "domcontentloaded",
//   });
// }

async function save() {
  if (!specs.ALGOLIA_API_KEY) {
    return console.error("Algolia api key is missing is missing\n", usage);
  }
  //ZxEOQACxiFs
  const client = algoliaSearch("97IMN3NK2B", specs.ALGOLIA_API_KEY);
  const index = client.initIndex("speech");

  let textIds = fs
    .readdirSync("./text")
    .filter((f) => f.endsWith(".html"))
    .filter((a) => a)
    .map((f) => f.split(".")[0]);
  let dbIds = fs.readdirSync("./db").map((f) => f.split(".")[0]);
  // uncomment this line to process a specific text file to db
  // const remainingIds = ['ZxEOQACxiFs'];
  const remainingIds = textIds
    .filter((text) => !dbIds.includes(text))
    .filter((a) => a);
  if (!remainingIds || remainingIds.length == 0) {
    return console.warn(
      "No more text available to push to db. Total db files: ",
      dbIds.length
    );
  }
  for (let i = 0; i < remainingIds.length; i++) {
    const videoId = remainingIds[i];
    let data;
    try {
      data = fs.readFileSync(path.join("text", videoId + ".html"), "utf-8");
      if (data === "error") {
        throw new Error(
          "Transcript exist but no lines",
          path.join("text", videoId + ".json")
        );
      }
    } catch (err) {
      fs.writeFileSync("./db/" + videoId, JSON.stringify({ err }));
      console.log(
        "unable to read file: ",
        "./text/" + videoId + ".html",
        "skipping (Marked done with error). To retry ",
        "rm ./db/" + videoId
      );
      continue;
    }
    const regex = new RegExp(`[0-9]+_${videoId}\.json`, "ig");
    let linkFile = fs.readdirSync("./links").filter((f) => regex.test(f));
    if (!linkFile || linkFile.length === 0) {
      return console.error("link file not found for video: " + videoId);
    }

    const videoLinkFile = JSON.parse(
      fs.readFileSync("./links/" + linkFile[0], "utf-8")
    );
    let text = ""; // data;
    try {
      const image = (
        videoLinkFile.snippet.thumbnails.standard ||
        videoLinkFile.snippet.thumbnails.default
      ).url;
      const url = videoLinkFile.url;
      const title =
        videoLinkFile.title + "\n == \n" + videoLinkFile.snippet.description;
      const sanitizedData = data
        ?.replace(/\s/g, " ")
        ?.replace(/<a.*?>/g, "")
        .replace(/<\/a>/g, "");
      const maximumRecordLength = 40000;
      let i = 0;
      while (sanitizedData.length >= i * maximumRecordLength) {
        i++;
        const description = sanitizedData?.substring(
          i * maximumRecordLength,
          i * maximumRecordLength + maximumRecordLength
        );
        const saveObject = {
          text,
          url,
          image,
          title,
          description,
        };

        const result = await index.saveObjects([saveObject], {
          autoGenerateObjectIDIfNotExist: true,
        });
        fs.writeFileSync(
          "./db/" + videoId,
          JSON.stringify({ ...saveObject, objectIDs: result.objectIDs })
        );
        console.log(
          "saved to db: ",
          videoId,
          "total db: ",
          fs.readdirSync("./db").length
        );
      }
    } catch (err) {
      console.log(videoId, err);
    }
  }
}

async function addComment() {
  let videoId;
  let videoFile;

  if (!allLinkFiles) {
    allLinkFiles = fs.readdirSync("./links");
  }

  if (!videoId) {
    const textMap = {};
    const commentFiles =
      (fs.existsSync("./comments") && fs.readdirSync("./comments")) || [];
    for (const commentFile of commentFiles) {
      textMap[commentFile.split(".")[0]] = commentFile;
    }
    if (Object.keys(linkMap).length === 0) {
      for (const linkFile of allLinkFiles) {
        linkMap[linkFile.match(/\d+_(.*)\.json/)[1]] = linkFile;
      }
    }

    let i = 0;
    for (const link of Object.keys(linkMap)) {
      if (!textMap[link]) {
        videoFile = linkMap[link];
        videoId = link;
        if (i < 1) {
          openForComment(videoFile);
        }
        i++;
      }
    }
  }
}

const liked = [];
async function getLikes() {
  let nextPageToken = "";
  const url = "https://www.googleapis.com/youtube/v3/videos?part=snippet&myRating=like&maxResults=20";

  const response = await axios.get(url, {
    headers: {
      'Authorization': `Bearer ${specs.YOUTUBE_AUTH_TOKEN}`,
      'pageToken': nextPageToken,
    }
  });
  console.log('%cMyProject%cline:522%cresponse', 'color:#fff;background:#ee6f57;padding:3px;border-radius:2px', 'color:#fff;background:#1f3c88;padding:3px;border-radius:2px', 'color:#fff;background:rgb(248, 147, 29);padding:3px;border-radius:2px', response)
  nextPageToken = response.data.nextPageToken;
  response.data.items.forEach(item => {
    liked.push(item.id);
  }
  );
}

async function setLiked(inputJSON) {
  (async () => {
    const browser = await puppeteer.launch({
      executablePath:
        "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
      headless: false,
      args: [
        "--profile-directory=Profile 8",
      ]
    });
    const page = await browser.newPage();
    await page.goto(inputJSON.url, {
      waitUntil: "networkidle2",
    });

    // await browser.close();
  })();

  console.log(inputJSON);
  inputJSON.liked = true;
  const fileName =
    "./links/" + inputJSON.snippet.position + "_" + inputJSON.videoId + ".json";
  console.log(fileName);
  fs.writeFileSync(fileName, JSON.stringify(inputJSON));
}

async function openForComment(videoFile) {
  // Read file to get url
  const linkContent = JSON.parse(
    fs.readFileSync("./links/" + videoFile, "utf-8")
  );
  const url = linkContent.url;
  const page = await anthiago.initPage(async (res) => {
    //TODO: Type in comment
    // await page.type('#url_input', url)
  });
  await page.goto(url, { waitUntil: "domcontentloaded" });
}

async function clean() {
  // get links again

  // check audio files for small flac

  // Clean up transcription files, if transcription doesn't parse as JSON then invalid
  let textFiles = fs.readdirSync("./text").filter((f) => f.endsWith(".json"));
  for (const textFile of textFiles) {
    try {
      const data = fs.readFileSync(path.join("text", textFile), "utf-8");
      const transcriptRecords = JSON.parse(data);
      if (transcriptRecords.length === 0) {
        throw new Error(
          "Transcript exist but no lines",
          path.join("text", videoId + ".json")
        );
      }
    } catch (err) {
      fs.unlinkSync(path.join("text", textFile));
      console.error("Transcript Clean:", textFile);
    }
  }

  let htmlFiles = fs.readdirSync("./text").filter((f) => f.endsWith(".html"));
  for (const htmlFile of htmlFiles) {
    try {
      const data = fs.readFileSync(path.join("text", htmlFile), "utf-8");
      if (data === "error") {
        throw new Error(
          "Transcript exist but no lines",
          path.join("text", videoId + ".json")
        );
      }
    } catch (err) {
      fs.unlinkSync(path.join("text", htmlFile));
      console.error("Transcript Clean:", htmlFile);
    }
  }

  // Clean up db files, if db file contain err node then invalid
  let dbFiles = fs.readdirSync("./db");
  for (const dbFile of dbFiles) {
    try {
      const fileData = fs.readFileSync(path.join("db", dbFile), "utf-8");
      const dataDB = JSON.parse(fileData);
      if (dataDB.err) {
        console.log("DB Clean: ", dbFile, fileData);
        throw new Error("Err node found");
      }
    } catch (err) {
      fs.unlinkSync(path.join("db", dbFile));
    }
  }

  console.log(
    "Links: ",
    fs.readdirSync("./links").filter((f) => f.endsWith(".json")).length,
    "Audio: ",
    fs.readdirSync("./mp3").filter((f) => f.endsWith(".flac")).length,
    "Text: ",
    fs.readdirSync("./text").filter((f) => f.endsWith(".json")).length,
    "DB: ",
    fs.readdirSync("./db").length
  );
  if (fs.existsSync("./text-err.log")) {
    fs.unlinkSync("./text-err.log");
  }
  if (fs.existsSync("./text-out.log")) {
    fs.unlinkSync("./text-out.log");
  }

  if (fs.existsSync("./audio-err.log")) {
    fs.unlinkSync("./audio-err.log");
  }
  if (fs.existsSync("./audio-out.log")) {
    fs.unlinkSync("./audio-out.log");
  }

  if (fs.existsSync("./db-err.log")) {
    fs.unlinkSync("./db-err.log");
  }
  if (fs.existsSync("./db-out.log")) {
    fs.unlinkSync("./db-out.log");
  }
}

async function exportLinks() {
  let linkFiles = fs.readdirSync("./links");
  let audioFiles = fs
    .readdirSync("./mp3")
    .filter((f) => f.endsWith(".flac"))
    .map((f) => f.split(".")[0])
    .filter((f) => f);
  linkFiles = linkFiles.filter(
    (f) => !audioFiles.includes(f.match(/_(.*?)\.json/)[1])
  );
  let textFiles = fs
    .readdirSync("./text")
    .filter((f) => f.endsWith(".json"))
    .map((f) => f.split(".")[0])
    .filter((f) => f);
  linkFiles = linkFiles.filter(
    (f) => !textFiles.includes(f.match(/_(.*?)\.json/)[1])
  );
  let dbFiles = fs.readdirSync("./db");
  linkFiles = linkFiles.filter(
    (f) => !dbFiles.includes(f.match(/_(.*?)\.json/)[1])
  );

  const exportCount = 10;
  const exportList = linkFiles.slice(
    linkFiles.length - exportCount - 1,
    linkFiles.length - 1
  );
  if (!fs.existsSync("./export")) {
    fs.mkdirSync("./export");
  }
  for (const exportItem of exportList) {
    // Mark the files done on this computer
    fs.writeFileSync(
      "./db/" + exportItem.match(/_(.*?)\.json/)[1],
      JSON.stringify({ text: "Exported " })
    );
    // export the list so you can do it from another computer
    fs.copyFileSync("./links/" + exportItem, "./export/" + exportItem);
  }
}

async function playVideo() {
  let watched = {};
  if (fs.existsSync("./watched.json")) {
    const watchedData = fs.readFileSync("./watched.json", "utf-8");
    watched = JSON.parse(watchedData);
  }

  if (fs.existsSync('./notliked.json')) {
    const notLiked = JSON.parse(fs.readFileSync('./notliked.json', 'utf-8'));

    let sum = 0;
    let nextVideo = null;
    for (const item of notLiked) {
      if (!watched[item.videoId]) {

        if (item.duration.split(':').length === 2) {
          sum += moment.duration(`0:${item.duration}`).asSeconds();
        } else {
          sum += moment.duration(`0:${item.duration}`).asSeconds();
        }

        if (!nextVideo) {
          watched[item.videoId] = `"${moment().format("YYYY-MM-DD hh:mm:ss a")}"`;
          fs.writeFileSync('./watched.json', JSON.stringify(watched));
          nextVideo = item;
        }
      }
    }
    console.log(`Remaining to watch ${Math.round(moment.duration(sum, 'seconds').asHours())} hours or ${Math.round(moment.duration(sum, 'seconds').asDays())} days`);
    const title = new RTLArabic(nextVideo.title).convert();
    const description = new RTLArabic(nextVideo.title).convert();
    console.log({
      title,
      duration: nextVideo.duration,
      position: nextVideo.position,
      description,
    });

    console.log(`opening ${nextVideo.url}... in 5 seconds`);
    setTimeout(() => {
      open(nextVideo.url);
    }, 5000);
  }
}


function convert_time(duration, inSeconds = false) {
  var a = duration.match(/\d+/g);

  if (
    duration.indexOf("M") >= 0 &&
    duration.indexOf("H") == -1 &&
    duration.indexOf("S") == -1
  ) {
    a = [0, a[0], 0];
  }

  if (duration.indexOf("H") >= 0 && duration.indexOf("M") == -1) {
    a = [a[0], 0, a[1]];
  }
  if (
    duration.indexOf("H") >= 0 &&
    duration.indexOf("M") == -1 &&
    duration.indexOf("S") == -1
  ) {
    a = [a[0], 0, 0];
  }

  duration = 0;

  if (a.length == 3) {
    duration = duration + parseInt(a[0]) * 3600;
    duration = duration + parseInt(a[1]) * 60;
    duration = duration + parseInt(a[2]);
  }

  if (a.length == 2) {
    duration = duration + parseInt(a[0]) * 60;
    duration = duration + parseInt(a[1]);
  }

  if (a.length == 1) {
    duration = duration + parseInt(a[0]);
  }
  var h = Math.floor(duration / 3600);
  var m = Math.floor((duration % 3600) / 60);
  var s = Math.floor((duration % 3600) % 60);
  if (inSeconds) {
    return h * 60 * 60 + m * 60 + s;
  }
  return (
    (h > 0 ? h + ":" + (m < 10 ? "0" : "") : "") +
    m +
    ":" +
    (s < 10 ? "0" : "") +
    s
  );
}

async function main() {
  await prepare();

  // if (process.argv.includes("anthiago")) {
  //   try {
  //     transcribeWithAnthiago();
  //   } catch (err) {
  //     console.log(err);
  //   }

  //   return;
  // }

  // if (process.argv.includes("audio")) {
  //     return downloadAudio();
  // }
  // if (process.argv.includes("text")) {
  //     return transcribe();
  // }
  // if (process.argv.includes("clean")) {
  //     clean();
  // }
  // if (process.argv.includes("export")) {
  //     exportLinks();
  // }

  const links = fs.readdirSync("./links")?.length;
  const remaining = links - fs.readdirSync("./text")?.length;
  const unsaved = remaining - fs.readdirSync("./db")?.length;
  const remainingComments =
    links -
    (fs.existsSync("./comments") && fs.readdirSync("./comments")?.length);
  const remainingLikes = links; // TODO: Read all links files and count the likes
  inquirer
    .prompt([
      {
        type: "list",
        name: "action",
        message: `Select an action for channel ${specs.channelId}`,
        choices: [
          `1-Get video links => ./links ${links} files`,
          `2-Display ${links} links duration sorted ASC`,
          `3-Display ${links} links duration sorted DESC`,
          `4-Transcribe ${remaining > 0 ? remaining : "0"
          } remaining videos using anthiago (multi threaded [max=10])`,
          `5-Save ${unsaved > 0 ? unsaved : "0"
          } unsaved transcriptions to algolia`,
          `6- Add comment ${remainingComments} remaining `,
          `7- Play a video`,
        ],
      },
    ])
    .then((answers) => {
      if (answers.action.startsWith("1-")) {
        return getLinks();
      }
      if (answers.action.startsWith("2-")) {
        return listDuration();
      }
      if (answers.action.startsWith("3-")) {
        return listDuration("desc");
      }
      if (answers.action.startsWith("4-")) {
        try {
          return transcribeWithAnthiago();
        } catch (err) {
          return console.log(err);
        }
      }
      if (answers.action.startsWith("5-")) {
        return save();
      }
      if (answers.action.startsWith("6-")) {
        return addComment();
      }
      if (answers.action.startsWith("7-")) {
        return playVideo();
      }

    });
}

main();
