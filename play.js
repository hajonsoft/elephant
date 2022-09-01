import fs from 'fs';
import clipboardy from 'clipboardy';
import moment from 'moment';

// https://developers.google.com/youtube/v3/docs/playlistItems/list?apix_params=%7B%22part%22%3A%5B%22snippet%22%5D%2C%22maxResults%22%3A50%2C%22pageToken%22%3A%22EAAaB1BUOkNOWW0%22%2C%22playlistId%22%3A%22LL%22%7D
// async function main() {
//     if (!fs.existsSync('./likes')) {
//         fs.mkdirSync('./likes');
//     }

//     const dataRaw = await clipboardy.read();
//     if (dataRaw.length < 100) {
//         return
//     }
//     const data = JSON.parse(dataRaw);
//     fs.writeFileSync(`./likes/${data.items[0].snippet.resourceId.videoId}.json`, JSON.stringify(data.items.map(item => item.snippet.resourceId.videoId)));
//     console.log(data.items[0].snippet.position, '/', data.pageInfo.totalResults);
//     console.log(data.nextPageToken);
//     await clipboardy.write(data.nextPageToken);

// }

// setInterval(() => {
//     main();
// }, 1000);
// let notLiked = []
// const liked = {};
// const links = fs.readdirSync('./links');
// const likes = fs.readdirSync('./likes');
// for (const like of likes) {
//     const videos = JSON.parse(fs.readFileSync(`./likes/${like}`, 'utf8'))
//     for (const video of videos) {
//         liked[video] = true;
//     }
// }

// for (const link of links) {
//     const video = JSON.parse(fs.readFileSync(`./links/${link}`, 'utf8'));
//     if (liked[video.videoId]) {
//         video.liked = true;
//     } else {
//         video.liked = false;
//         notLiked.push({
//             url: video.url,
//             videoId: video.videoId,
//             duration: video.duration.formatted,
//             position: video.snippet.position,
//             title: video.title,
//             description: video.snippet.description,
//             date: moment(video.date).format('dddd YYYY-MM-DD hh:mm:ss a'),
//             since: moment(video.date).fromNow(),
//         })
//     }
// }

// const sorted = notLiked.sort((a, b) => {
//     return a.position - b.position;
// }).reverse();
// fs.writeFileSync('./notLiked.json', JSON.stringify(sorted));
// console.log('Total videos not yet liked (i.e watched)', sorted.length);

const notLikedContent = fs.readFileSync('./notLiked.json', 'utf8')
const notLiked = JSON.parse(notLikedContent);
let sum = 0;
for (const nl of notLiked) {
    if (nl.duration.split(':').length === 2) {
        sum += moment.duration(`0:${nl.duration}`).asSeconds();
    } else {
        sum += moment.duration(`0:${nl.duration}`).asSeconds();
    }
}
const words = moment.duration(sum, 'seconds').asDays();
