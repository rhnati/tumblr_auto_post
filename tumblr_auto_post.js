import OAuth from "oauth";
import fetch from "node-fetch";
import sharp from "sharp";
import fs from 'fs';

const consumerKey = 'qSjWrsq1wLRd5fmwxdkYwWO9PFXBxgYLfo3uyv8EMll6nYwOPN';
const consumerSecret = 'XAZ4oOs8q5zhjKY4IJSkc8GSDQu2cRE7pSiQwVtZ4Dukv03nLF';
const accessToken = 'G8WVRF9jySZEBo3JaZNPD8eteXScj24aVKJK4kfWcuMuA5eOz0';
const accessTokenSecret = '5ZhZ4oqaLYYjD0RNWRDdOLVUBgKvoypTOvMmhyYwDhNv94PnPs';

const tumblrBlogIdentifier = 'sportscore-io.tumblr.com';
const postedMatchesFile = 'postedMatches.json';

const maxMemoryRetentionMinutes = 60;

let postedMatches = loadPostedMatches();
let matchIndex = 0;

function loadPostedMatches() {
  try {
    const data = fs.readFileSync(postedMatchesFile, 'utf-8');
    return new Map(JSON.parse(data));
  } catch (error) {
    return new Map();
  }
}

function savePostedMatches(postedMatchesMap) {
  fs.writeFileSync(postedMatchesFile, JSON.stringify(Array.from(postedMatchesMap)), 'utf-8');
}

// Function to clear old matches from the postedMatches set
function clearOldMatches() {
  const currentTime = new Date().getTime();
  const maxRetentionTime = maxMemoryRetentionMinutes * 60 * 1000;

  for (const [matchId, matchTimestamp] of postedMatches.entries()) {
    if (currentTime - matchTimestamp > maxRetentionTime) {
      postedMatches.delete(matchId);
    }
  }
}

async function fetchData() {
  try {
    const response = await fetch(
      "https://sportscore.io/api/v1/football/matches/?match_status=live&sort_by_time=false&page=0",
      {
        method: "GET",
        headers: {
          accept: "application/json",
          "X-API-Key": "uqzmebqojezbivd2dmpakmj93j7gjm",
        },
      }
    );

    const data = await response.json();
    processData(data.match_groups);
  } catch (error) {
    console.error("Error:", error);
  }
}

function processData(matchGroups) {
  try {
    if (!Array.isArray(matchGroups)) {
      console.error("Invalid matchGroups:", matchGroups);
      return;
    }

    matchGroups.forEach((matchGroup) => {
      getMatch(matchGroup);
    });
  } catch (error) {
    console.error("Error processing data:", error);
  }
}

async function getMatch(matchGroup) {
  try {
    const competition = matchGroup.competition.name;

    matchGroup.matches.forEach((match) => {
      const matchId = match.id;

      if (!postedMatches.has(matchId)) {
        const homeTeam = match.home_team.name;
        const awayTeam = match.away_team.name;
        const league = competition;
        const matchLink = match.url;
        const photoLink = match.social_picture;
        const hashtags = `#${homeTeam.replace(/\s+/g, '')} #${awayTeam.replace(/\s+/g, '')} #${league.replace(/\s+/g, '')}`;

        let postContent = `💥⚽️💥 ${homeTeam} vs ${awayTeam} League: ${league} 💥⚽️💥<br>`;
        postContent += `Watch Now on SportScore: <a href="${matchLink}" target="_blank">${matchLink}</a><br>`;
        postContent += `<a href="https://www.tumblr.com/search/${encodeHashtag(homeTeam)}" target="_blank">#${homeTeam.replace(/\s+/g, '')}</a> `;
        postContent += `<a href="https://www.tumblr.com/search/${encodeHashtag(awayTeam)}" target="_blank">#${awayTeam.replace(/\s+/g, '')}</a> `;
        postContent += `<a href="https://www.tumblr.com/search/${encodeHashtag(league)}" target="_blank">#${league.replace(/\s+/g, '')}</a><br>`;

        // Post to Tumblr after 1 minute interval
        setTimeout(() => {
          postToTumblr(postContent, photoLink);
        }, matchIndex * 60000); // Adjusted interval based on matchIndex

        // Add matchId to the set with timestamp to track when it was posted
        postedMatches.set(matchId, new Date().getTime());
        matchIndex++;
      }
    });

    // Clear old matches from the set periodically
    if (matchIndex % 10 === 0) {
      clearOldMatches();
      savePostedMatches(postedMatches);
    }

  } catch (error) {
    console.error("Error getting match:", error.message);
  }
}

async function postToTumblr(postText, photoLink) {
  try {
    // Fetch WebP image using the matchLink
    const webpImageResponse = await fetch(photoLink);
    const webpImageBuffer = await webpImageResponse.arrayBuffer();

    // Convert WebP to JPEG using sharp stream
    const jpegBuffer = await sharp(webpImageBuffer)
      .resize(800)
      .jpeg()
      .toBuffer();

    const oauth = new OAuth.OAuth(
      null,
      null,
      consumerKey,
      consumerSecret,
      "1.0A",
      null,
      "HMAC-SHA1"
    );

    const postParams = {
      type: "photo",
      caption: postText,
      data64: jpegBuffer.toString("base64"),
    };

    oauth.post(
      `https://api.tumblr.com/v2/blog/${tumblrBlogIdentifier}/post`,
      accessToken,
      accessTokenSecret,
      postParams,
      "",
      (error, data) => {
        if (error) {
          console.error("Error posting to Tumblr:", error);
        } else {
          console.log("Post successful:", data);
        }
      }
    );
  } catch (error) {
    console.error("Error:", error);
  }
}

setInterval(fetchData, 60000);

fetchData();
