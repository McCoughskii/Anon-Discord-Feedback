const Discord = require("discord.js");
const client = new Discord.Client();
const config = new require("./config.json");
const prefix = config.prefix;
const fs = require("fs");

// Basic Log Hosting
const express = require("express");
const app = express();

let mainGuild;
let feedbackChannel;
let debugmode = false;

let feedbackEmbed = new Discord.MessageEmbed()
    .setColor("PURPLE")
    .setTitle("New Anonymous Feedback");

function startup(client) {
  mainGuild = client.guilds.cache.get(config.guildid);
  feedbackChannel = mainGuild.channels.cache.get(config.feedbackchannel);
  if (process.argv[2] === "debug") {
    console.log("Debug Mode Enabled");
    debugmode = true;
  }
}

function debugLog(msg, text) {
    if (debugmode) {
        console.log(text);
    }
}

client.on("ready", () => {
  console.log(`Logged in as ${client.user.tag}!`);
  client.user
  .setActivity(`DM ${prefix}NewFeedback`, { type: "PLAYING" })
  .then(presence =>
    console.log(
        `Activity set to ${presence.activities[0].type ? presence.activities[0].name : "none"}`
    )
  )
  .catch(console.error);
  startup(client);
});

client.on("message", (msg) => {
  const args = msg.content.slice(prefix.length).trim().split(/ +/g);
  const command = args.shift().toLowerCase();

  if (command === "eval") {
    if (!debugmode && msg.author.id !== config.ownerid) return;
    try {
      const code = args.join(" ");
      let evaled = eval(code);

      if (typeof evaled !== "string") evaled = require("util").inspect(evaled);

      msg.channel.send(clean(evaled), { code: "xl" });
    } catch (err) {
      msg.channel.send(`\`ERROR\` \`\`\`xl\n${clean(err)}\n\`\`\``);
    }
  }

  // if the author is a bot or if the message is not in a dm exit
  if (msg.author.bot) return;
  if (msg.channel.type !== "dm") return;

  // starts feedback process
  if (command === "newfeedback") {
    askFeedback(msg);
  }

  // Admin only Commands
//   if (msg.author.id !== config.adminid || msg.author.id !== config.ownerid)
//     return;

  // Owner only Commands
});

function clean(text) {
  if (typeof text === "string")
    return text
      .replace(/`/g, "`" + String.fromCharCode(8203))
      .replace(/@/g, "@" + String.fromCharCode(8203));
  else return text;
}

async function askFeedback(msg) {
  let answer;

  // asks feedbackquestion and logs answer
  msg.channel.send(config.feedbackquestion);
  await msg.channel
    .awaitMessages((m) => msg.author.id == m.author.id, {
      max: 1,
      time: 120000,
      errors: ["time"],
    })
    .then((collected) => {
      answer = collected.first().content;
      msg.channel.send("Thank you for your feedback!");
      sendFeedback(msg, answer);
    })
    .catch((err) => {
      msg.channel.send("You did not answer the prompt in time, sorry.");
      console.log(err);
      return msg.channel.send(err);
    });
}

function sendFeedback(msg, answer) {

    feedbackEmbed
    .setDescription(answer)
    .setTimestamp()
    .setColor("PURPLE")

    feedbackChannel.send(feedbackEmbed)
    .catch((err) => {
      console.log(err);
      return
    })
    
    logFeedback(msg, answer)
}

function logFeedback(msg, answer){
    let logMessage = `${msg.author.tag} | ${msg.author.id}: ${answer} \n` 
    fs.appendFileSync("feedback.log", logMessage, function (err) {
        if (err) throw err;
    })
    return logMessage;
}

client.login(process.env.TOKEN);


app.get("/logs", (request, response) => {
  response.sendFile(__dirname + "/feedback.log");
});

const listener = app.listen(process.env.PORT, () => {
  console.log("Your app is listening on port " + listener.address().port);
});