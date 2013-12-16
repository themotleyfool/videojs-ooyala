/**
 * @fileoverview Ooyala Media Controller - Wrapper for Ooyala Media API
 * Ported from https://github.com/eXon/videojs-youtube/
 */

 var OoyalaState = {
  UNSTARTED: -1,
  ENDED: 0,
  PLAYING: 1,
  PAUSED: 2,
  BUFFERING: 3
};

/**
 * Ooyala Media Controller - Wrapper for YouTube Media API
 * @param {videojs.Player|Object} player
 * @param {Object=} options
 * @param {Function=} ready
 * @constructor
 */
videojs.Ooyala = videojs.MediaTechController.extend({
  /** @constructor */
  init: function(player, options, ready){
    videojs.MediaTechController.call(this, player, options, ready);

    this.player_ = player;
    this.player_el_ = document.getElementById(this.player_.id());
    this.player_el_.className += ' vjs-ooyala';

    var self = this;
    this.id_ = this.player_.id() + '_ooyala_api';

    this.el_ = videojs.Component.prototype.createEl('iframe', {
      id: this.id_,
      className: 'vjs-tech',
      scrolling: 'no',
      marginWidth: 0,
      marginHeight: 0,
      frameBorder: 0,
      webkitAllowFullScreen: 'true',
      mozallowfullscreen: 'true',
      allowFullScreen: 'true'
    });

    this.player_el_.insertBefore(this.el_, this.player_el_.firstChild);

    this.ooyala = undefined;
    this.ooyalaInfo = {};

    var self = this;
    this.el_.onload = function() { self.onLoad(); };

    this.contentId = player.options()['src'];
    this.playerId = player.options()['playerId'];
    this.isReady_ = false;

    if (videojs.Ooyala.apiReady) {
        this.loadApi();
    } else {
      // Add to the queue because the Ooyala API is not ready
      videojs.Ooyala.loadingQueue.push(this);

      // Load the Dailymotion API if it is the first Dailymotion video
      if (!videojs.Ooyala.apiLoading) {
        var tag = document.createElement('script');
        var src = '//player.ooyala.com/v3/' + this.playerId + '?platform=html5-priority';
        
        // If we are not on a server, don't specify the origin (it will crash)
        if (window.location.protocol == 'file:'){
          src = 'http:' + src;
        }

        tag.src = src;
        var firstScriptTag = document.getElementsByTagName('script')[0];
        firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
        videojs.Ooyala.apiLoading = true;
      }

      function waitForScript(test, callback) {
        var callbackTimer = setInterval(function() {
          var call = false;

          try {
            call = test.call();
          } catch (e) {}

          if (call) {
            clearInterval(callbackTimer);
            callback.call();
          }
        }, 100);
      }

      waitForScript(function() {
        return OO;
      }, function() {
        var oo;

        while ((oo = videojs.Ooyala.loadingQueue.shift())) {
            videojs.Ooyala.loadOoyala(oo);
        }

        videojs.Ooyala.loadingQueue = [];
        videojs.Ooyala.apiReady = true;
        this.onReady();
      }.bind(this));
    }
  }
});

videojs.Ooyala.prototype.dispose = function(){
  if (this.ooyala) {
    this.ooyala.destroy();
    delete this.ooyala;
  }

  videojs.MediaTechController.prototype.dispose.call(this);
};

videojs.Ooyala.prototype.src = function(src){
  if (this.ooyala) {
    this.ooyala.destroy();
    delete this.ooyala;
  }

  this.contentId = src;
  videojs.Ooyala.loadOoyala(this);
};

videojs.Ooyala.prototype.load = function(){};
videojs.Ooyala.prototype.play = function(){};
videojs.Ooyala.prototype.pause = function(){};
videojs.Ooyala.prototype.paused = function(){ return (this.ooyalaInfo.state == OoyalaState.PAUSED); };
videojs.Ooyala.prototype.currentTime = function(){ return this.ooyalaInfo.time; };
videojs.Ooyala.prototype.setCurrentTime = function(seconds){};
videojs.Ooyala.prototype.duration = function(){ return this.ooyalaInfo.duration; };
videojs.Ooyala.prototype.volume = function(){ return 0; };
videojs.Ooyala.prototype.setVolume = function(percentAsDecimal){};
videojs.Ooyala.prototype.muted = function(){};
videojs.Ooyala.prototype.setMuted = function(muted){};
videojs.Ooyala.prototype.buffered = function(){ return videojs.createTimeRange(0, this.ooyalaInfo.buffered || 0); };
videojs.Ooyala.prototype.supportsFullScreen = function(){ return true; };

// Ooyala is supported on all platforms
videojs.Ooyala.isSupported = function(){ return true; };

// You can use video/ooyala as a media in your HTML5 video to specify the source
videojs.Ooyala.canPlaySource = function(srcObj){
  return (srcObj.type == 'video/ooyala');
};

// All videos created before Ooyala API is loaded
videojs.Ooyala.loadingQueue = [];

// Always can control the volume
videojs.Ooyala.canControlVolume = function(){ return true; };

////////////////////////////// Ooyala specific functions //////////////////////////////

videojs.Ooyala.loadOoyala = function(player){
  var domId = player.player_el_.id;
  var contentId = player.contentId;
  var playerId = player.playerId;
  var messageBus = 'vjs-ooyala-' + domId + '-' + player.playerId + '-' + contentId;

  if (!contentId) {
    return;
  }

  OO.ready(function() {
    var ooPlayer = OO.Player.create(domId, contentId, {
      onCreate: function(ooPlayer) {
        ooPlayer.subscribe('*', messageBus, function(eventName) {
          // Player embedded parameters go here
        });

        ooPlayer.subscribe('error', messageBus, function(eventName, payload) {
          // console.error(eventName + ": " + payload);
          player.onError(eventName + ": " + payload)
        });

        ooPlayer.subscribe('playheadTimeChanged', messageBus, function() {
          if (player.ooyalaInfo.duration) {
            var buffered = (ooPlayer.getBufferLength() / player.ooyalaInfo.duration);

            if (buffered > 1) {
              player.ooyalaInfo.buffered = 1;
            } else {
              player.ooyalaInfo.buffered = buffered;
            }
          }

          var playheadTime = ooPlayer.getPlayheadTime();
          player.onPlayProgress(playheadTime);
        });

        // ooPlayer.subscribe('bitrateInfoAvailable', 'vjs-ooyala', function(eventName) {
        //   var rates = ooPlayer.getBitratesAvailable();
        //   if (rates.length > 0) {
        //     for (var i=0; i < rates.length; i++) {
        //       console.log("Rate: " + rates[i]);
        //     }
        //   }
        // });

        ooPlayer.subscribe('playbackReady', messageBus, function() {
          // console.log("Title is: " + ooPlayer.getTitle());
          // console.log("Description is: " + ooPlayer.getDescription());

          player.ooyala = ooPlayer;
          
          player.ooyalaInfo = {
            state: OoyalaState.UNSTARTED,
            volume: 1,
            muted: false,
            muteVolume: 1,
            time: 0,
            duration: (ooPlayer.getDuration() / 1000),
            buffered: 0,
            error: null
          };

          player.onReady();
        });

        ooPlayer.subscribe('paused', messageBus, function() {
          player.onPause();
        });

        ooPlayer.subscribe('play', messageBus, function() {
          player.onPlay();
        });

        ooPlayer.subscribe('seekStream', messageBus, function() {
          var playheadTime = ooPlayer.getPlayheadTime();
          player.onSeek(playheadTime);
        });

        ooPlayer.subscribe('played', messageBus, function() {
          player.onEnded();
        });
      },
      autoplay: player.player_.options()['autoplay'] || false,
      wmode: 'opaque',
    });
  });
}

videojs.Ooyala.prototype.onReady = function(){
  this.isReady_ = true;
  this.triggerReady();
};

videojs.Ooyala.prototype.onError = function(error){
  this.player_.error = error;
  this.player_.trigger('error');
};

videojs.Ooyala.prototype.onPause = function(){
  this.ooyalaInfo.state = OoyalaState.PAUSED;
  this.player_.trigger('pause');
};

videojs.Ooyala.prototype.onPlay = function(){
  this.ooyalaInfo.state = OoyalaState.PLAYING;
  this.player_.trigger('play');
};

videojs.Ooyala.prototype.onPlayProgress = function(seconds){
  this.ooyalaInfo.time = seconds;
  this.player_.trigger('timeupdate');
};

videojs.Ooyala.prototype.onEnded = function(){
  this.ooyalaInfo.state = OoyalaState.ENDED;
  this.player_.trigger('ended');
};

videojs.Ooyala.prototype.onSeek = function(seconds){
  this.ooyalaInfo.time = seconds;
  this.player_.trigger('timeupdate');
  this.player_.trigger('seeked');
};
