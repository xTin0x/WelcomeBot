# WelcomeBot

Nodejs implementation.

Dependencies:
https://github.com/discordjs/discord.js

## Usage
Before running this bot, replace the values for `TOKEN` and `token` in the `.env` and `config.json` files, respectively, with the appropriate values for your Discord bot token and channel ID
#### CLI
* Install dependencies: `npm install`
* Start the bot
  * Local config (`.env`) : `node index.js` OR `npm run start:local`
  * Server specific config - (`.env.server-a`) : `npm run start:server-a`


#### Docker
* Build & tag the image: `docker build . -t welcomebot`
* Run the container
  * Interactively to view console logs: ` docker run -it welcomebot`
  * Detatched in the background: `docker run -d welcomebot`
    * Output logs with `docker logs -f $(docker ps -aqf "ancestor=welcomebot")`
  * By default, this will run using the local configuration file, `.env`. To run using another configuration, pass in the environment variable `NODE_ENV` with the appropriate value, i.e `docker run -it -e NODE_ENV=server-a welcomebot`
* Cleanup:
  * Stop & remove all welcomebot containers: `docker rm -f $(docker ps -aqf "ancestor=welcomebot")`  
  * Remove welcomebot image `docker rmi -f welcomebot`

**Note:** The current Docker configuration is intended for testing purposes but should you decide to run this in a production environment, it's encouraged to create a [Docker volume](https://docs.docker.com/storage/volumes/) for persistent storage. This will allow you to retain data stored in `points.json` & `reactionTimes.json` in the event you need to restart the container/host OS or if you are running multiple containers on the same host and wish to centralize the data for each instance.
