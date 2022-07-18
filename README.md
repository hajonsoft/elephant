# Getting started

brew install ffmpeg
pnpm i


Demo login with alialiayman@gmail.com

[Search Ahmed Subhi Mansour](www.algolia.com/interface-demos/ca4f4aab-d3a1-4c61-a74d-c1716724795b)

![image](https://user-images.githubusercontent.com/9623964/144528747-b3f2e257-c24b-47a6-a8c4-1782e739976d.png)


# Commands

```
node . links channel=CHANNELID gkey=APIKEY
_get all video links for a given channel_

node . links channel=UC4rHVwTcnphaetXGQu47nxg gkey=AIzaSyAk0R8OXbsQpnl8ARgzoOres4--6KeAbAo


node . audio
_will process audio for the same channel_

node . text wkey="JEdz0OitMVYsY79hSyUEpcHOCuaLo11i9o3"
_will transcribe one video_

node . db akey="e4dcaa7f084a6d533ed69aaafe890d82"
_will save to algolia_

node . clean
_will clean audio, text and db folders and remove orphans or erronious transcription or db writes_

```

# Google API KEY
You must have a [GOOGLE_API_KEY](https://developers.google.com/maps/documentation/maps-static/get-api-key).

Create credentials and enable youetube key
I created a map key first and then got an error then had to enable youtube

https://console.cloud.google.com/google/maps-apis/credentials?project=jawad-333216

here is youtube
https://console.cloud.google.com/apis/api/youtube.googleapis.com/overview?project=jawad-333216

## Watson

Signup for a new [IBM Cloud](https://www.ibm.com/cloud) account and enter credit card info . First account created used hajonsoft@gmail.com federated. 

Search "speech to text" service and then create one. select closest location, and free plan. Agree to terms and conditions and click create

click manage and copy API Key and URL, then issue this command with these copied values

```

node . text wkey=COPIED_API_KEY wurl=COPIED_URL

```

You only have to provide those parameters once, subsequent runs can just be 

```
node . text
```


Track usage from here 
![image](https://user-images.githubusercontent.com/9623964/144541201-001c0eeb-ab29-4fea-a372-7cb59a217a74.png)

login to the cloud above and search for "speech to text" then click plan.
## Algolia

I registered using alialiayman@gmail.com, login using federated login
## color console

To color console.log messages 

`console.log('\x1b[7m', "message","\x1b[0m");`

If you use ansi color your must reset using "\x1b[0m"
Here is the reference for [ansi colors](https://telepathy.freedesktop.org/doc/telepathy-glib/telepathy-glib-debug-ansi.html#TP-ANSI-RESET:CAPS) 


How to transcribe using IBM Watson
https://alexzywiak.github.io/getting-a-written-transcript-for-a-youtube-video-using-ibm-watson-2/index.html

## Scheduling

```
launchctl list | grep hudhud


launchctl unload /Library/LaunchAgents/com.hudhud-audio.daemon.plist
launchctl unload /Library/LaunchAgents/com.hudhud-text.daemon.plist
launchctl unload /Library/LaunchAgents/com.hudhud-db.daemon.plist

sudo vi /Library/LaunchAgents/com.hudhud-audio.daemon.plist
sudo vi /Library/LaunchAgents/com.hudhud-text.daemon.plist
sudo vi /Library/LaunchAgents/com.hudhud-db.daemon.plist


launchctl load /Library/LaunchAgents/com.hudhud-audio.daemon.plist
launchctl load /Library/LaunchAgents/com.hudhud-text.daemon.plist
launchctl load /Library/LaunchAgents/com.hudhud-db.daemon.plist

```

[Read article](https://betterprogramming.pub/schedule-node-js-scripts-on-your-mac-with-launchd-a7fca82fbf02)


first time

```
sudo cp com.hudhud-audio.daemon.plist /Library/LaunchAgents/com.hudhud-audio.daemon.plist
sudo cp com.hudhud-text.daemon.plist /Library/LaunchAgents/com.hudhud-text.daemon.plist
sudo cp com.hudhud-db.daemon.plist /Library/LaunchAgents/com.hudhud-db.daemon.plist

sudo cp /Library/LaunchAgents/com.hudhud-audio.daemon.plist com.hudhud-audio.daemon.plist 
sudo cp /Library/LaunchAgents/com.hudhud-text.daemon.plist com.hudhud-text.daemon.plist 
sudo cp /Library/LaunchAgents/com.hudhud-db.daemon.plist com.hudhud-db.daemon.plist 


```

## Ubuntu

To prepare an ubunto machine

```
sudo apt-get update
sudo curl -L https://yt-dl.org/downloads/latest/youtube-dl -o /usr/local/bin/youtube-dl
sudo chmod a+rx /usr/local/bin/youtube-dl
sudo apt install python3-pip
pip3 install --upgrade youtube-dl
sudo apt-get install python-is-python3

cp ./export/*.* .
node . audio > /dev/null 2>&1 & node . text > /dev/null 2>&1 &
jobs -l

``


https://write.corbpie.com/how-to-install-upgrade-youtube-dl-on-ubuntu-20-04/

https://askubuntu.com/questions/942930/usr-bin-env-python-no-such-file-or-directory


## Resources

Download english subtitles  https://www.diycaptions.com/
Transcribe arabic https://anthiago.com/transcript/
Inquirer https://www.digitalocean.com/community/tutorials/nodejs-interactive-command-line-prompts


Search example
https://www.algolia.com/doc/guides/building-search-ui/getting-started/react/


