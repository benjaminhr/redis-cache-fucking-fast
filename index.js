var app = require('express')();
var redis = require('redis');
var responseTime = require('response-time');
var axios = require('axios');
var client = redis.createClient();

// redis shiiit
client.on('error', (err) => {
  console.log(err);
})

// bs middleware
app.use(responseTime());

getUserRepositories = (user) => {
  var githubEndpoint = 'https://api.github.com/users/' + user + '/repos' + '?per_page=100';
  return axios.get(githubEndpoint);
}

computeTotalStars = (repositories) => {
  return repositories.data.reduce((prev, curr) => {
    return prev + curr.stargazers_count;
  }, 0)
}

app.get('/api/:username', (req,res) => {
  var username = req.params.username;
  client.get(username, (err, result) => {
    if (result) {
      res.send({ "totalStars" : result, "source": "redis cache"});
    } else {
      getUserRepositories(username)
        .then(computeTotalStars)
        .then((totalStars) => {
          client.setex(username, 60, totalStars);
          res.send({ "totalStars": totalStars, "source": "Github API"});
        }).catch((response) => {
          if (response.status === 404) {
            res.send('Github username does not exist lol');
          } else {
            res.send(response);
          }
        })
    }
  })
})

// server shiit
var port = process.env.PORT || 8080;
app.listen(port, () => { console.log('wöööörking');});
