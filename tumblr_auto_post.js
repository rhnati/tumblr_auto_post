import OAuth from "oauth";
import express from 'express';
import multer from 'multer';
import path from 'path';
import axios from 'axios';
import sharp from 'sharp';
import FormData from 'form-data';
import { NodeSSH } from 'node-ssh';
import { Buffer } from 'buffer';

const ssh = new NodeSSH();

const consumerKey = 'qSjWrsq1wLRd5fmwxdkYwWO9PFXBxgYLfo3uyv8EMll6nYwOPN';
const consumerSecret = 'XAZ4oOs8q5zhjKY4IJSkc8GSDQu2cRE7pSiQwVtZ4Dukv03nLF';
const accessToken = 'G8WVRF9jySZEBo3JaZNPD8eteXScj24aVKJK4kfWcuMuA5eOz0';
const accessTokenSecret = '5ZhZ4oqaLYYjD0RNWRDdOLVUBgKvoypTOvMmhyYwDhNv94PnPs';

const tumblrBlogIdentifier = 'sportscore-io.tumblr.com';

const postedMatches = new Set();
let matchIndex = 0;

//Convert image to jpeg
async function convertAndSendImage(imageUrl, id) {
  try {
      // await clearUploadsFolder();
      const response = await axios({
          method: 'get',
          url: imageUrl,
          responseType: 'arraybuffer'
      });

      let image = sharp(response.data);
      
      const metadata = await image.metadata();
      
      image = image.resize({
          width: metadata.width,
          height: Math.floor(metadata.width / 1.91),
          fit: 'cover'
      });

      const sshConfig = {
        host: '45.61.138.203',
        username: 'root',
        password: 'Ssgeli9988!@a',
      };

      const convertedImage = await image.jpeg().toBuffer();

      const imageBuffer = Buffer.from(convertedImage, 'binary');

      const remoteFilePath = `/tumblr_auto_post/uploads_tumblr/image_${id}`;

      ssh.connect(sshConfig)
      .then(() => {
        console.log("Connected to the server.");
        return ssh.putBuffer(imageBuffer, remoteFilePath);
      })
      .then(() => {
        console.log("Buffer uploaded successfully.");
        ssh.dispose();
      })
      .catch(err => {
        console.error("Something went wrong:", err);
        ssh.dispose();
      });
  } catch (error) {
      console.error('Error in converting or sending the image:', error);
  }
}

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

    for (const match of matchGroup.matches) {
      const matchId = match.id;
      const convertedImageResponse = await convertAndSendImage(match.social_picture, matchId);
      const myConvertedImagePath = convertedImageResponse.filePath;

      if (!postedMatches.has(matchId)) {
        const homeTeam = match.home_team.name;
        const awayTeam = match.away_team.name;
        const league = competition;
        const matchLink = match.url;
        const hashtags = `#${homeTeam.replace(/\s+/g, '')} #${awayTeam.replace(/\s+/g, '')} #${league.replace(/\s+/g, '')}`;

        let postContent = `💥⚽️💥 ${homeTeam} vs ${awayTeam} League: ${league} 💥⚽️💥\n\n`;
        postContent += `Watch Now on SportScore: ${matchLink}\n\n`;
        postContent += `${hashtags}\n\n`;

        // Post to Tumblr after 1 minute interval
        setTimeout(() => {
          postToTumblr(postContent, `http://45.61.138.203${myConvertedImagePath}`);
        }, matchIndex * 60000); // Adjusted interval based on matchIndex

        // Add matchId to the set to avoid reposting
        postedMatches.add(matchId);
        matchIndex++;
      }
    };
  } catch (error) {
    console.error("Error getting match:", error.message);
  }
}

async function postToTumblr(postText, matchLink) {
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
    console.log(matchLink);

    const postParams = {
      type: "photo",
      caption: postText,
      source: matchLink,
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
