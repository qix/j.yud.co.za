
const {TwitterApi} = require('twitter-api-v2');

const client = new TwitterApi(
    'AAAAAAAAAAAAAAAAAAAAAGx4YgEAAAAA0RgMhGRDQDoO0Wdhmw5MKr' +
    'KrEHg%3Dbvasfd3jeNPBF3JCvCPBpNo5yEMTXM0XN2a5RRJwLHAz3mqgws'
);


module.exports = (req, res) => {

    const username = req.query.username;
    const rv = client.v2.userByUsername(username, {
        "user.fields":"profile_image_url,name,id"
    });

    return rv.then(({data}) => {
        const url = data && data.profile_image_url;
        if (!url) {
            res.json({
                "name": `PFP @${username}`,
                "description": `An NFT of the non-existant @${username} Twitter PFP`,
            });
            return;
        }

        const original = url.replace(/_[^_./]+(\.[^/]+)$/, '$1');

        res.json({
            "name": `PFP @${username}`,
            "description": `An NFT of the @${username} Twitter PFP`,
            "image": original,
            "properties": {
                "username": username,
                "name": data.name,
                "id": data.id,
            }
        })
    }, err => {
        throw new Error('Failed to fetch profile image from Twitter API' );
    })
}