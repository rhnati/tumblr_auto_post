import OAuth from "oauth";
import fetch from "node-fetch";

const consumerKey = 'qSjWrsq1wLRd5fmwxdkYwWO9PFXBxgYLfo3uyv8EMll6nYwOPN';
const consumerSecret = 'XAZ4oOs8q5zhjKY4IJSkc8GSDQu2cRE7pSiQwVtZ4Dukv03nLF';
const accessToken = 'G8WVRF9jySZEBo3JaZNPD8eteXScj24aVKJK4kfWcuMuA5eOz0';
const accessTokenSecret = '5ZhZ4oqaLYYjD0RNWRDdOLVUBgKvoypTOvMmhyYwDhNv94PnPs';

const tumblrBlogIdentifier = 'sportscore-io.tumblr.com';

const postedMatches = new Set();
let matchIndex = 0;

function fetchData() {
  fetch(
    "https://sportscore.io/api/v1/football/matches/?match_status=live&sort_by_time=false&page=0",
    {
      method: "GET",
      headers: {
        accept: "application/json",
        "X-API-Key": "uqzmebqojezbivd2dmpakmj93j7gjm",
      },
    }
  )
    .then((response) => response.json())
    .then((data) => {
      processData(data.match_groups);
    })
    .catch((error) => {
      console.error("Error:", error);
    });
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

    matchGroup.matches.forEach(async (match) => {
      const matchId = match.id;

      if (!postedMatches.has(matchId)) {
        const homeTeam = match.home_team.name;
        const awayTeam = match.away_team.name;
        const league = competition;
        const matchLink = match.url;

        // Generate hashtags based on team names and league
        const hashtags = `#${homeTeam.replace(/\s+/g, '')} #${awayTeam.replace(/\s+/g, '')} #${league.replace(/\s+/g, '')}`;

        let postContent = `🎌 Match Started! 🎌\n\n`;
        postContent += `💥⚽️💥 ${homeTeam} vs ${awayTeam} League: ${league} 💥⚽️💥\n\n`;
        postContent += `Watch Now on SportScore: ${matchLink}\n\n`;
        postContent += `Hashtags: ${hashtags}\n\n`; // Include hashtags in the post

        // Extract photo URL from the match link
        const photoUrl = extractPhotoUrlFromMatchLink(matchLink);
        if (photoUrl) {
          // Post to Tumblr after 1 minute interval
          setTimeout(() => {
            postToTumblr(postContent, photoUrl);
          }, matchIndex * 60000);
        }

        // Add matchId to the set to avoid reposting
        postedMatches.add(matchId);
        matchIndex++;
      }
    });
  } catch (error) {
    console.error("Error getting match:", error.message);
  }
}

function extractPhotoUrlFromMatchLink(matchLink) {
  // Replace this with your actual logic based on the structure of your photo URLs
  // For example, if the photo URL is part of the match link, you might just return the match link itself
  return matchLink;
}

async function postToTumblr(postText, photoUrl) {
  try {
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
      data: [photoUrl],
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
