import axios from 'axios';
import OAuth from 'oauth';

const consumerKey = 'lrDZwgNaDvRlzkKoR7q0XVKJL3wiAExjCOtlg6RbCEomOo11xy';
const consumerSecret = 'hfue6BVEEJg6Cs1cEaBTljg0aHnXBWBLGXpNeCAoZ83ZB5VdQR';
const accessToken = 'toprAm66478FRsTJrorcCXwK4Jl94HqwngJk6nwqIwohFeZwev';
const accessTokenSecret = 'WT11COK507OUtRclVXvsDJJydg2pcKiqJgsHkIMgtV2mSq9tpb';

const tumblrBlogIdentifier = 'sportscoreio.tumblr.com';

function fetchData() {
    fetch('https://sportscore.io/api/v1/football/matches/?match_status=live&sort_by_time=false&page=0', {
        method: 'GET',
        headers: {
            "accept": "application/json",
            'X-API-Key': 'uqzmebqojezbivd2dmpakmj93j7gjm',
        },
    })
    .then(response => response.json())
    .then(data => {
        processData(data.match_groups);
    })
    .catch(error => {
        console.error('Error:', error);
    });
}


function processData(matchGroups) {
    try {
        if (!Array.isArray(matchGroups)) {
            console.error('Invalid matchGroups:', matchGroups);
            return;
        }

        matchGroups.forEach(matchGroup => {
            const competition = matchGroup['competition']['name'];

            matchGroup['matches'].forEach(match => {
                const homeTeam = match['home_team']['name'];
                const awayTeam = match['away_team']['name'];
                const league = competition;
                const matchLink = match['url'];

                let postContent = `🎌 Match Started! 🎌\n\n`;
                postContent += `💥⚽️💥 ${homeTeam} vs ${awayTeam} League: ${league} 💥⚽️💥\n\n`;
                postContent += `Watch Now on SportScore: ${matchLink}\n\n`;

                postToTumblr(postContent);
            });
        });
    } catch (error) {
        console.error('Error processing data:', error);
    }
}

async function postToTumblr(postText) {
    try {
        const oauth = new OAuth.OAuth(
            'https://www.tumblr.com/oauth/request_token',
            'https://www.tumblr.com/oauth/access_token',
            consumerKey,
            consumerSecret,
            '1.0A',
            null,
            'HMAC-SHA1'
        );

        let postParams = {
            type: 'text',
            title: 'Automated Post',
            body: postText,
        };

        const postData = await axios.post(
            console.log(tumblrBlogIdentifier)
            `https://api.tumblr.com/v2/blog/${tumblrBlogIdentifier}/post`,
            postParams,
            {
                headers: {
                    Authorization: oauth.toHeader(oauth.authorize({
                        url: `https://api.tumblr.com/v2/blog/${tumblrBlogIdentifier}/post`,
                        method: 'POST',
                    }, accessToken, accessTokenSecret)),
                },
            }
        );

        console.log('Post successful:', postData.data);
    } catch (error) {
        console.error('Error posting to Tumblr:', error.message);
    }
}

setInterval(fetchData, 30000);

fetchData();
