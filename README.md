# Video.js - Ooyala Source Support
Allows you to use an Ooyala video within [Video.js](https://github.com/videojs/video.js/).

## How does it work?
Include the script vjs.ooyala.js will add Ooyala as a tech. You just have to add it to your techOrder option. Then, you add the option src with your Ooyala player and content ids.

```html
<!DOCTYPE html>
<html>
  <head>
    <link href="video-js.min.css" rel="stylesheet" />
  </head>
  
  <body>
    <video id="video" class="video-js vjs-default-skin" controls autoplay preload="auto" width="640" height="360">
    </video>
    
    <script src="video.min.js"></script>
    <script src="vjs.ooyala.js"></script>
    <script>
      videojs('video', { "techOrder": ["ooyala"], "playerId": 'e18ab1da1813483499554ea2d8e67fbd', "contentId": "w3ZHc0Njr33Tdp-RRcwfZMjaOrmzOP82", "type": "video/ooyala"});
    </script>
  </body>
</html>
```

## To minify
1. npm install uglify-js -g
1. uglifyjs src/media.ooyala.js -o vjs.ooyala.js

## Special Thank You
Ported directly from the [YouTube player](https://github.com/eXon/videojs-youtube/blob/master/src/media.youtube.js).
