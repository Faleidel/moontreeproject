# The Moon Tree Project

## What is the Moon tree Tree?

The Moon Tree Project is a link aggregator like reddit or hackernews. The big difference is that it is opensource, you can host your own Moon Tree server and it is decentralized.

## What does decentralized mean?

It's like with emails. You can have an @gmail account or and @hotmail account and they will be able to send mails to each other even if it's not the same server / mail provider. With the Moon Tree project each server (hosted by anyone that want to host one) can talk to each other. You could host your own server, create an account there and answer to any post on any server.

## How complete is the project?

It's very fare from complete. I decided to cut a lot's of corners to show a first 'working' version as soon a possible. I, for example, don't have a proper database right now, everything is stored as files on disk. Its sounds crazy (and it is) but I wanted to make the first publishable version as soon as possible to get some feedback.

Things I have to do:

- use a real database
- fix compatibility with mastodon
- check compatibility with other activityPub projects (like peertube)
- secure server to server data sharing
- work on the UI
- and so many other things

## Installation

This project need nodejs >=10.15.1 (this is needed to generate encryption keys)

You can install the dependencies with `npm install` and then run the project with `node dist/main.js`.

Before running the server you need to copy `baseConfig.json` to `config.json`. If you want to run a test server you can set  `generateTestData` to true.

To delete your site data you just have to remove the `store.json` file (which for now contains all the site data until I add a real database).

The server use the port 9090. You can override it in the config using the `port` option. When using the server behind a proxy you can set the `realPort` option to what the outside world will see and `port` to what port the proxy see your server at. So a `port` of `""` with a `realPort` of `"9090"` means your site use port `80` or `443` but the server use port `9090` behind a proxy.

To run the server you do `node dist/main.js`. You should go create an account and give yourself admin powers in the config (set `admins` to `["myUserName@myServer.com"]` if your user is admin and you are running on port `9090` in localhost it would look like this `["admin@localhost:9090"]` if you are using port 90 or 443 the port is omited).

## Compile from the typescript sources

To compile the project yourself from the typescript sources you will need the typescript compiler: `npm install -g typescript` and then simply call the `tsc` command which will output javascript in the `dist` folder.